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

## 3. Habilitar confirmação de e-mail para amigos

O SMTP padrão do Supabase só envia para endereços da equipe do projeto e tem limite baixo. Configure um provedor SMTP na área **Authentication → Emails → SMTP Settings** do Supabase. As credenciais devem ser inseridas diretamente no painel do provedor/Supabase; não as coloque no código ou no GitHub. Mantenha a confirmação de e-mail ativada.

## 4. Configurar o retorno depois da confirmação

Depois de criar o repositório e obter o endereço GitHub Pages, abra **Authentication → URL Configuration** no Supabase:

- Defina **Site URL** para o endereço final do site, com a barra no final, por exemplo `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
- Inclua esse mesmo endereço na lista de **Redirect URLs**.

O app usa a URL atual da página como destino de confirmação. Por isso, atualize essas configurações se o endereço do Pages mudar.

## 5. Publicar ou atualizar o beta

O repositório [`IagoOtton/desvelar-beta`](https://github.com/IagoOtton/desvelar-beta) e o GitHub Pages já estão configurados. As alterações em `01_DESENVOLVIMENTO/` são publicadas quando um commit chega à branch `main`; o workflow **Publicar beta no GitHub Pages** monta o site e o publica automaticamente.

Para atualizar o beta, altere os arquivos-fonte em `01_DESENVOLVIMENTO/`, envie as alterações revisadas para `main` e acompanhe a execução em **Actions**. O link atual continua o mesmo: <https://iagootton.github.io/desvelar-beta/>. Não adicione arquivos de dados pessoais, credenciais ou cópias de dados ao repositório.

Se estiver configurando uma cópia local nova, use o repositório existente em vez de criar outro. No GitHub Free, o repositório precisa ser público para essa configuração do Pages; os arquivos-fonte e documentos versionados ficam visíveis no GitHub, mas somente o app corrigido e as pastas `css/` e `js/` são colocados no site.

## 6. O que pedir no feedback

Peça que testem uma tarefa real e descrevam: o que tentaram fazer, o que aconteceu e o que esperavam. O feedback enviado em **Sistema → Enviar feedback** fica associado à conta. Os dados pessoais de estudo, rotina, hábitos, metas e finanças também ficam no Supabase e sincronizam ao entrar com a mesma conta em outro dispositivo. O navegador conserva uma cópia local para uso sem conexão; confira em **Sistema** se as alterações foram sincronizadas. A exportação/importação manual foi removida; alterações que ainda não aparecem como sincronizadas permanecem apenas no navegador atual.

Oriente todos a usar o endereço publicado e entrar na própria conta. O site não lê automaticamente o armazenamento isolado de uma cópia aberta por `file://`.

## Referências

- [Supabase: configurar SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [GitHub: criar um site do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
