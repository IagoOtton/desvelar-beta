# Publicar o beta para os amigos

## O que a publicação entrega

O workflow monta um site estático em `dist-beta/` com o app corrigido renomeado para `index.html`, mais as pastas `css/` e `js/`. Os HTMLs antigos, SQL e testes não entram no site publicado.

O projeto local ainda não tem um repositório remoto configurado. No GitHub Free, o repositório usado pelo GitHub Pages precisa ser público; isso também deixa o código-fonte do repositório visível, inclusive os HTMLs antigos e outros arquivos versionados. Esses arquivos antigos não entram no site publicado. O link do app ficará aberto para quem o receber. Se preferir manter o código-fonte privado, escolha uma hospedagem que aceite sua configuração de repositório privado antes de publicar.

## 1. Criar a tabela de feedback no Supabase

1. Abra o projeto DESVELAR no Supabase.
2. Entre em **SQL Editor** e crie uma nova consulta.
3. Copie e execute todo o conteúdo de [`create_app_feedback.sql`](../01_DESENVOLVIMENTO/supabase/create_app_feedback.sql).
4. Confirme que a tabela `public.app_feedback` aparece no Table Editor.

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

## 2. Habilitar a sincronização do progresso

1. No **SQL Editor** do mesmo projeto, crie outra consulta.
2. Copie e execute todo o conteúdo de [`create_app_user_data.sql`](../01_DESENVOLVIMENTO/supabase/create_app_user_data.sql).
3. Confirme que `public.app_user_data` aparece no Table Editor e que a função `public.save_my_app_data(jsonb, bigint)` aparece em Database → Functions.

Essa tabela guarda o progresso pessoal em um único registro por conta. A RLS limita a leitura ao próprio usuário; a gravação ocorre por uma função que valida a conta autenticada e a revisão dos dados para evitar sobrescritas entre dispositivos.

## 3. Ativar a Comunidade de leitores

1. No **SQL Editor** do Supabase, crie uma consulta e execute todo o conteúdo de [`reader_community_schema.sql`](../01_DESENVOLVIMENTO/supabase/reader_community_schema.sql).
2. Confirme que as tabelas `reader_profiles`, `community_posts` e `reader_groups` aparecem no Table Editor. As demais tabelas `reader_*` e `community_*` guardam comentários, reações, denúncias, ciclos mensais, indicações e progresso.
3. No app, cada pessoa cria um perfil com nome de exibição antes de publicar. Publicações e perfis escolhidos ficam disponíveis às contas autenticadas; os ciclos e o progresso ficam restritos às pessoas dos respectivos grupos. E-mails e dados da biblioteca pessoal não são publicados pela Comunidade.
4. Para começar um grupo, uma pessoa cria o grupo e compartilha o código de convite com os demais. O responsável abre um ciclo mensal, ou escolhe o livro diretamente; se abrir indicações, os membros podem sugerir títulos e o responsável faz um único sorteio.

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

## 4. Habilitar confirmação de e-mail para amigos

O SMTP padrão do Supabase só envia para endereços da equipe do projeto e tem limite baixo. Configure um provedor SMTP na área **Authentication → Emails → SMTP Settings** do Supabase. As credenciais devem ser inseridas diretamente no painel do provedor/Supabase; não as coloque no código ou no GitHub. Mantenha a confirmação de e-mail ativada.

## 5. Configurar o retorno depois da confirmação

Depois de criar o repositório e obter o endereço GitHub Pages, abra **Authentication → URL Configuration** no Supabase:

- Defina **Site URL** para o endereço final do site, com a barra no final, por exemplo `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
- Inclua esse mesmo endereço na lista de **Redirect URLs**.

O app usa a URL atual da página como destino de confirmação. Por isso, atualize essas configurações se o endereço do Pages mudar.

## 6. Publicar ou atualizar o beta

O repositório [`IagoOtton/desvelar-beta`](https://github.com/IagoOtton/desvelar-beta) e o GitHub Pages já estão configurados. Abra uma pull request para `main`: o workflow **Publicar beta no GitHub Pages** executa os testes e monta o site. A publicação acontece depois que a alteração chega à `main`; pull requests não fazem deploy.

Para atualizar o beta, altere os arquivos-fonte em `01_DESENVOLVIMENTO/`, abra uma pull request e confira se os trabalhos `test` e `build` passaram antes de integrar à `main`. Depois acompanhe o trabalho `deploy` em **Actions**. O link atual continua o mesmo: <https://iagootton.github.io/desvelar-beta/>. Não adicione arquivos de dados pessoais, credenciais ou cópias de dados ao repositório.

Se estiver configurando uma cópia local nova, use o repositório existente em vez de criar outro. No GitHub Free, o repositório precisa ser público para essa configuração do Pages; os arquivos-fonte e documentos versionados ficam visíveis no GitHub, mas somente o app corrigido e as pastas `css/` e `js/` são colocados no site.

## 7. O que pedir no feedback

Peça que testem uma tarefa real e descrevam: o que tentaram fazer, o que aconteceu e o que esperavam. O feedback enviado em **Sistema → Enviar feedback** fica associado à conta. Os dados pessoais de estudo, rotina, hábitos, metas e finanças também ficam no Supabase e sincronizam ao entrar com a mesma conta em outro dispositivo. O navegador conserva uma cópia local para uso sem conexão; confira em **Sistema** se as alterações foram sincronizadas. A exportação/importação manual foi removida; alterações que ainda não aparecem como sincronizadas permanecem apenas no navegador atual.

Oriente todos a usar o endereço publicado e entrar na própria conta. O site não lê automaticamente o armazenamento isolado de uma cópia aberta por `file://`.

## Referências

- [Supabase: configurar SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [GitHub: criar um site do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
