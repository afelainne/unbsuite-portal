# UNBSGRID — Integração com o Hub

## Como clonar e integrar

1. Clone o repositório UNBSGRID
2. Copie o conteúdo de `src/` para `src/tools/unbsgrid/`
3. Renomeie o entry point principal para `index.tsx` (deve exportar default o componente raiz)
4. Ajuste imports relativos (ex: `./components/X` → `./components/X`)
5. Remova duplicatas do hub: **não** inclua `BrowserRouter`, `QueryClientProvider`, ou cliente Supabase
6. Use `import { supabase } from "@/tools/shared"` para acessar o banco de dados do hub
7. Se o app tiver rotas internas, use `useNavigate` e paths relativos — o hub já monta em `/unbsgrid/*`

## Estrutura esperada

```
src/tools/unbsgrid/
  index.tsx          ← componente raiz (export default)
  components/        ← componentes do app
  hooks/             ← hooks do app
  lib/               ← utils do app
  pages/             ← páginas internas (se houver)
```
