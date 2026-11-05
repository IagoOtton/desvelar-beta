# Publicar o beta para os amigos

## O que a publicação entrega

O repositório [`IagoOtton/desvelar-beta`](https://github.com/IagoOtton/desvelar-beta) e o GitHub Pages já estão configurados. O workflow publica `main` no endereço <https://iagootton.github.io/desvelar-beta/> depois da integração de uma pull request. Ele monta `dist-beta/` com o app em `index.html`, as páginas públicas, os assets compilados e o service worker. HTMLs antigos, arquivos SQL de origem e testes não entram no site publicado.

O repositório é público, então o código-fonte e a documentação versionados também ficam visíveis no GitHub. O conteúdo pessoal dos usuários fica no Supabase e no armazenamento local de cada navegador; não coloque dados de usuários, credenciais ou chaves secretas no repositório. A chave pública do Supabase usada pelo cliente pode aparecer no código, desde que o banco continue protegido por RLS e as funções privilegiadas validem a identidade e a autorização.

> **Atenção ao banco existente:** as etapas 1 a 3 abaixo descrevem scripts de instalação inicial. Não os execute novamente no projeto DESVELAR em produção. O histórico versionado de `supabase/migrations/` ainda não contém uma migração-base reproduzível do esquema instalado originalmente por SQL Editor. Até essa base ser reconciliada e validada em um banco descartável, não use `supabase db reset` nem recrie o banco de produção a partir somente da pasta de migrations.

## Scripts históricos do banco (não executar no projeto existente)

Os arquivos SQL a seguir documentam etapas usadas na instalação inicial do projeto. Eles não são o fluxo de atualização do banco atual e não substituem uma migração-base reproduzível. No Supabase de produção, faça mudanças de esquema por novas migrações aditivas, revise o SQL e aplique-as somente depois de validar o impacto.

### 1. Tabela de feedback

`public.app_feedback` já existe no projeto em produção. [`create_app_feedback.sql`](../01_DESENVOLVIMENTO/supabase/create_app_feedback.sql) é um script histórico; não o execute novamente nesse projeto. Para consultar feedbacks, o painel usa uma função administrativa e a leitura segue restrita.

O acesso de leitura não é concedido ao app. Para revisar os envios, use o SQL Editor do Supabase:

```sql
select
  f.created_at,
  u.email,
  f.category,
  f.message
from public.app_feedback as f
join auth.users as u on u.id = f.user_id
order by f.created_at desc;
```

### 2. Sincronização do progresso pessoal

`public.app_user_data` e a função `public.save_my_app_data(jsonb, bigint)` já fazem parte do projeto em produção. [`create_app_user_data.sql`](../01_DESENVOLVIMENTO/supabase/create_app_user_data.sql) registra a instalação inicial; não o execute novamente.

Essa tabela guarda o progresso pessoal em um único registro por conta. A RLS limita a leitura ao próprio usuário; a gravação ocorre por uma função que valida a conta autenticada e a revisão dos dados para evitar sobrescritas entre dispositivos.

### 3. Comunidade de leitores

O esquema da comunidade já está ativo. [`reader_community_schema.sql`](../01_DESENVOLVIMENTO/supabase/reader_community_schema.sql) documenta parte da instalação inicial e não deve ser reaplicado no projeto atual. Publicações e perfis escolhidos ficam disponíveis às contas autenticadas; ciclos e progresso ficam restritos às pessoas dos respectivos grupos. E-mails e dados da biblioteca pessoal não são publicados pela Comunidade.

Para começar um grupo, uma pessoa cria o grupo e compartilha o código de convite. O responsável abre um ciclo mensal, ou escolhe o livro diretamente; se abrir indicações, os membros podem sugerir títulos e o responsável faz um único sorteio.

As denúncias são gravadas no Supabase, mas ainda não há uma tela de moderação. Para revisá-las, use o SQL Editor do Supabase:

```sql
select
  r.created_at,
  r.reason,
  r.details,
  reporter.display_name as reporter,
  author.display_name as author,
  p.body
from public.community_post_reports as r
join public.community_posts as p on p.id = r.post_id
left join public.reader_profiles as reporter on reporter.user_id = r.reporter_id
left join public.reader_profiles as author on author.user_id = p.author_id
order by r.created_at desc;
```

## Configuração de autenticação e publicação

### Confirmação de e-mail

O provedor SMTP já foi configurado para o beta. Se trocar de provedor, faça a alteração em **Authentication → Emails → SMTP Settings**. Insira as credenciais diretamente nos painéis do provedor e do Supabase; não as coloque no código ou no GitHub. Mantenha a confirmação de e-mail ativada.

### URLs de autenticação

As URLs do GitHub Pages já estão configuradas no projeto. Se alterar o domínio ou o caminho, atualize **Authentication → URL Configuration** no Supabase:

- Defina **Site URL** para o endereço final do site, com a barra no final, por exemplo `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
- Inclua esse mesmo endereço na lista de **Redirect URLs**.

O app usa a URL atual da página como destino de confirmação. Por isso, atualize essas configurações se o endereço do Pages mudar.

### Publicar ou atualizar o beta

O repositório [`IagoOtton/desvelar-beta`](https://github.com/IagoOtton/desvelar-beta) e o GitHub Pages já estão configurados. Abra uma pull request para `main`: o workflow **Publicar beta no GitHub Pages** executa os testes e monta o site. A publicação acontece depois que a alteração chega à `main`; pull requests não fazem deploy.

Para atualizar o beta, altere os arquivos-fonte em `01_DESENVOLVIMENTO/`, abra uma pull request e confira se os trabalhos `test` e `build` passaram antes de integrar à `main`. Depois acompanhe o trabalho `deploy` em **Actions**. O link atual continua o mesmo: <https://iagootton.github.io/desvelar-beta/>. Não adicione arquivos de dados pessoais, credenciais ou cópias de dados ao repositório.

Uma cópia local nova deve usar o repositório existente. O repositório é público; somente o conteúdo construído em `dist-beta/` é publicado no site.

## Como pedir feedback

Peça que testem uma tarefa real e descrevam: o que tentaram fazer, o que aconteceu e o que esperavam. O feedback enviado em **Sistema → Enviar feedback** fica associado à conta. Os dados pessoais de estudo, rotina, hábitos, metas e finanças também ficam no Supabase e sincronizam ao entrar com a mesma conta em outro dispositivo. O navegador conserva uma cópia local para uso sem conexão; confira em **Sistema** se as alterações foram sincronizadas. A exportação/importação manual foi removida; alterações que ainda não aparecem como sincronizadas permanecem apenas no navegador atual.

Oriente todos a usar o endereço publicado e entrar na própria conta. O site não lê automaticamente o armazenamento isolado de uma cópia aberta por `file://`.

## Referências

- [Supabase: configurar SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [GitHub: criar um site do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
