@AGENTS.md

<!--
As instruções do projeto vivem em AGENTS.md, que é o formato lido por trinta e
poucas ferramentas de agente. O Claude Code lê CLAUDE.md, e a linha acima
importa o arquivo no começo da sessão, então existe uma fonte só.

Abaixo vai apenas o que é específico do Claude Code.
-->

## Específico do Claude Code

- A referência visual do design system abre com `npm run design-system`, nunca pelo servidor do app: o Vite reescreve os arquivos `.jsx` das telas antes de o navegador recebê-los.
- Ao mexer numa ferramenta, rode os testes só dela enquanto trabalha (`npx vitest run src/tools/unbsgrid`) e a suíte inteira antes de entregar.
- O servidor de desenvolvimento costuma já estar rodando na porta 8080. Verifique antes de subir outro.
