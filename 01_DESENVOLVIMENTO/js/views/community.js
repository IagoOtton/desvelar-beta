(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.head !== "function" ||
      typeof dependencies.esc !== "function" ||
      !dependencies.repository ||
      typeof dependencies.repository.loadPage !== "function"
    ) {
      throw new Error("As dependências da comunidade não foram informadas.");
    }

    var head = dependencies.head;
    var esc = dependencies.esc;
    var repository = dependencies.repository;

    function relatedName(record, key) {
      var value = record && record[key];
      if (Array.isArray(value)) value = value[0];
      return value && value.display_name ? value.display_name : "Leitor";
    }

    function formatDate(value) {
      var date = new Date(value);
      if (isNaN(date.getTime())) return "Agora";
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    }

    function monthValue() {
      var date = new Date();
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    }

    function nextAvailableMonth(cycles) {
      var date = new Date();
      date.setDate(1);
      var available = "";
      while (!available) {
        var value = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
        var used = cycles.some(function (cycle) {
          return String(cycle.cycle_month).slice(0, 7) === value;
        });
        if (!used) available = value;
        else date.setMonth(date.getMonth() + 1);
      }
      return available;
    }

    function monthLabel(value) {
      var date = new Date(String(value || "") + "T12:00:00");
      if (isNaN(date.getTime())) return "Ciclo de leitura";
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(date);
    }

    function profileCard(profile) {
      var saved = profile && profile.display_name;
      return (
        '<section id="community-profile" class="card community-profile"><div class="community-profile-header"><span class="community-profile-avatar" aria-hidden="true">' +
        esc(saved ? saved.slice(0, 1).toLocaleUpperCase("pt-BR") : "✦") +
        '</span><div><p class="eyebrow">SEU ESPAÇO</p><h2>Seu perfil de leitor</h2><p class="m">' +
        (saved
          ? "Este nome e esta apresentação aparecem nas suas publicações e grupos."
          : "Escolha como as outras pessoas vão reconhecer você na comunidade.") +
        '</p></div></div><form data-community-form="profile" class="community-profile-form"><label class="f">Nome exibido<input class="grow" name="display_name" minlength="2" maxlength="40" autocomplete="nickname" value="' +
        esc(profile ? profile.display_name : "") +
        '" required></label><label class="f">Apresentação <span class="m">opcional</span><textarea name="bio" maxlength="240" rows="2" placeholder="Que tipos de livro você gosta?">' +
        esc(profile ? profile.bio : "") +
        '</textarea></label><button class="btn" type="submit">' +
        (saved ? "Salvar perfil" : "Criar perfil") +
        "</button></form></section>"
      );
    }

    function postComposer(profile) {
      if (!profile) {
        return '<section id="community-composer" class="community-compose"><div class="community-compose-prompt"><span class="community-compose-mark" aria-hidden="true">✦</span><div><p class="eyebrow">SUA PRÓXIMA CONVERSA</p><h2>O que você está lendo?</h2></div></div><p class="empty">Crie seu perfil de leitor para compartilhar uma leitura.</p><a class="btn" href="#community-profile">Montar meu perfil</a></section>';
      }
      var displayName = typeof profile.display_name === "string"
        ? profile.display_name.trim()
        : "";
      return (
        '<section id="community-composer" class="community-compose"><div class="community-compose-prompt"><span class="community-compose-mark" aria-hidden="true">' +
        esc(displayName ? displayName.slice(0, 1).toLocaleUpperCase("pt-BR") : "✦") +
        '</span><div><p class="eyebrow">A CONVERSA COMEÇA COM VOCÊ</p><h2>O que a leitura despertou?</h2></div></div><form data-community-form="post" class="community-post-form"><label class="sr-only" for="community-post-body">Escreva para a comunidade</label><textarea id="community-post-body" name="body" maxlength="1500" rows="3" placeholder="Compartilhe uma descoberta, uma pergunta ou uma ideia que ficou com você…" required></textarea><div class="community-book-fields"><label class="f">Livro relacionado <span class="m">opcional</span><input class="grow" name="book_title" maxlength="160" placeholder="Título"></label><label class="f">Autor <span class="m">opcional</span><input class="grow" name="book_author" maxlength="120" placeholder="Nome do autor"></label></div><div class="rowflex community-submit-row"><span class="m">Uma boa conversa pode começar por uma página.</span><button class="btn pri" type="submit">Compartilhar</button></div></form></section>'
      );
    }

    function postHtml(post) {
      var comments = Array.isArray(post.community_post_comments)
        ? post.community_post_comments.slice().sort(function (a, b) {
            return new Date(a.created_at) - new Date(b.created_at);
          })
        : [];
      var commentCount = Math.max(comments.length, Number(post.comment_count || 0));
      var reactionCount = Math.max(0, Number(post.reaction_count || 0));
      var reacted = Boolean(post.reacted_by_user);
      var olderCommentCount = Math.max(0, commentCount - comments.length);
      var book = post.book_title
        ? '<div class="community-book-tag"><span aria-hidden="true">▤</span><span><strong>' +
          esc(post.book_title) +
          "</strong>" +
          (post.book_author ? '<span class="m"> · ' + esc(post.book_author) + "</span>" : "") +
          "</span></div>"
        : "";
      var commentsHtml = comments.length
        ? '<ol class="community-comments">' +
          comments
            .map(function (comment) {
              return (
                '<li><div class="community-comment-meta"><strong>' +
                esc(relatedName(comment, "reader_profiles")) +
                '</strong><time datetime="' +
                esc(comment.created_at) +
                '">' +
                esc(formatDate(comment.created_at)) +
                "</time></div><p>" +
                esc(comment.body) +
                "</p></li>"
              );
            })
            .join("") +
          "</ol>"
        : '<p class="m community-no-comments">Ainda não há comentários.</p>';
      var olderCommentsButton = olderCommentCount
        ? '<button class="btn sm community-load-comments" type="button" data-community-action="load-comments" data-post-id="' +
          esc(post.id) +
          '">Carregar comentários anteriores (' + olderCommentCount + ")</button>"
        : "";

      return (
        '<article class="community-post"><header class="community-post-header"><div class="community-avatar" aria-hidden="true">' +
        esc(relatedName(post, "reader_profiles").slice(0, 1).toLocaleUpperCase("pt-BR")) +
        '</div><div class="community-post-author"><strong>' +
        esc(relatedName(post, "reader_profiles")) +
        '</strong><time datetime="' +
        esc(post.created_at) +
        '">' +
        esc(formatDate(post.created_at)) +
        '</time></div><details class="community-report"><summary aria-label="Denunciar publicação">•••</summary><form data-community-form="report" data-post-id="' +
        esc(post.id) +
        '"><label class="f">Motivo<select name="reason" required><option value="spam">Spam</option><option value="harassment">Assédio</option><option value="inappropriate">Conteúdo inadequado</option><option value="other">Outro</option></select></label><label class="f">Detalhes <span class="m">opcional</span><textarea name="details" maxlength="500" rows="2"></textarea></label><button class="btn sm" type="submit">Enviar denúncia</button></form></details></header><p class="community-post-body">' +
        esc(post.body) +
        "</p>" +
        book +
        '<div class="community-post-actions"><button class="btn sm community-like' +
        (reacted ? " is-liked" : "") +
        '" type="button" data-community-action="reaction" data-post-id="' +
        esc(post.id) +
        '" data-reacted="' +
        (reacted ? "true" : "false") +
        '" aria-pressed="' +
        (reacted ? "true" : "false") +
        '"><span aria-hidden="true">' +
        (reacted ? "♥" : "♡") +
        '</span> ' +
        reactionCount +
        ' curtidas</button><span class="m">' +
        commentCount +
        (commentCount === 1 ? " comentário" : " comentários") +
        '</span></div><div class="community-comments-area"><h3>Conversa</h3>' +
        commentsHtml +
        olderCommentsButton +
        '<form data-community-form="comment" data-post-id="' +
        esc(post.id) +
        '" class="community-comment-form"><label class="sr-only" for="comment-' +
        esc(post.id) +
        '">Escreva um comentário</label><input id="comment-' +
        esc(post.id) +
        '" name="body" maxlength="700" placeholder="Escreva um comentário…" required><button class="btn sm" type="submit">Comentar</button></form></div></article>'
      );
    }

    function progressHtml(cycle, entries) {
      if (!entries.length) return '<p class="m">Ninguém compartilhou o progresso ainda.</p>';
      var olderUpdates = Number(cycle.progress_count || 0) > entries.length
        ? '<p class="m">Exibindo as oito atualizações mais recentes deste ciclo.</p>'
        : "";
      return (
        '<ul class="community-progress-list">' +
        entries
          .map(function (entry) {
            var percent = entry.percent_complete;
            if (percent == null && entry.pages_read != null && entry.total_pages) {
              percent = Math.min(100, Math.round((entry.pages_read / entry.total_pages) * 100));
            }
            return (
              '<li><div class="community-progress-top"><strong>' +
              esc(relatedName(entry, "reader_profiles")) +
              '</strong><span class="num">' +
              (percent == null ? esc(entry.pages_read + " / " + entry.total_pages + " pág.") : esc(Math.round(Number(percent)) + "%")) +
              '</span></div>' +
              (percent == null ? "" : '<div class="community-progress-track" role="progressbar" aria-label="Progresso de ' + esc(relatedName(entry, "reader_profiles")) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + esc(percent) + '"><span style="width:' + esc(percent) + '%"></span></div>') +
              (entry.note ? '<p class="m">' + esc(entry.note) + "</p>" : "") +
              '<time datetime="' + esc(entry.created_at) + '">' + esc(formatDate(entry.created_at)) + "</time></li>"
            );
          })
          .join("") +
          "</ul>" + olderUpdates
      );
    }

    function cycleHtml(group, cycle, data, isOwner) {
      var details = data.cycleDetails[cycle.id] || null;
      var candidates = details ? details.candidates : [];
      var progress = details ? details.progress : [];
      var detailError = data.cycleDetailErrors[cycle.id];
      var status = cycle.status === "nominations" ? "Indicações abertas" : cycle.status === "reading" ? "Leitura em andamento" : "Ciclo encerrado";
      var selectedBook = cycle.selected_title
        ? '<div class="community-selected-book"><span class="m">Livro do mês</span><strong>' + esc(cycle.selected_title) + "</strong>" + (cycle.selected_author ? '<span class="m">' + esc(cycle.selected_author) + "</span>" : "") + "</div>"
        : "";
      var candidatesHtml = candidates.length
        ? '<ul class="community-candidate-list">' + candidates.map(function (candidate) {
            var count = Number(candidate.nomination_count || 0);
            return '<li><div><strong>' + esc(candidate.title) + '</strong>' + (candidate.author ? '<span class="m">' + esc(candidate.author) + '</span>' : "") + '</div><span class="badge">' + count + (count === 1 ? " indicação" : " indicações") + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="empty">Ainda não há indicações. Cada pessoa pode sugerir mais de um livro.</p>';
      var nominationForm = cycle.status === "nominations"
        ? '<form class="community-nominate-form" data-community-form="nominate" data-cycle-id="' + esc(cycle.id) + '"><h4>Indicar um livro</h4><div class="community-book-fields"><label class="f">Título<input class="grow" name="title" maxlength="160" required></label><label class="f">Autor<input class="grow" name="author" maxlength="120"></label></div><label class="f">ISBN <span class="m">opcional</span><input class="grow" name="isbn" maxlength="20" inputmode="numeric"></label><button class="btn" type="submit">Adicionar indicação</button></form>' +
          (isOwner ? '<button class="btn pri" type="button" data-community-action="draw" data-cycle-id="' + esc(cycle.id) + '"' + (candidates.length ? "" : " disabled") + '>Sortear o próximo livro</button>' : '<p class="m">A pessoa responsável pelo grupo poderá sortear quando houver indicações.</p>')
        : "";
      var progressSection = cycle.status === "reading"
        ? '<section class="community-progress-section"><h4>Progresso compartilhado</h4>' + progressHtml(cycle, progress) + '<form class="community-progress-form" data-community-form="progress" data-cycle-id="' + esc(cycle.id) + '"><h4>Atualizar meu progresso</h4><div class="community-progress-fields"><label class="f">Percentual<input name="percent" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="Ex.: 35"></label><label class="f">Páginas lidas<input name="pages" type="number" min="0" step="1" inputmode="numeric" placeholder="Ex.: 120"></label><label class="f">Total de páginas<input name="total_pages" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex.: 340"></label></div><label class="f">Comentário <span class="m">opcional</span><textarea name="note" maxlength="500" rows="2" placeholder="Como está sendo a leitura?"></textarea></label><button class="btn" type="submit">Compartilhar progresso</button></form></section>'
        : "";
      var summaryContent = cycle.status === "nominations"
        ? '<p class="m">' + Number(cycle.candidate_count || 0) + (Number(cycle.candidate_count || 0) === 1 ? " livro indicado" : " livros indicados") + " neste ciclo.</p>"
        : cycle.status === "reading"
          ? '<p class="m">' + Number(cycle.progress_count || 0) + (Number(cycle.progress_count || 0) === 1 ? " atualização de progresso" : " atualizações de progresso") + " compartilhadas.</p>"
          : "";
      var detailsButton = !details && cycle.status !== "closed"
        ? '<div class="community-cycle-details-action">' +
          (detailError ? '<p class="m">Não foi possível carregar os detalhes deste ciclo.</p>' : "") +
          '<button class="btn sm" type="button" data-community-action="load-cycle-details" data-cycle-id="' + esc(cycle.id) + '">' +
          (cycle.status === "nominations" ? "Ver indicações e sugerir livros" : "Ver progresso do grupo") +
          "</button></div>"
        : "";
      var loadedContent = cycle.status === "nominations"
        ? candidatesHtml + nominationForm
        : progressSection;

      return (
        '<section class="community-cycle"><header class="community-cycle-header"><div><h3>' +
        esc(monthLabel(cycle.cycle_month)) +
        '</h3><span class="badge">' + esc(status) + "</span></div>" +
        (cycle.status === "nominations" ? '<span class="m">' + Number(cycle.candidate_count || 0) + (Number(cycle.candidate_count || 0) === 1 ? " livro indicado" : " livros indicados") + "</span>" : "") +
        "</header>" + selectedBook + summaryContent + detailsButton + (details ? loadedContent : "") + "</section>"
      );
    }

    function groupHtml(group, data) {
      var cycles = data.cycles.filter(function (cycle) { return cycle.group_id === group.id; });
      var isOwner = group.role === "owner";
      var cycleList = cycles.slice(0, 6).map(function (cycle) {
        return cycleHtml(group, cycle, data, isOwner);
      }).join("");
      var startCycle = isOwner
        ? '<details class="community-open-cycle"><summary>' + (cycles.length ? "Abrir outro ciclo de leitura" : "Abrir ciclo de leitura") + '</summary><form data-community-form="open-cycle" data-group-id="' + esc(group.id) + '"><label class="f">Mês do ciclo<input type="month" name="month" min="' + esc(monthValue()) + '" value="' + esc(nextAvailableMonth(cycles)) + '" required></label><p class="m">Você pode escolher o livro agora ou abrir indicações para o grupo.</p><div class="community-book-fields"><label class="f">Livro definido agora <span class="m">opcional</span><input class="grow" name="title" maxlength="160"></label><label class="f">Autor<input class="grow" name="author" maxlength="120"></label></div><label class="f">ISBN <span class="m">opcional</span><input class="grow" name="isbn" maxlength="20" inputmode="numeric"></label><button class="btn" type="submit">Criar ciclo</button></form></details>'
        : "";
      var content = cycles.length
        ? cycleList + (Number(cycles[0].total_cycle_count || 0) > cycles.length ? '<p class="m">Mostrando os seis ciclos mais recentes.</p>' : "")
        : '<p class="empty">' + (isOwner ? "Abra o primeiro ciclo para escolher o livro do mês ou receber indicações." : "A pessoa responsável ainda não abriu um ciclo de leitura.") + "</p>";

      return (
        '<article class="card community-group-card"><header class="community-group-header"><div><p class="eyebrow">' +
        (isOwner ? "Grupo que você administra" : "Seu grupo de leitura") +
        '</p><h2>' + esc(group.name) + '</h2>' +
        (group.description ? '<p class="m">' + esc(group.description) + "</p>" : "") +
        '</div><div class="community-invite"><span class="m">Código de convite</span><strong>' + esc(group.invite_code) + '</strong></div></header><div class="community-cycle-list">' + content + "</div>" + startCycle + "</article>"
      );
    }

    async function communityPage(userId) {
      var data = await repository.loadPage(userId);
      var profile = data.profile;
      var feedHtml = data.errors.posts
        ? '<p class="m">Não foi possível carregar as publicações agora. Tente atualizar a tela.</p>'
        : data.posts.length
          ? data.posts.map(function (post) { return postHtml(post); }).join("")
          : '<p class="empty">Ainda não há publicações. Seja a primeira pessoa a compartilhar uma leitura.</p>';
      var postStatsNotice = data.errors.postStats
        ? '<p class="m">As contagens de curtidas e comentários estão temporariamente indisponíveis.</p>'
        : "";
      var feedPagination = !data.errors.posts && data.hasMorePosts
        ? '<div class="community-feed-more"><button class="btn" type="button" data-community-action="load-more">Carregar mais publicações</button></div>'
        : "";
      var groupsHtml = data.errors.groups
        ? '<p class="m">Não foi possível carregar seus grupos de leitura.</p>'
        : data.groups.length
          ? data.groups.map(function (group) { return groupHtml(group, data); }).join("")
          : '<p class="empty">Você ainda não participa de um grupo de leitura. Crie um grupo ou entre com um código de convite.</p>';
      if (data.errors.cycles) {
        groupsHtml = '<p class="m">Não foi possível carregar os ciclos de leitura agora.</p>' + groupsHtml;
      }
      if (data.errors.related) {
        groupsHtml = '<p class="m">Alguns dados de indicações ou progresso não puderam ser carregados.</p>' + groupsHtml;
      }

      var postCount = data.posts.length +
        (data.posts.length === 1 ? " publicação" : " publicações");
      var heroHtml =
        '<section class="community-hero" aria-labelledby="community-hero-title">' +
        '<div class="community-hero-copy"><p class="community-hero-kicker">UM CLUBE PARA QUEM AMA HISTÓRIAS</p>' +
        '<h2 id="community-hero-title">Livros abrem conversas que continuam.</h2>' +
        '<p>Divida ideias, encontre pessoas que leem como você e descubra outros mundos pelo olhar de cada leitor.</p>' +
        '<a class="community-hero-link" href="#community-composer">Começar uma conversa <span aria-hidden="true">↓</span></a></div>' +
        '<div class="community-hero-art" aria-hidden="true"><span class="community-hero-orbit community-hero-orbit-one"></span>' +
        '<span class="community-hero-orbit community-hero-orbit-two"></span><div class="community-hero-book">' +
        '<span class="community-hero-page community-hero-page-left"></span><span class="community-hero-page community-hero-page-right"></span>' +
        '<span class="community-hero-spine"></span></div><span class="community-hero-spark">✦</span>' +
        '<span class="community-hero-note">ler · trocar<br>· imaginar</span></div></section>';
      var feedSectionHtml =
        '<section class="community-feed" aria-labelledby="community-feed-title"><div class="community-section-heading">' +
        '<div><p class="eyebrow">IDEIAS EM CIRCULAÇÃO</p><h2 id="community-feed-title">Da comunidade</h2>' +
        '<p class="m">Leituras, perguntas e descobertas compartilhadas.</p></div>' +
        '<span class="community-feed-count">' + esc(postCount) + '</span></div>' +
        postStatsNotice +
        '<div class="community-feed-list">' + feedHtml + '</div>' + feedPagination + '</section>';
      var groupDiscoveryHtml =
        '<section class="card community-group-discovery"><div class="community-section-heading"><div>' +
        '<p class="eyebrow">LEITURA EM COMPANHIA</p><h2>Encontre seu grupo</h2></div>' +
        '<p class="m">Escolham um livro, avancem juntos e conversem sobre cada capítulo.</p></div>' +
        '<div class="community-group-join-grid"><form data-community-form="create-group"><h3>Criar grupo</h3>' +
        '<label class="f">Nome do grupo<input class="grow" name="name" minlength="2" maxlength="60" required></label>' +
        '<label class="f">Descrição <span class="m">opcional</span><textarea name="description" maxlength="500" rows="2"></textarea></label>' +
        '<button class="btn pri" type="submit">Criar grupo</button></form>' +
        '<form data-community-form="join-group"><h3>Entrar em um grupo</h3>' +
        '<label class="f">Código de convite<input class="grow community-code-input" name="invite_code" minlength="8" maxlength="16" ' +
        'pattern="([A-Za-z0-9]{8}|[A-Fa-f0-9]{16})" title="Informe um código antigo de 8 caracteres ou um novo código de 16 caracteres hexadecimais" ' +
        'autocomplete="off" autocapitalize="characters" required></label>' +
        '<p class="m">Convites antigos de 8 caracteres continuam válidos.</p>' +
        '<button class="btn" type="submit">Entrar no grupo</button></form></div></section>';
      var groupsSectionHtml =
        '<section class="community-groups" aria-labelledby="community-groups-title"><div class="community-section-heading">' +
        '<div><p class="eyebrow">CÍRCULOS DE LEITURA</p><h2 id="community-groups-title">Seus grupos</h2></div>' +
        '</div>' + groupsHtml + '</section>';

      return (
        head("Comunidade", "Leituras que viram conversa, amizade e novas descobertas.") +
        '<div class="community-page">' + heroHtml +
        '<div class="community-layout"><main class="community-main" aria-label="Publicações e conversas">' +
        postComposer(profile) +
        feedSectionHtml + '</main>' +
        '<aside class="community-sidebar" aria-label="Seu espaço na comunidade">' +
        profileCard(profile) +
        groupDiscoveryHtml +
        groupsSectionHtml + '</aside></div></div>'
      );
    }

    return Object.freeze({ communityPage: communityPage });
  }

  window.DesvelarCommunityViews = Object.freeze({ create: create });
})();
