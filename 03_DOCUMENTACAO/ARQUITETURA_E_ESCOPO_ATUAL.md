# Arquitetura e escopo atual do DESVELAR

## Produto

O DESVELAR é uma ferramenta pessoal para ajudar a criar constância nos estudos. Nesta etapa, a interface oferece Estudos, Conta e um painel privado de métricas para administração.

## Telas ativas

As rotas do app ficam em `01_DESENVOLVIMENTO/js/views/registry.js`:

- `estudo`: registro de sessões e visão semanal;
- `foco`: Pomodoro;
- `temas`: temas estudados e revisões espaçadas;
- `erros`: caderno de erros;
- `desempenho`: questões e evolução;
- `sistema`: perfil, sincronização, privacidade, consentimento de métricas e saída;
- `painel_controle`: métricas agregadas, liberadas somente após a autorização administrativa.

Os cinco primeiros caminhos são ferramentas internas de Estudos. A navegação lateral mostra Estudos e Conta; no celular, as ferramentas internas permanecem dentro de Estudos.

## Organização técnica

- `js/auth.js` cuida da autenticação, recuperação de senha e consentimentos da conta.
- `js/app.js` inicia o estado, sincronização, navegação, renderização e métricas de uso.
- `js/domain/` contém regras de domínio ainda usadas por Estudos e o modelo de dados.
- `js/components/study-insights.js` gera o mapa de conhecimento e o mapa de constância de Estudos.
- `js/views/` contém apenas as telas ativas de Estudos e Conta/painel.
- `js/controllers/` contém ações, formulários, conta e execução do Pomodoro.
- `js/repositories/` e `js/services/` mantêm leitura/gravação local, acesso ao Supabase e sincronização.
- `scripts/build-beta.mjs` gera arquivos estáticos minificados e com nomes versionados em `dist-beta/`.

## Preservação de dados legados

**Não remover nem simplificar** campos e coleções antigas de `js/domain/data-model.js`, nem mudar `local-data.js`, `cloud-data.js`, `cloud-sync.js` ou as migrações do Supabase sem um plano específico de migração e recuperação. A normalização e a sincronização ainda precisam reconhecer esses dados para que um salvamento feito em Estudos não os apague.

As ferramentas antigas não têm telas ou controladores ativos nesta branch. Isso não apaga registros locais ou remotos, não desativa tabelas e políticas do Supabase e não revoga acesso a APIs que já existam. A retirada de APIs e dados legados deve ser tratada separadamente, depois de uma decisão de produto e de uma estratégia de migração.

## Segurança e métricas

- Login, cadastro, redefinição de senha e aceite do aviso de privacidade continuam sob responsabilidade do fluxo de autenticação existente.
- O consentimento de métricas mantém o mecanismo atual e pode ser revogado em Conta.
- O painel verifica a autorização administrativa antes de expor os indicadores.
- Não colocar métricas de conteúdo privado de Estudos no painel; a coleta permitida continua agregada e consentida.

## Fluxo de alteração e publicação

1. Alterar o código-fonte em `01_DESENVOLVIMENTO/` na branch de trabalho.
2. Revisar as telas localmente e validar os fluxos de autenticação, sincronização e Estudos.
3. Gerar `dist-beta/` pelo script de build quando a versão estiver pronta para revisão/publicação.
4. Publicar por um PR aprovado. Esta branch local não modifica o deploy atual.
