# Arquitetura do DESVELAR

O escopo funcional atual e as regras de preservação de dados ficam em [ARQUITETURA_E_ESCOPO_ATUAL.md](../03_DOCUMENTACAO/ARQUITETURA_E_ESCOPO_ATUAL.md). Este arquivo registra como o código-fonte ativo se organiza.

## Aplicativo

- `desvelar-v1-corrigido.html` é a entrada local e carrega os módulos-fonte.
- `js/auth.js`, `js/supabase.js` e `js/entries/auth.js` mantêm login, cadastro, recuperação e consentimentos.
- `js/entries/app.js` compõe o aplicativo autenticado.
- `js/views/` contém as telas de Estudos, Conta e painel privado de métricas.
- `js/controllers/` processa ações de tela, formulários, conta e execução do Pomodoro.
- `js/domain/` guarda regras de estudo, cálculos, Pomodoro e normalização de dados.
- `js/repositories/` e `js/services/` mantêm armazenamento local, sincronização e métricas consentidas.
- `js/state/` centraliza o estado em memória e sua persistência.
- `css/style.css` contém os estilos compartilhados do aplicativo e das páginas públicas.

## Build e cache

`scripts/build-beta.mjs` agrupa e minifica três entradas: autenticação, aplicativo e CSS. O build gera arquivos com hash em `dist-beta/`, prepara o HTML para GitHub Pages e versiona o cache do `service-worker.js`. Essa pasta é artefato gerado e não deve ser editada como fonte.

## Dados e compatibilidade

O frontend sincroniza um snapshot por conta através de `app_user_data` e da função `save_my_app_data`. A cópia local permite manter alterações pendentes durante falhas de rede.

Não remova campos legados de `js/domain/data-model.js`, nem altere os repositórios de dados ou migrações do Supabase sem planejar uma migração e recuperação. A interface pode deixar de oferecer uma ferramenta sem excluir os dados já existentes.

## Fluxo de mudança

Edite os arquivos em `01_DESENVOLVIMENTO/`, revise a mudança na branch de trabalho e valide os fluxos de conta, sincronização e Estudos antes da publicação. As alterações passam por revisão no GitHub; o deploy é feito pelo fluxo configurado no repositório.
