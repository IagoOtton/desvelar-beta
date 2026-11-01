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
        '<section class="card community-profile"><div><h2>Seu perfil de leitor</h2><p class="m">' +
        (saved
          ? "Este nome e esta apresentação aparecem nas suas publicações e grupos."
          : "Escolha como as outras pessoas vão reconhecer você na comunidade.") +
        '</p></div><form data-community-form="profile" class="community-profile-form"><label class="f">Nome exibido<input class="grow" name="display_name" minlength="2" maxlength="40" autocomplete="nickname" value="' +
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
        return '<section class="card"><h2>Compartilhe uma leitura</h2><p class="empty">Crie seu perfil de leitor acima para publicar na comunidade.</p></section>';
      }
      return (
        '<section class="card"><h2>Compartilhe com os leitores</h2><form data-community-form="post" class="community-post-form"><label class="f">O que você está lendo ou pensando?<textarea name="body" maxlength="1500" rows="4" placeholder="Conte uma descoberta, faça uma pergunta ou compartilhe seu progresso…" required></textarea></label><div class="community-book-fields"><label class="f">Livro relacionado <span class="m">opcional</span><input class="grow" name="book_title" maxlength="160" placeholder="Título"></label><label class="f">Autor<input class="grow" name="book_author" maxlength="120" placeholder="Nome do autor"></label></div><div class="rowflex community-submit-row"><span class="m">Sua publicação será visível para leitores autenticados.</span><button class="btn pri" type="submit">Publicar</button></div></form></section>'
      );
    }

    function postHtml(post, userId) {
      var comments = Array.isArray(post.community_post_comments)
        ? post.community_post_comments.slice().sort(function (a, b) {
            return new Date(a.created_at) - new Date(b.created_at);
          })
        : [];
      var reactions = Array.isArray(post.community_post_reactions)
        ? post.community_post_reactions
        : [];
      var reacted = reactions.some(function (reaction) {
        return reaction.user_id === userId;
      });
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
        reactions.length +
        " curtidas</button><span class="m">" +
        comments.length +
        (comments.length === 1 ? " comentário" : " comentários") +
        '</span></div><div class="community-comments-area"><h3>Conversa</h3>' +
        commentsHtml +
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
      return (
        '<ul class="community-progress-list">' +
        entries
          .slice(0, 8)
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
          "</ul>"
      );
    }

    function cycleHtml(group, cycle, data, isOwner) {
      var candidates = data.candidates.filter(function (item) { return item.cycle_id === cycle.id; });
      var nominations = data.nominations.filter(function (item) { return item.cycle_id === cycle.id; });
      var progress = data.progress.filter(function (item) { return item.cycle_id === cycle.id; });
      var status = cycle.status === "nominations" ? "Indicações abertas" : cycle.status === "reading" ? "Leitura em andamento" : "Ciclo encerrado";
      var selectedBook = cycle.selected_title
        ? '<div class="community-selected-book"><span class="m">Livro do mês</span><strong>' + esc(cycle.selected_title) + "</strong>" + (cycle.selected_author ? '<span class="m">' + esc(cycle.selected_author) + "</span>" : "") + "</div>"
        : "";
      var candidatesHtml = candidates.length
        ? '<ul class="community-candidate-list">' + candidates.map(function (candidate) {
            var count = nominations.filter(function (item) { return item.candidate_id === candidate.id; }).length;
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

      return (
        '<section class="community-cycle"><header class="community-cycle-header"><div><h3>' +
        esc(monthLabel(cycle.cycle_month)) +
        '</h3><span class="badge">' + esc(status) + "</span></div>" +
        (cycle.status === "nominations" ? '<span class="m">' + candidates.length + (candidates.length === 1 ? " livro indicado" : " livros indicados") + "</span>" : "") +
        "</header>" + selectedBook + (cycle.status === "nominations" ? candidatesHtml + nominationForm : progressSection) + "</section>"
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
        ? cycleList + (cycles.length > 6 ? '<p class="m">Mostrando os seis ciclos mais recentes.</p>' : "")
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
          ? data.posts.map(function (post) { return postHtml(post, userId); }).join("")
          : '<p class="empty">Ainda não há publicações. Seja a primeira pessoa a compartilhar uma leitura.</p>';
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

      return (
        head("Comunidade", "Compartilhe leituras e acompanhe um livro junto com outras pessoas.") +
        '<div class="community-stack">' +
        profileCard(profile) +
        '<section class="card"><div class="community-section-heading"><div><p class="eyebrow">Encontre leitores</p><h2>Grupos de leitura</h2></div><p class="m">Crie um espaço para escolher o livro do mês e avançar em conjunto.</p></div><div class="community-group-join-grid"><form data-community-form="create-group"><h3>Criar grupo</h3><label class="f">Nome do grupo<input class="grow" name="name" minlength="2" maxlength="60" required></label><label class="f">Descrição <span class="m">opcional</span><textarea name="description" maxlength="500" rows="2"></textarea></label><button class="btn pri" type="submit">Criar grupo</button></form><form data-community-form="join-group"><h3>Entrar em um grupo</h3><label class="f">Código de convite<input class="grow community-code-input" name="invite_code" maxlength="8" minlength="8" autocomplete="off" autocapitalize="characters" required></label><p class="m">Peça o código a alguém que já participa do grupo.</p><button class="btn" type="submit">Entrar no grupo</button></form></div></section>' +
        '<section class="community-groups"><div class="community-section-heading"><div><p class="eyebrow">Leitura compartilhada</p><h2>Seus grupos</h2></div></div>' + groupsHtml + '</section>' +
        postComposer(profile) +
        '<section class="community-feed"><div class="community-section-heading"><div><p class="eyebrow">Conversa entre leitores</p><h2>Publicações recentes</h2></div><span class="m">' + data.posts.length + (data.posts.length === 1 ? " publicação" : " publicações") + "</span></div>" + feedHtml + "</section></div>"
      );
    }

    return Object.freeze({ communityPage: communityPage });
  }

  window.DesvelarCommunityViews = Object.freeze({ create: create });
})();
