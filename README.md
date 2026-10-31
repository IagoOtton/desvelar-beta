# DESVELAR — beta

Uma versão de teste do DESVELAR para receber feedback de um pequeno grupo de pessoas.

## Como testar

1. Abra o link de beta compartilhado pelo responsável.
2. Crie sua própria conta e confirme o e-mail.
3. Explore as telas e use **Sistema → Enviar feedback** para relatar um problema ou sugerir uma melhoria.

## Como os dados são tratados

- Estudos, tarefas, hábitos, metas pessoais, rotina, agenda, leitura e finanças ficam associados à conta e sincronizam entre dispositivos. Cada conta só acessa o próprio progresso.
- O aplicativo também mantém uma cópia local. Sem conexão, as alterações ficam nesse navegador e tentam sincronizar quando a conexão voltar. Use **Sistema → Exportar dados** para guardar um backup e evite registrar informações pessoais, médicas ou financeiras sensíveis durante o beta.
- Contas e dados dos grupos são tratados pelo Supabase. O texto enviado pelo formulário de feedback também é salvo no Supabase e associado à conta que o enviou.
- O código do aplicativo usa uma chave pública do Supabase. Ela não é uma senha; o acesso depende das políticas RLS do banco. Nunca coloque chaves `service_role` ou secret keys no frontend.

Se você já usava uma cópia aberta por `file://`, exporte os dados nessa cópia em **Sistema → Exportar dados**. Depois, na versão publicada, entre na mesma conta e use **Sistema → Importar arquivo**. A segurança do navegador impede que o site leia automaticamente os dados guardados pela cópia local.

## Configuração para publicar

Veja [PUBLICAR_BETA.md](03_DOCUMENTACAO/PUBLICAR_BETA.md) para preparar o Supabase e publicar a versão em GitHub Pages.

O workflow publica somente o aplicativo corrigido e seus arquivos `css/` e `js/` como site estático.

