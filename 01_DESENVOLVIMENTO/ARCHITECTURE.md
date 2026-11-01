# Arquitetura do DESVELAR

## Entrada do aplicativo

`desvelar-v1-corrigido.html` carrega os scripts clássicos do aplicativo. Após a autenticação, `auth.js` carrega `js/app.js`. Os módulos são IIFEs que publicam uma API nomeada em `window.Desvelar...`; mantenha os scripts na ordem do HTML, porque os módulos são criados antes de o aplicativo ser iniciado.

O fluxo esperado é:

1. Utilitários, modelo, domínio e configuração.
2. Componentes compartilhados e integrações.
3. Repositórios, sincronização e estado.
4. Views e controllers.
5. Autenticação; depois da sessão, `app.js`.

O build do beta copia a pasta `js` inteira. Ao adicionar um arquivo, inclua o script no HTML antes de qualquer módulo que o use.

## Responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| `domain/` | Normalização e regras puras de dados, análises e transições do Pomodoro. Não acessa DOM, rede ou armazenamento. |
| `repositories/` | Leitura e gravação em serviços externos ou armazenamento local. |
| `services/` | Orquestração de sincronização e outras tarefas que atravessam repositórios. |
| `state/` | Estado em memória, rascunhos, persistência e recuperação após falhas. |
| `components/` | Elementos visuais reutilizáveis e indicadores derivados dos dados. |
| `views/` | Montagem do HTML de cada tela. Recebem dependências e não controlam persistência. |
| `controllers/` | Ações do usuário, operações de conta e efeitos de execução do Pomodoro. |
| `config/` | Metadados estáticos usados para montar navegação e personalização. |
| `app.js` | Ponto de composição: cria serviços, injeta dependências, conecta ações, renderiza e inicia o aplicativo. |

## Ao adicionar uma funcionalidade

- Coloque cálculo independente de interface em `domain/`.
- Coloque acesso ao Supabase, navegador ou armazenamento em um repositório ou serviço.
- Mantenha cada tela em sua view e injete as funções necessárias.
- Faça alterações no estado por meio do `stateStore`; persista apenas pelas rotinas existentes de sincronização.
- Para uma nova aba, atualize o modelo de módulos, o registro em `config/module-registry.js`, a view correspondente e o `ViewRegistry`.
- Para mudanças no formato salvo, revise normalização, versão do modelo e compatibilidade com dados já existentes.
- Preserve o fluxo da Actions: os testes automatizados e o build passam antes do deploy no Pages.


