# DESVELAR --- Plano Técnico do Projeto

**Documento de referência --- versão 1.0**\
**Objetivo:** orientar a evolução do DESVELAR de um painel pessoal para
uma aplicação modular, segura, sincronizada e potencialmente
comercializável.

------------------------------------------------------------------------

## 1. Visão do produto

O DESVELAR é um painel pessoal que reúne funcionalidades de organização,
produtividade e acompanhamento, incluindo estudos, hábitos, finanças,
metas, rotina, leitura, agenda e tarefas.

A estratégia é preservar o trabalho existente e evoluir o aplicativo
gradualmente. A prioridade é proteger os dados e estabilizar o
funcionamento antes de realizar uma migração arquitetural ou acrescentar
funcionalidades.

A possibilidade de comercialização futura exige preparar o sistema para
múltiplos usuários, isolamento de dados, autenticação, segurança,
suporte e conformidade com a legislação aplicável.

## 2. Estado atual conhecido

### 2.1 Implementação

A versão analisada é uma aplicação construída em um único arquivo HTML,
utilizando HTML, CSS e JavaScript vanilla, sem framework principal.

A estrutura observada inclui:

-   Navegação por seções;
-   Renderização centralizada por `render()` e objeto `VIEWS`;
-   Delegação de eventos para interações;
-   Dados organizados em coleções/arrays;
-   Rotinas de normalização e migração de dados;
-   Persistência local por `localStorage`;
-   Exportação e importação de dados em JSON;
-   Funcionalidade Pomodoro com recuperação de sessão;
-   Dados demonstrativos na inicialização, com mecanismo para
    removê-los.

### 2.2 Seções identificadas

A navegação atual contém 13 seções:

1.  Início;
2.  Foco;
3.  Temas;
4.  Hábitos;
5.  Finanças;
6.  Metas;
7.  Rotina;
8.  Estudo;
9.  Leitura;
10. Agenda;
11. Tarefas;
12. Desempenho;
13. Sistema.

A migração deverá preservar as funcionalidades existentes. A lista acima
é um inventário inicial, não uma especificação completa de cada tela.

### 2.3 Dados e backup

Foi gerado um backup JSON pelo próprio sistema. A estrutura geral
corresponde ao formato v4 e o arquivo foi reconhecido como JSON válido
na análise anterior.

Algumas coleções estavam vazias e o usuário confirmou que isso era
esperado. Portanto, coleções vazias não devem ser tratadas
automaticamente como perda de dados.

O arquivo HTML original e o backup JSON foram copiados para
`00_ORIGINAL`. Uma cópia do HTML foi colocada em `01_DESENVOLVIMENTO`.

A igualdade dos hashes SHA256 dos dois arquivos HTML foi confirmada pelo
usuário, indicando que a cópia de desenvolvimento é idêntica ao original
naquele momento.

### 2.4 Controle de versão

O Git foi inicializado localmente. Foram registrados commits para a
estrutura inicial e para a cópia de desenvolvimento.

O arquivo `.gitignore` exclui, entre outros itens, `00_ORIGINAL/`,
`02_BACKUPS/`, dependências e arquivos de ambiente. O repositório ainda
não foi publicado no GitHub.

## 3. Arquitetura-alvo

A direção arquitetural recomendada é uma aplicação modular com:

-   **Frontend:** React e TypeScript;
-   **Banco de dados:** PostgreSQL;
-   **Backend gerenciado:** Supabase, incluindo autenticação e serviços
    de banco;
-   **Hospedagem:** Vercel ou alternativa equivalente;
-   **Versionamento:** Git e GitHub;
-   **Testes:** testes automatizados de regras e fluxos críticos, além
    de testes manuais de aceitação.

A escolha final de versões, bibliotecas e serviços deverá ser confirmada
no início da implementação, considerando compatibilidade, custo,
manutenção e requisitos do produto.

### 3.1 Separação de responsabilidades

A aplicação deverá separar:

-   **Interface:** páginas, componentes visuais, navegação e
    formulários;
-   **Regras de negócio:** cálculos, validações e comportamentos
    independentes da interface;
-   **Acesso a dados:** leitura e gravação no banco ou, durante a
    transição, armazenamento local;
-   **Autenticação e autorização:** identidade do usuário e permissões;
-   **Serviços compartilhados:** sincronização, exportação, importação e
    notificações;
-   **Testes:** verificação isolada de regras e integração dos fluxos.

### 3.2 Estrutura de diretórios proposta

