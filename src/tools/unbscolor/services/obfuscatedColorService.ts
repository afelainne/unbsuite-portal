// Dispara tráfego fake controlado para ofuscar consultas reais sem gerar 429/aborted.
// Mantém baixo volume e usa apenas endpoints neutros/descartáveis.

type Endpoint = {
  url: string;
  risky?: boolean; // usa apenas às vezes para não tomar bloqueio
  buildUrl?: (q: string) => string;
  method?: 'GET' | 'HEAD' | 'POST';
  body?: string;
};

const ACCEPTS = [
  '*/*',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
];

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.8',
  'pt-BR,pt;q=0.8,en;q=0.6',
  'es-ES,es;q=0.8,en;q=0.6'
];

const ENDPOINTS: Endpoint[] = [
  {
    url: 'https://httpbin.org/status/204', // neutro, não retorna payload útil
    method: 'HEAD'
  },
  {
    url: 'https://httpbingo.org/status/204',
    method: 'HEAD'
  },
  {
    url: 'https://httpbin.org/anything', // ecoa mas ignoramos a resposta
    buildUrl: (q) => `https://httpbin.org/anything?color=${encodeURIComponent(q)}`,
    method: 'POST',
    body: '{}'
  },
  {
    url: 'https://httpbingo.org/anything',
    buildUrl: (q) => `https://httpbingo.org/anything?swatch=${encodeURIComponent(q)}`,
    method: 'POST',
    body: '{}'
  },
  // endpoints de terceiros removidos para evitar bloqueio; usamos apenas neutros/descartáveis
];

const hasFetch = typeof fetch !== 'undefined';
const WINDOW_MS = 60_000; // janela de 60s
const MAX_CALLS_PER_WINDOW = 4; // teto por janela para reduzir bursts
const MIN_DELAY_MS = 400; // espaçamento mínimo entre disparos
const JITTER_MS = 600; // jitter extra para espaçar ainda mais
const RISKY_COOLDOWN_MS = 5 * 60_000; // se der erro, pausa 5min

let windowStart = 0;
let windowCount = 0;
let lastDispatch = 0;
const cooldowns: Record<string, number> = {};

function shouldRateLimit() {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
    return false;
  }
  return windowCount >= MAX_CALLS_PER_WINDOW;
}

function selectEndpoints(): Endpoint[] {
  const shuffled = [...ENDPOINTS].sort(() => Math.random() - 0.5);
  const take = 1 + Math.floor(Math.random() * 2); // 1-2 endpoints por chamada
  return shuffled.slice(0, take);
}

function buildUrl(endpoint: Endpoint, q: string) {
  if (endpoint.buildUrl) return endpoint.buildUrl(q);
  const url = new URL(endpoint.url);
  url.searchParams.set('q', q);
  return url.toString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function buildHeaders(): Record<string, string> {
  return {
    Accept: pick(ACCEPTS),
    'Accept-Language': pick(ACCEPT_LANGUAGES)
  };
}

function dispatchFakeSearches(query: string) {
  if (!hasFetch || !query) return;
  if (shouldRateLimit()) return;

  const now = Date.now();
  if (now - lastDispatch < MIN_DELAY_MS) return;

  const endpoints = selectEndpoints();
  endpoints.forEach((endpoint, idx) => {
    const target = buildUrl(endpoint, query);
    if (cooldowns[target] && Date.now() < cooldowns[target]) return; // pular se em cooldown

    const delay = idx * MIN_DELAY_MS + Math.floor(Math.random() * JITTER_MS) + MIN_DELAY_MS;

    setTimeout(() => {
      windowCount += 1;
      lastDispatch = Date.now();
      fetch(target, {
        method: endpoint.method || 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        keepalive: true,
        headers: buildHeaders(),
        body: endpoint.body
      }).catch(() => {
        // se falhar, coloque em cooldown para não insistir
        cooldowns[target] = Date.now() + RISKY_COOLDOWN_MS;
      });
    }, delay);
  });
}

function generateNoiseQueries(base: string): string[] {
  const noise = [
    `${base} color`,
    `hex ${base}`,
    `${base} rgb`,
    `color code ${base}`,
    base.slice(0, Math.max(1, base.length - 1))
  ];
  return noise.sort(() => Math.random() - 0.5).slice(0, 2);
}

export function triggerFakeColorTraffic(query: string) {
  if (!query) return;
  // Sempre dispara pelo menos uma consulta real
  dispatchFakeSearches(query);
  // Acrescenta ruído complementar (até 2) respeitando o rate limit
  generateNoiseQueries(query).forEach(dispatchFakeSearches);
}
