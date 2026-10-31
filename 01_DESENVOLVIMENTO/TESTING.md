# Testes automatizados

Instale a dependência e execute os testes de fumaça:

```powershell
pnpm install
pnpm test
```

No Windows, os testes usam o Microsoft Edge instalado. Em outros sistemas, instale
o Chromium do Playwright uma vez com `pnpm exec playwright install chromium`.

Os testes iniciam um servidor local e simulam as respostas do Supabase. Eles
verificam os fluxos da interface e do armazenamento local; não substituem a
validação das políticas RLS no projeto Supabase real.