``` text
DESVELAR/
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── routes/
│   │   └── config/
│   ├── components/
│   │   ├── buttons/
│   │   ├── cards/
│   │   ├── modals/
│   │   └── layout/
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── focus/
│   │   ├── themes/
│   │   ├── habits/
│   │   ├── finance/
│   │   ├── goals/
│   │   ├── routine/
│   │   ├── studies/
│   │   ├── reading/
│   │   ├── calendar/
│   │   ├── tasks/
│   │   ├── performance/
│   │   └── system/
│   ├── services/
│   │   ├── database/
│   │   ├── authentication/
│   │   └── synchronization/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   └── types/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

A estrutura é uma proposta inicial. Ela poderá ser ajustada quando o
inventário detalhado do código e das dependências estiver concluído.

## 4. Riscos e problemas prioritários identificados

A análise anterior foi estática: o código foi inspecionado, mas não foi
executado em navegador nem submetido a testes funcionais. Os pontos
abaixo devem ser reproduzidos e confirmados antes da correção.

### 4.1 Recuperação do armazenamento

Foi identificado um fluxo em que uma falha de leitura ou JSON inválido
pode resultar em `null`; a normalização subsequente pode inicializar
dados demonstrativos e permitir que esse estado seja persistido.

**Risco:** substituir ou ocultar dados que já existiam.

**Diretriz:** distinguir claramente primeira execução, armazenamento
vazio, armazenamento inválido e falha de acesso. Em caso de erro,
preservar o conteúdo bruto quando possível, interromper gravações
automáticas e orientar recuperação. Não inicializar dados demonstrativos
sobre um estado cuja integridade não foi confirmada.

### 4.2 Importação JSON

A validação observada é limitada e não garante que todas as coleções e
registros tenham os formatos esperados.

**Risco:** importar estruturas incompletas ou malformadas e substituir
dados válidos.

**Diretriz:** validar versão, estrutura, tipos, campos obrigatórios e
relações antes de alterar o estado atual. A importação deverá ser
transacional do ponto de vista da aplicação: validar primeiro,
apresentar resumo e somente então substituir ou mesclar mediante ação
explícita.

### 4.3 Exportação JSON

O fluxo observado atualiza o indicador de último backup antes de
confirmar adequadamente o resultado do download.

**Risco:** a interface indicar backup concluído quando o arquivo não foi
efetivamente gerado ou disponibilizado.

**Diretriz:** atualizar o estado de backup somente após a etapa de
geração/download ser iniciada com sucesso, deixando claro o limite do
que o navegador consegue confirmar.

### 4.4 Persistência local e sincronização

A versão atual utiliza `localStorage`, sem sincronização entre
dispositivos.

**Risco:** dados isolados no navegador e ausência de recuperação
centralizada.

**Diretriz:** manter a persistência local estável durante a primeira
fase; introduzir backend e sincronização somente após definir modelo de
dados, autenticação, política de conflitos e estratégia de migração.

### 4.5 Segurança e multiusuário

A versão atual não possui autenticação nem isolamento de dados entre
contas.

**Diretriz:** antes de disponibilizar a aplicação a terceiros,
implementar autenticação, autorização e políticas de isolamento no banco
(por exemplo, Row Level Security no Supabase), além de revisar exposição
de segredos, validação de entrada, registros e tratamento de dados
pessoais.

### 4.6 Manutenção e testes

O código está concentrado em um arquivo e não há evidência de uma suíte
de testes automatizados.

**Diretriz:** modularizar gradualmente e criar testes para
armazenamento, importação, exportação, cálculos e fluxos críticos antes
de grandes refatorações.

## 5. Plano de execução

### Fase 0 --- Preservação e ambiente

-   [x] Preservar o HTML original e o backup JSON;
-   [x] Criar cópia de trabalho;
-   [x] Confirmar igualdade SHA256 entre original e cópia;
-   [x] Instalar Node.js, npm e Git;
-   [x] Inicializar repositório Git local;
-   [x] Criar `.gitignore`;
-   [ ] Revisar o conteúdo do `.gitignore` antes de qualquer publicação
    remota;
-   [ ] Criar backup externo adicional, independente da sincronização do
    OneDrive.

### Fase 1 --- Auditoria detalhada e proteção dos dados

-   [ ] Mapear funções de leitura e gravação;
-   [ ] Documentar formato e versão do JSON;
-   [ ] Identificar todas as rotinas de normalização e migração;
-   [ ] Reproduzir os cenários de armazenamento vazio, inválido e
    indisponível;
-   [ ] Corrigir recuperação sem sobrescrita silenciosa;
-   [ ] Definir validação completa para importação;
-   [ ] Corrigir sinalização de sucesso da exportação;
-   [ ] Criar testes e roteiro de verificação manual;
-   [ ] Registrar commit após validação.

### Fase 2 --- Especificação funcional e arquitetura

-   [ ] Inventariar cada uma das 13 seções;
-   [ ] Registrar telas, ações, regras e dados de cada módulo;
-   [ ] Identificar componentes compartilhados;
-   [ ] Definir contratos e tipos dos dados;
-   [ ] Definir estratégia de migração do HTML atual para React e
    TypeScript;
-   [ ] Definir critérios de aceitação para cada módulo.

### Fase 3 --- Migração modular do frontend

-   [ ] Criar projeto React + TypeScript;
-   [ ] Configurar ferramentas, lint e testes;
-   [ ] Reproduzir estrutura visual global;
-   [ ] Migrar módulos gradualmente;
-   [ ] Comparar cada módulo com a versão de referência;
-   [ ] Preservar compatibilidade com os dados existentes.

### Fase 4 --- Backend, autenticação e dados

-   [ ] Definir modelo relacional PostgreSQL;
-   [ ] Criar ambiente Supabase de desenvolvimento;
-   [ ] Implementar autenticação;
-   [ ] Implementar políticas de autorização e isolamento;
-   [ ] Criar migração segura do JSON/localStorage;
-   [ ] Validar integridade e reconciliação dos dados migrados.

### Fase 5 --- Sincronização e experiência multiplataforma

-   [ ] Implementar sincronização entre dispositivos;
-   [ ] Definir tratamento de edições simultâneas e conflitos;
-   [ ] Implementar estados de conexão e falha;
-   [ ] Testar responsividade em notebook e celular;
-   [ ] Avaliar estratégia offline, se necessária.

### Fase 6 --- Preparação comercial

-   [ ] Definir público-alvo e proposta de valor;
-   [ ] Definir modelo de planos e cobrança;
-   [ ] Implementar gestão de assinaturas, se aplicável;
-   [ ] Preparar suporte e administração;
-   [ ] Revisar privacidade, segurança e LGPD;
-   [ ] Preparar monitoramento, cópias de segurança e resposta a
    incidentes;
-   [ ] Executar testes de aceitação antes da disponibilização pública.

## 6. Regras de trabalho do projeto

1.  Nunca editar diretamente o arquivo em `00_ORIGINAL`.
2.  Não versionar backups, dados pessoais, credenciais ou arquivos
    `.env`.
3.  Fazer alterações pequenas, com escopo definido.
4.  Criar commit antes e depois de mudanças relevantes.
5.  Não realizar refatoração ampla junto com correções de integridade.
6.  Testar os fluxos afetados após cada alteração.
7.  Não considerar uma funcionalidade concluída sem evidência de teste.
8.  Documentar decisões, limitações e mudanças de formato de dados.
9.  Não publicar o repositório no GitHub antes de revisar todo o
    conteúdo e os arquivos rastreados.
10. Manter backups independentes do repositório Git e da sincronização
    do OneDrive.

## 7. Critérios para considerar a Fase 1 concluída

A Fase 1 somente será considerada concluída quando:

-   Um armazenamento vazio iniciar normalmente;
-   Um armazenamento válido carregar sem alterações indevidas;
-   Um JSON inválido não provocar inicialização demonstrativa com
    sobrescrita;
-   Uma falha de acesso ao armazenamento não causar gravação destrutiva;
-   Um arquivo de importação inválido for rejeitado sem alterar os dados
    atuais;
-   Um arquivo válido puder ser importado de forma controlada;
-   A exportação gerar um arquivo JSON válido e informar corretamente o
    resultado;
-   Os cenários acima estiverem documentados e testados.

------------------------------------------------------------------------

## 8. Limitações e pontos ainda não confirmados

-   A auditoria anterior foi estática; não comprova o comportamento em
    execução.
-   Os riscos descritos precisam ser reproduzidos na cópia de
    desenvolvimento antes de implementar correções.
-   O inventário das 13 seções ainda precisa ser aprofundado diretamente
    no código.
-   O modelo de dados definitivo ainda não foi projetado.
-   A arquitetura proposta é uma direção técnica, não uma implementação
    já realizada.
-   Nenhum serviço remoto, autenticação, sincronização ou publicação
    comercial foi configurado até o momento.

**Próxima atividade:** concluir a auditoria detalhada do armazenamento,
importação e exportação na cópia de desenvolvimento, sem modificar o
arquivo original.
