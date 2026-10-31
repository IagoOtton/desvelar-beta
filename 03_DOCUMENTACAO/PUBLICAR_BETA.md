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

## 5. Criar o repositório e publicar

1. Crie no GitHub um repositório vazio chamado, por exemplo, `desvelar-beta`. Para usar o Pages no GitHub Free, deixe o repositório público. Não adicione README, licença ou `.gitignore` pelo GitHub; eles já existem neste projeto.
2. No terminal, na pasta do projeto, adicione as alterações e crie um commit:

   ```powershell
   git add .
   git commit -m "Preparar beta do DESVELAR"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/desvelar-beta.git
   git push -u origin main
   ```

   Troque `SEU-USUARIO` pelo seu usuário do GitHub. Se já houver um `origin`, atualize-o para o endereço do novo repositório em vez de executar `git remote add`.
3. No repositório, abra **Settings → Pages** e selecione **GitHub Actions** como origem de publicação.
4. Abra **Actions** e acompanhe o workflow **Publicar beta no GitHub Pages**. Ele publica após um push na branch `main`; também pode ser iniciado manualmente por **Run workflow**.
5. Quando a execução terminar, abra o endereço mostrado pelo deployment do GitHub Pages e teste cadastro, confirmação de e-mail, entrada e envio de feedback.
6. Envie esse endereço aos amigos. Cada pessoa deve criar sua própria conta.

## 6. O que pedir no feedback

Peça que testem uma tarefa real e descrevam: o que tentaram fazer, o que aconteceu e o que esperavam. O feedback enviado em **Sistema → Enviar feedback** fica associado à conta. Os dados pessoais de estudo, rotina, hábitos, metas e finanças também ficam no Supabase e sincronizam ao entrar com a mesma conta em outro dispositivo. O navegador conserva uma cópia local e permite exportar um backup.

Se alguém já usava a cópia local aberta por `file://`, deve exportar os dados dessa cópia e importar o arquivo na versão publicada. O site não pode ler automaticamente o armazenamento de outro endereço.

## Referências

- [Supabase: configurar SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [GitHub: criar um site do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

