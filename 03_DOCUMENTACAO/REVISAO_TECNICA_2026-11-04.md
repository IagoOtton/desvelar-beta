# Revisão técnica do DESVELAR — 4 de novembro de 2026

## Resumo

O projeto já tem uma base adequada para o beta: separa domínio, interface, controladores e repositórios; carrega Atividade Física e Comunidade sob demanda; minifica os assets, usa nomes com hash e publica por GitHub Actions. Não encontrei motivo para reescrever o app ou para retirar funcionalidades nesta rodada.

Os pontos de maior risco são a reconstrução do banco a partir de uma instalação vazia, uma proteção de autenticação desativada no painel do Supabase e a manutenção de uma folha de estilos que cresceu por sucessivas camadas de ajustes. O primeiro precisa ser tratado em um ambiente descartável; o segundo depende de uma configuração externa; o terceiro deve ser feito com comparação visual das telas e dos dois temas.

## 1. Desenvolvimento e estrutura

### O que está bem encaminhado

- `js/domain/`, `repositories/`, `services/`, `state/`, `views/` e `controllers/` têm responsabilidades distintas.
- A sincronização de dados pessoais trata conflito de revisão e mantém recuperação de gravações pendentes.
- O build separa autenticação, núcleo, atividade física e comunidade. Os dois últimos só são carregados quando necessários.
- O service worker guarda apenas assets próprios com hash. O HTML e as respostas do Supabase não ficam presos a um cache antigo.
- O workflow exige build e testes antes da publicação. O deploy acontece quando a alteração chega a `main`.
- A chave Supabase incluída no cliente é publicável; não encontrei uso de `service_role` no frontend. A segurança continua dependendo de RLS e das verificações dentro das funções administrativas.

### Riscos de manutenção

- `app.js`, `views/strength.js`, `controllers/strength.js` e `style.css` são grandes. Isso aumenta o custo de localizar efeitos colaterais e revisar mudanças.
- `style.css` tem cerca de 8,8 mil linhas e regras de tema e de Atividade Física acrescentadas em camadas. A aparência pode depender da ordem dos seletores; correções visuais futuras devem verificar Treinar, Rotinas, Histórico, Desempenho e Medidas nos temas claro e escuro.
- Os scripts iniciais de criação do banco ficam fora de `supabase/migrations/`. As migrações existentes são incrementais e não formam sozinhas um histórico que reconstrua o banco atual desde o zero. Não se deve executar `supabase db reset` nem usar esses scripts para recriar produção antes de reconciliar uma migração-base em um banco descartável.

### Próxima melhoria estrutural

Dividir os arquivos extensos por responsabilidade, preservando a ordem atual de execução. Para o CSS, primeiro agrupar regras por área e eliminar sobrescritas redundantes; fazer isso em uma mudança dedicada com comparação visual, pois uma extração mecânica pode reintroduzir diferenças de cor e espaçamento.

## 2. Desempenho e velocidade

Build local de produção medido nesta revisão:

| Asset | Tamanho minificado | Gzip estimado |
| --- | ---: | ---: |
| CSS inicial | 142,2 KB | 25,6 KB |
| Bundle de autenticação | 32,2 KB | 9,6 KB |
| Núcleo do app, após autenticação | 185,0 KB | 55,7 KB |
| Atividade Física, sob demanda | 62,4 KB | 16,9 KB |
| Comunidade, sob demanda | 33,5 KB | 9,8 KB |
| SVG de fundo da autenticação | 2,3 KB | 0,6 KB |

O gzip é uma estimativa local; a transferência real depende da compressão e dos cabeçalhos do host. O app já tem minificação, divisão de bundles, carregamento sob demanda e cache de arquivos com hash. As imagens encontradas são vetoriais e leves; conversão para WebP ou lazy loading de imagens não traria ganho relevante agora.

Fontes e o SDK Supabase vêm de CDNs externos. Isso reduz cópias locais e permite `font-display: swap`, mas mantém dependência de terceiros. Antes de embutir o SDK ou trocar as fontes, comparar o tamanho gzip, a quantidade de conexões e o tempo real em celular; o bundle de atividade física não é carregado na entrada.

Uma medição de Lighthouse/Core Web Vitals em computador e celular não foi feita nesta revisão. Os tamanhos acima não substituem métricas de carregamento percebido em rede móvel.

