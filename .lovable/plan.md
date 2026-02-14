

# Preparar o Hub para Receber os Clones dos Repositorios

## Contexto
Os repositorios UNBSCOLOR e UNBSGRID sao apps Vite/React independentes. Precisamos criar uma estrutura de pastas modular onde cada app clonado tenha seu proprio espaco, com seus componentes, hooks, utils, e paginas -- tudo integrado ao roteamento e layout do hub.

## Estrutura de Pastas Proposta

```text
src/
  tools/
    unbscolor/
      components/       <-- componentes do app clonado
      hooks/            <-- hooks do app clonado
      lib/              <-- utils do app clonado
      pages/            <-- paginas internas do app (se houver)
      index.tsx         <-- entry point / componente raiz do app
      README.md         <-- instrucoes de como clonar e integrar
    unbsgrid/
      components/
      hooks/
      lib/
      pages/
      index.tsx
      README.md
```

## Mudancas

### 1. Criar a pasta `src/tools/` com subpastas para cada ferramenta
- `src/tools/unbscolor/` com `index.tsx` placeholder e `README.md`
- `src/tools/unbsgrid/` com `index.tsx` placeholder e `README.md`
- Cada `index.tsx` exporta o componente raiz da ferramenta
- Cada `README.md` documenta como clonar o repo para dentro da pasta

### 2. Atualizar as paginas `UnbsColor.tsx` e `UnbsGrid.tsx`
- Importar o componente raiz de `@/tools/unbscolor` e `@/tools/unbsgrid`
- Manter o `ToolLayout` como wrapper (header + back button)
- As paginas passam a ser "conectores" entre o hub e o app clonado

### 3. Atualizar rotas para subrotas (wildcard)
- Mudar `/unbscolor` para `/unbscolor/*` e `/unbsgrid/*` no App.tsx
- Isso permite que cada app clonado tenha navegacao interna propria (ex: `/unbscolor/palettes`, `/unbscolor/settings`)

### 4. Criar arquivo de contexto compartilhado (`src/tools/shared.ts`)
- Exportar recursos compartilhados que os apps clonados podem usar:
  - Cliente do banco de dados (`supabase`)
  - Hook de autenticacao (quando implementado)
  - Componentes UI compartilhados do hub
- Isso evita duplicacao e permite que os apps acessem a infra do hub

---

## Secao Tecnica

### `src/tools/unbscolor/index.tsx` (placeholder)
```tsx
const UnbsColorApp = () => {
  return (
    <div>
      <p>UNBSCOLOR app carregado. Substitua este arquivo pelo conteudo do repositorio clonado.</p>
    </div>
  );
};
export default UnbsColorApp;
```

### `src/pages/UnbsColor.tsx` (conector)
```tsx
import ToolLayout from "@/components/ToolLayout";
import UnbsColorApp from "@/tools/unbscolor";

const UnbsColor = () => (
  <ToolLayout title="UNBSCOLOR">
    <UnbsColorApp />
  </ToolLayout>
);
```

### `src/App.tsx` (rotas wildcard)
```tsx
<Route path="/unbscolor/*" element={<UnbsColor />} />
<Route path="/unbsgrid/*" element={<UnbsGrid />} />
```

### `src/tools/shared.ts`
```tsx
export { supabase } from "@/integrations/supabase/client";
// export { useAuth } from "@/hooks/useAuth"; // quando disponivel
```

### `src/tools/unbscolor/README.md`
Documentacao com instrucoes:
1. Clone o repo UNBSCOLOR
2. Copie o conteudo de `src/` para `src/tools/unbscolor/`
3. Renomeie o entry point para `index.tsx`
4. Ajuste imports relativos e remova duplicatas (router, supabase client)
5. Use `@/tools/shared` para acessar recursos do hub

