# Arquitetura do DESVELAR

## Entrada do aplicativo

`desvelar-v1-corrigido.html` é a entrada de desenvolvimento e dos testes. Ela carrega os scripts clássicos do aplicativo. O build de produção agrupa e minifica esses módulos em dois bundles com nomes baseados no conteúdo: um bundle pequeno de autenticação e outro com o aplicativo. Após validar a sessão, `auth.js` pré-carrega o bundle do aplicativo enquanto busca os dados da conta e o executa quando a carga dos dados termina. Os módulos de origem continuam como IIFEs que publicam APIs em `window.Desvelar...`; mantenha a ordem das importações nas entradas de build, pois esses módulos são criados antes de o aplicativo ser iniciado.

O fluxo esperado é:

1. O bundle de autenticação carrega o modelo, o repositório de dados da nuvem e o cliente Supabase.
2. O bundle do aplicativo carrega utilitários, domínio, configuração, componentes, repositórios, sincronização, estado, views e controllers.
3. `app.js` encerra o bundle do aplicativo e inicia a interface depois de a sessão e os dados da conta estarem prontos.

O build usa esbuild para minificar o JavaScript e o CSS, gerar nomes de arquivo com hash e publicar somente o HTML de entrada e os assets compilados. Ao adicionar um módulo de origem, inclua-o na entrada apropriada antes de qualquer módulo que o use. Os testes locais continuam carregando os scripts de origem pelo HTML de desenvolvimento.

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

## Cálculos derivados

`domain/analytics.js` monta índices de sessões, leituras e questões sob demanda para o snapshot de estado atual. Os índices ficam em memória e são descartados quando o `stateStore` publica um novo snapshot. Use funções por intervalo de datas para os indicadores de período; cálculos com filtros arbitrários continuam percorrendo os registros. Não altere o estado publicado diretamente, pois isso impede a invalidação dos índices.

## Ao adicionar uma funcionalidade

- Coloque cálculo independente de interface em `domain/`.
- Coloque acesso ao Supabase, navegador ou armazenamento em um repositório ou serviço.
- Mantenha cada tela em sua view e injete as funções necessárias.
- Faça alterações no estado por meio do `stateStore`; persista apenas pelas rotinas existentes de sincronização.
- Para uma nova aba, atualize o modelo de módulos, o registro em `config/module-registry.js`, a view correspondente e o `ViewRegistry`.
- Para mudanças no formato salvo, revise normalização, versão do modelo e compatibilidade com dados já existentes.
- Preserve o fluxo da Actions: os testes automatizados e o build passam antes do deploy no Pages.


