# DESVELAR — beta

O DESVELAR está sendo reorganizado para concentrar a experiência na ferramenta pessoal de **Estudos**. Esta branch local mantém o acesso às contas existentes e ao progresso sincronizado.

## Escopo atual

- **Estudos:** registro de sessões, Pomodoro, temas e revisões, caderno de erros e desempenho.
- **Conta:** perfil privado, tema, sincronização, aviso de privacidade, consentimento de métricas e saída da conta.
- **Painel de métricas:** área privada disponível apenas para a conta administradora.
- **Autenticação:** entrar, criar conta e recuperar senha.

As demais ferramentas e comunidades não aparecem nesta versão. O código que normaliza e sincroniza os dados antigos continua preservando seus campos e coleções; a interface simplesmente deixa de oferecê-los. Nenhum dado de conta é apagado por esta reorganização.

## Dados, privacidade e sincronização

- O progresso é associado à conta e sincronizado pelo Supabase. A cópia local permite manter alterações pendentes quando a conexão falha.
- Use **Conta → Sincronização** para conferir o estado antes de trocar de dispositivo ou limpar dados do navegador.
- O consentimento de métricas é independente do aceite do aviso de privacidade e pode ser alterado em Conta. O painel mostra métricas agregadas à conta administradora.
- As estruturas antigas de dados e as migrações do Supabase são mantidas. Esta mudança não altera tabelas, políticas, funções, contas nem registros no banco.
- O frontend usa somente a chave pública do Supabase. Nunca coloque `service_role` ou secret keys no cliente.

## Desenvolvimento e publicação

- Código-fonte do app: `01_DESENVOLVIMENTO/`.
- Build estático: `scripts/build-beta.mjs`, que gera `dist-beta/` para o GitHub Pages.
- Guia de publicação: [03_DOCUMENTACAO/PUBLICAR_BETA.md](03_DOCUMENTACAO/PUBLICAR_BETA.md).
- Escopo e limites de preservação: [03_DOCUMENTACAO/ARQUITETURA_E_ESCOPO_ATUAL.md](03_DOCUMENTACAO/ARQUITETURA_E_ESCOPO_ATUAL.md).

O trabalho de reorganização está em uma branch local. A publicação atual não é alterada até que a versão local seja revisada e publicada por um fluxo separado.
