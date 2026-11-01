# DESVELAR — beta

Uma versão de teste do DESVELAR para receber feedback de um pequeno grupo de pessoas.

## Como testar

1. Abra o link de beta compartilhado pelo responsável.
2. Crie sua própria conta e confirme o e-mail.
3. Explore as telas e use **Sistema → Enviar feedback** para relatar um problema ou sugerir uma melhoria.

## Como os dados são tratados

- Estudos, tarefas, hábitos, metas pessoais, rotina, agenda, leitura e finanças ficam associados à conta e sincronizam entre dispositivos. Cada conta só acessa o próprio progresso.
- O aplicativo mantém uma cópia local para uso sem conexão e tenta sincronizá-la quando a conexão volta. Confira em **Sistema** se aparece “Sincronizado com sua conta” antes de limpar os dados do navegador ou trocar de dispositivo. O app não oferece exportação/importação manual no momento.
- Evite registrar informações pessoais, médicas ou financeiras sensíveis durante o beta.
- Contas e dados dos grupos são tratados pelo Supabase. O texto enviado pelo formulário de feedback também é salvo no Supabase e associado à conta que o enviou.
- A Comunidade usa um nome de exibição e uma apresentação escolhidos pela pessoa. Publicações ficam visíveis para contas autenticadas; ciclos, indicações e progresso de leitura ficam visíveis às pessoas daquele grupo.
- Não publique dados pessoais sensíveis na Comunidade. As denúncias ficam registradas no Supabase e precisam ser revisadas pelo responsável do beta.
- O código do aplicativo usa uma chave pública do Supabase. Ela não é uma senha; o acesso depende das políticas RLS do banco. Nunca coloque chaves `service_role` ou secret keys no frontend.

Use o endereço publicado e entre na sua conta para acessar o progresso sincronizado. Dados que existiam apenas em uma cópia aberta por `file://` ficam isolados pelo navegador e não são transferidos automaticamente para o site.

## Configuração para publicar

Veja [PUBLICAR_BETA.md](03_DOCUMENTACAO/PUBLICAR_BETA.md) para preparar o Supabase e publicar a versão em GitHub Pages.

O workflow publica somente o aplicativo corrigido e seus arquivos `css/` e `js/` como site estático.