## 3. UX, UI e acessibilidade

- O layout já tem navegação desktop e móvel, estado atual indicado na navegação, labels de formulário, mensagens de status, foco visível e suporte a `prefers-reduced-motion`.
- Esta revisão acrescenta um link de salto para teclado e transforma o ponto de entrada de autenticação em landmark `main`. O conteúdo do app também pode receber foco como destino do link.
- A folha de estilos usa tokens e suporta temas claro e escuro, mas as regras mais recentes acumuladas podem divergir por aba. A próxima rodada visual deve validar os estados e áreas por captura de tela, sem mudar os dados ou a navegação.
- Convém revisar contrastes de combinações de texto e fundo em cada tema e confirmar alvos de toque em telas pequenas em uma rodada visual específica. Não alterei cores ou dimensões nesta rodada porque os contrastes dependem das combinações finais compostas pelo CSS.

## 4. SEO e compartilhamento

- `estudos.html` é uma página pública indexável com idioma, título, descrição, canonical, Open Graph, um H1 e seções H2/H3. `privacidade.html` também tem metadados próprios e canonical.
- O app exige login e está marcado `noindex`; não deve ser enviado ao sitemap. O sitemap inclui as duas páginas públicas atuais.
- O `robots.txt` é publicado em `/desvelar-beta/robots.txt`. Em um GitHub Pages de projeto, esse caminho não é a raiz do host `iagootton.github.io`, então o arquivo não controla rastreamento na raiz do domínio. Para ter um `robots.txt` efetivo na raiz, será necessário usar domínio próprio ou publicar pelo repositório de usuário/organização.
- Só Estudos tem página pública de apresentação além do aviso de privacidade. Quando as demais áreas estiverem prontas para divulgação, páginas públicas próprias poderão ampliar a descoberta sem indexar telas privadas.
- Falta uma imagem de compartilhamento social no Open Graph. Para adicioná-la corretamente, criar um PNG/JPEG horizontal de 1200 × 630 e incluí-lo nos metadados; não apontar para o SVG decorativo de fundo como substituto sem validar compatibilidade dos cartões.

## 5. Supabase e segurança

- Os avisos do advisor apontam 25 funções `SECURITY DEFINER` executáveis por pessoas autenticadas. Isso não prova uma vulnerabilidade por si só: parte dessas funções dá suporte às políticas RLS e outras são RPCs do app. As funções de métricas, mensagens e feedback precisam manter a checagem da lista privada de administradores. Não revogar o grupo inteiro de permissões sem validar cada chamada.
- O advisor também informa tabelas `private` com RLS ligado e sem políticas. Isso é apropriado enquanto elas não forem expostas para acesso direto da API; não adicione políticas abertas para eliminar o aviso.
- A proteção contra senhas vazadas está desativada no Auth. É um ajuste do painel Supabase, não uma alteração SQL. Ative **Leaked Password Protection** nas configurações de autenticação depois de confirmar as opções disponíveis no plano; a mudança passa a recusar senhas conhecidas em vazamentos.
- O advisor de desempenho marcou índices como não utilizados. Como o beta tem pouco histórico de consultas, não os remova apenas com base nessa estatística; confirme `EXPLAIN`, volume real e consultas de cada tabela antes.
- Nenhuma migration ou configuração remota do Supabase foi alterada nesta revisão.

## Alterações feitas nesta rodada

1. Adicionado link de teclado **Pular para o conteúdo principal** com alvo focável.
2. A raiz de autenticação passou a usar o elemento semântico `main`.
3. O guia de publicação foi atualizado: repositório, Pages, SMTP e URLs já configurados; SQL inicial marcado como histórico; risco de reconstrução do banco documentado.
4. Build de produção executado com sucesso e tamanhos dos assets registrados acima.

## Pendências que dependem de ação separada

1. Ativar a proteção contra senhas vazadas nas configurações do Supabase Auth.
2. Reconciliar o baseline de migrations em um banco descartável antes de permitir reset ou reconstrução do banco.
3. Medir Core Web Vitals em celular e computador com rede e dispositivo representativos.
4. Consolidar o CSS por área com validação visual, principalmente nas abas de Atividade Física.
5. Criar uma imagem Open Graph e páginas públicas das áreas que forem divulgadas.
