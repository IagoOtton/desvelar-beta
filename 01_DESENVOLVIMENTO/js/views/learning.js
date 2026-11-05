(function () {
  "use strict";
  var DIFL = [
    "",
    "1 · muito fácil",
    "2 · fácil",
    "3 · médio",
    "4 · difícil",
    "5 · muito difícil",
  ];

  function create(dependencies) {
    var required = [
      "getState",
      "today",
      "wkStart",
      "addDays",
      "fmtD",
      "fmtM",
      "esc",
      "chip",
      "tagInput",
      "topicField",
      "studyTypeField",
      "studyTypeLabel",
      "isReviewDue",
      "head",
      "sum",
      "tkey",
      "groupMin",
      "pagesRange",
      "pagesRangeBook",
      "bookLog",
      "barChart",
      "brainGraph",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error(
        "As dependências das telas acadêmicas não foram informadas.",
      );
    }
    function diffPill(n) {
      var safeValue = dependencies.esc(n);
      return '<span class="dif d' + safeValue + '">' + safeValue + "/5</span>";
    }

    function themesPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        ws = dependencies.wkStart(t),
        we = dependencies.addDays(ws, 6),
        all = state.themes;
      var wk = all.filter(function (x) {
          return x.date >= ws && x.date <= we;
        }).length,
        avg = all.length
          ? dependencies.sum(all, function (x) {
              return x.diff;
            }) / all.length
          : 0;
      var rev = all
        .filter(function (x) {
          return dependencies.isReviewDue(x, t);
        })
        .sort(function (a, b) {
          return (a.nextReview || a.date).localeCompare(b.nextReview || b.date);
        });
      var upcoming = all
        .filter(function (x) {
          return typeof x.nextReview === "string" && x.nextReview > t;
        })
        .sort(function (a, b) {
          return a.nextReview.localeCompare(b.nextReview);
        });
      var g = {};
      all.forEach(function (x) {
        var k = dependencies.tkey(x.tag);
        g[k] = g[k] || { n: 0, s: 0 };
        g[k].n++;
        g[k].s += x.diff;
      });
      var gr = Object.keys(g)
        .map(function (k) {
          return { k: k, n: g[k].n, a: g[k].s / g[k].n };
        })
        .sort(function (a, b) {
          return b.a - a.a;
        });
      var rec = all
        .slice()
        .sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        })
        .slice(0, 20);
      var li = function (x, rv, displayDate) {
        var dateLabel = rv
          ? x.nextReview && x.nextReview < t
            ? "Atrasada · " + dependencies.fmtD(x.nextReview)
            : "Hoje"
          : dependencies.fmtD(displayDate || x.date);
        var reviewButtons = rv
          ? '<div class="study-review-actions" role="group" aria-label="Como você lembrou de ' +
            dependencies.esc(x.title) +
            '"><button class="btn sm dng" data-a="th-review" data-id="' +
            dependencies.esc(x.id) +
            '" data-result="again">Não lembrei</button><button class="btn sm" data-a="th-review" data-id="' +
            dependencies.esc(x.id) +
            '" data-result="effort">Com esforço</button><button class="btn sm pri" data-a="th-review" data-id="' +
            dependencies.esc(x.id) +
            '" data-result="easy">Fácil</button></div>'
          : "";
        return (
          '<li' +
          (rv ? ' class="study-review-item"' : "") +
          '><span class="m num">' +
          dependencies.esc(dateLabel) +
          '</span><span class="t">' +
          dependencies.esc(x.title) +
          '<div class="m">' +
          dependencies.chip(x.tag) +
          (!rv && x.note ? " · " + dependencies.esc(x.note) : "") +
          "</div>" +
          (rv && x.note
            ? '<details class="study-review-note"><summary>Conferir observação</summary><p>' +
              dependencies.esc(x.note) +
              "</p></details>"
            : "") +
          "</span>" +
          diffPill(x.diff) +
          '<button class="ico" data-a="del" data-k="themes" data-id="' +
          dependencies.esc(x.id) +
          '" aria-label="Apagar tema">×</button>' +
          reviewButtons +
          "</li>"
        );
      };
      return (
        dependencies.head(
          "Temas estudados",
          "Registre o que estudou e transforme temas difíceis em revisões espaçadas, com intervalos que se ajustam ao seu resultado.",
        ) +
        '<div class="card"><h2>Registrar tema</h2><form class="row" data-form="theme"><label class="f grow">Assunto<input id="th-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Ciclo cardíaco"></label>' +
        '<label class="f grow">Matéria' +
        dependencies.tagInput("th-tag", "ex.: Fisiologia") +
        "</label>" +
        '<label class="f">Dificuldade<select id="th-diff" name="diff">' +
        [1, 2, 3, 4, 5]
          .map(function (n) {
            return (
              '<option value="' +
              n +
              '"' +
              (n === 3 ? " selected" : "") +
              ">" +
              DIFL[n] +
              "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<label class="f">Data<input id="th-date" type="date" name="date" value="' +
        t +
        '" required></label>' +
        '<label class="f grow">Observação (opcional)<input id="th-note" class="grow" name="note" maxlength="140" placeholder="ex.: confundo as raízes"></label>' +
        '<button class="btn pri" type="submit">Registrar</button></form></div>' +
        '<div class="tiles"><div class="tile"><div class="l">Temas na semana</div><div class="v num">' +
        wk +
        '</div><div class="n">estudados</div></div>' +
        '<div class="tile"><div class="l">Total registrado</div><div class="v num">' +
        all.length +
        '</div><div class="n">temas</div></div>' +
        '<div class="tile"><div class="l">Dificuldade média</div><div class="v num">' +
        (all.length ? avg.toFixed(1) : "–") +
        '</div><div class="n">de 5</div></div>' +
        '<div class="tile"><div class="l">Para revisar hoje</div><div class="v num">' +
        rev.length +
        '</div><div class="n">' +
        upcoming.length +
        ' futuras agendadas</div></div></div>' +
        '<div class="card"><h2>Mapa de conhecimento</h2>' +
        dependencies.brainGraph(360) +
        "</div>" +
        '<div class="card"><h2>Revisões para hoje</h2>' +
        '<p class="m study-review-guidance">Tente explicar o assunto sem consultar suas anotações. Não lembrei: amanhã; com esforço: a partir de 3 dias; fácil: a partir de 7. Intervalos maiores crescem quando você lembra bem.</p>' +
        (rev.length
          ? '<ul class="list">' +
            rev
              .map(function (x) {
                return li(x, true);
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhuma revisão pendente. Os temas difíceis entram na fila automaticamente.</p>') +
        "</div>" +
        '<div class="grid"><div class="card"><h2>Próximas revisões</h2>' +
        (upcoming.length
          ? '<ul class="list">' +
            upcoming
              .slice(0, 5)
              .map(function (x) {
                return li(x, false, x.nextReview);
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Você ainda não tem revisões agendadas.</p>') +
        "</div>" +
        '<div class="card"><h2>Dificuldade média por matéria</h2>' +
        (gr.length
          ? gr
              .map(function (r) {
                return (
                  '<div class="acc"><span>' +
                  dependencies.chip(r.k) +
                  '</span><div class="bar"><b style="width:' +
                  Math.round((r.a / 5) * 100) +
                  '%"></b></div><span class="m num">' +
                  r.a.toFixed(1) +
                  " · " +
                  dependencies.esc(r.n) +
                  "</span></div>"
                );
              })
              .join("")
          : '<p class="empty">Sem temas ainda.</p>') +
        "</div></div>" +
        '<div class="card"><h2>Últimos temas</h2>' +
        (rec.length
          ? '<ul class="list">' +
            rec
              .map(function (x) {
                return li(x, false);
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhum tema registrado.</p>') +
        "</div>"
      );
    }

    function studyPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        ws = dependencies.wkStart(t),
        we = dependencies.addDays(ws, 6),
        g = dependencies.groupMin(ws, we);
      var tot = Math.max.apply(
        null,
        g
          .map(function (r) {
            return r.m;
          })
          .concat([1]),
      );
      var rec = state.sessions
        .slice()
        .sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        })
        .slice(0, 25);
      return (
        dependencies.head(
          "Estudos",
          "Todo bloco conta. Continue de onde parou.",
        ) +
        '<div class="study-overview"><div class="study-overview-primary">' +
        '<section class="card study-session-form-card"><p class="study-eyebrow">Nova sessão</p><h2>O que você vai estudar?</h2><p class="study-card-description">Guarde matéria, assunto e tempo em um só lugar.</p><form class="row study-session-form" data-form="session">' +
        '<label class="f grow">Matéria' +
        dependencies.tagInput("s-tag", "ex.: Biologia, Inglês") +
        "</label>" +
        dependencies
          .topicField("s-topic", "ex.: Ciclo celular")
          .replace("Assunto (opcional)", "Assunto") +
        dependencies
          .studyTypeField("s-type")
          .replace("Tipo (opcional)", "Tipo de estudo") +
        '<label class="f">Minutos<input id="s-min" type="number" name="min" min="1" max="720" value="60" required></label>' +
        '<label class="f">Data<input id="s-date" type="date" name="date" value="' +
        t +
        '" required></label>' +
        '<label class="f grow">Anotação (opcional)<input id="s-note" class="grow" name="note" maxlength="120" placeholder="Ponto que quero lembrar"></label>' +
        '<button class="btn pri" type="submit">Registrar sessão</button></form></section>' +
        '<section class="card study-weekly-card"><h2><span class="study-week-title-desktop">Semana por matéria</span><span class="study-week-title-mobile">Esta semana</span></h2>' +
        '<div class="study-week-rows">' +
        (g.length
          ? g
              .map(function (r) {
                return (
                  '<div class="study-week-row"><div class="study-week-label">' +
                  dependencies.chip(r.k) +
                  '<span class="m num">' +
                  dependencies.fmtM(r.m) +
                  '</span></div><div class="bar"><b style="width:' +
                  Math.round((r.m / tot) * 100) +
                  '%"></b></div></div>'
                );
              })
              .join("")
          : '<p class="empty">Nada registrado nesta semana.</p>') +
        '</div><p class="study-week-caption">Minutos registrados nesta semana</p></section></div>' +
        '<section class="card study-history-card"><header class="study-history-header"><h2>Últimas sessões</h2><span class="study-eyebrow">Histórico recente</span></header>' +
        (rec.length
          ? '<ul class="list study-session-list">' +
            rec
              .map(function (x) {
                var studyType = dependencies.studyTypeLabel(x.studyType);
                return (
                  '<li class="study-session-row"><span class="study-session-date m num">' +
                  dependencies.fmtD(x.date) +
                  '</span><span class="t study-session-content"><strong class="study-session-subject">' +
                  dependencies.esc(x.tag || "Estudo") +
                  '</strong>' +
                  (x.topic
                    ? '<span class="study-session-topic">' + dependencies.esc(x.topic) + "</span>"
                    : "") +
                  (studyType || x.note
                    ? '<span class="study-session-extra">' +
                      (studyType ? dependencies.esc(studyType) : "") +
                      (studyType && x.note ? " · " : "") +
                      (x.note ? dependencies.esc(x.note) : "") +
                      "</span>"
                    : "") +
                  '</span>' +
                  (x.incomplete
                    ? '<span class="session-status session-status--incomplete">Bloco incompleto</span>'
                    : '<span class="study-session-status-spacer" aria-hidden="true"></span>') +
                  '<span class="study-session-duration num">' +
                  dependencies.fmtM(x.min) +
                  '</span><button class="ico study-session-delete" data-a="del" data-k="sessions" data-id="' +
                  dependencies.esc(x.id) +
                  '" aria-label="Apagar sessão">×</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhuma sessão ainda.</p>') +
        '</section></div><aside class="study-privacy-note"><div><strong>Seu progresso de Estudos é privado.</strong><span>Ele fica associado à sua conta e não é compartilhado automaticamente na comunidade.</span></div><a href="./privacidade.html">Privacidade e segurança</a></aside>'
      );
    }


    function mistakesPage() {
      var state = dependencies.getState();
      var today = dependencies.today();
      var mistakes = state.mistakes || [];
      var pending = mistakes
        .filter(function (item) {
          return !item.resolved;
        })
        .sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
      var resolved = mistakes
        .filter(function (item) {
          return item.resolved;
        })
        .sort(function (a, b) {
          return (b.resolvedAt || b.date || "").localeCompare(
            a.resolvedAt || a.date || "",
          );
        });

      function mistakeCard(item, isResolved) {
        return (
          '<article class="study-mistake"><div class="study-mistake-meta"><span class="m num">' +
          (item.date ? dependencies.fmtD(item.date) : "Sem data") +
          "</span>" +
          dependencies.chip(item.tag) +
          (item.topic
            ? '<span class="m">' + dependencies.esc(item.topic) + "</span>"
            : "") +
          (isResolved && item.resolvedAt
            ? '<span class="m">Entendido em ' +
              dependencies.fmtD(item.resolvedAt) +
              "</span>"
            : "") +
          '</div><p class="study-mistake-question">' +
          dependencies.esc(item.question) +
          '</p><details class="study-mistake-details"><summary>Conferir minha reflexão e a resposta</summary><div class="study-mistake-explanation"><p><strong>O que me levou ao erro</strong><span>' +
          dependencies.esc(item.reason) +
          '</span></p><p><strong>Resposta correta e explicação</strong><span>' +
          dependencies.esc(item.answer) +
          '</span></p></div></details><div class="study-mistake-actions"><button class="btn sm ' +
          (isResolved ? "" : "pri") +
          '" data-a="' +
          (isResolved ? "mistake-reopen" : "mistake-resolve") +
          '" data-id="' +
          dependencies.esc(item.id) +
          '">' +
          (isResolved ? "Revisar novamente" : "Marcar como entendido") +
          '</button><button class="ico" data-a="del" data-k="mistakes" data-id="' +
          dependencies.esc(item.id) +
          '" aria-label="Excluir erro">×</button></div></article>'
        );
      }

      return (
        dependencies.head(
          "Caderno de erros",
          "Transforme questões erradas em pontos claros para revisar e aprender.",
        ) +
        '<div class="tiles"><div class="tile"><div class="l">Para revisar</div><div class="v num">' +
        pending.length +
        '</div><div class="n">erros em aberto</div></div><div class="tile"><div class="l">Já entendi</div><div class="v num">' +
        resolved.length +
        '</div><div class="n">erros resolvidos</div></div></div>' +
        '<div class="card"><p class="m study-mistake-guidance">Registre o enunciado, o que te confundiu e a explicação correta. Na revisão, tente responder antes de abrir a solução.</p><h2>Adicionar um erro</h2><form class="row study-mistake-form" data-form="mistake"><label class="f grow">Questão ou ponto que errei<textarea name="question" maxlength="1000" required placeholder="Escreva a questão ou o conceito que você errou"></textarea></label>' +
        '<div class="study-mistake-fields">' +
        dependencies.tagInput("mistake-tag", "ex.: Biologia") +
        dependencies.topicField("mistake-topic", "ex.: Mitose") +
        '</div><label class="f grow">O que me levou ao erro?<textarea name="reason" maxlength="600" required placeholder="ex.: confundi a metáfase com a anáfase"></textarea></label><label class="f grow">Resposta correta e explicação<textarea name="answer" maxlength="1600" required placeholder="Registre o raciocínio que ajuda você a acertar na próxima vez"></textarea></label><label class="f">Data<input type="date" name="date" value="' +
        today +
        '" required></label><button class="btn pri" type="submit">Salvar no caderno</button></form></div>' +
        '<div class="grid study-mistake-columns"><div class="card"><h2>Revisões pendentes (' +
        pending.length +
        ")</h2>" +
        (pending.length
          ? '<div class="study-mistake-list">' +
            pending
              .map(function (item) {
                return mistakeCard(item, false);
              })
              .join("") +
            "</div>"
          : '<p class="empty">Nenhum erro pendente. Quando errar uma questão, registre aqui para revisar depois.</p>') +
        '</div><div class="card"><h2>Revisados (' +
        resolved.length +
        ")</h2>" +
        (resolved.length
          ? '<div class="study-mistake-list">' +
            resolved
              .map(function (item) {
                return mistakeCard(item, true);
              })
              .join("") +
            "</div>"
          : '<p class="empty">Os erros que você marcar como entendidos aparecerão aqui.</p>') +
        "</div></div>"
      );
    }

    function readingPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        ws = dependencies.wkStart(t),
        we = dependencies.addDays(ws, 6);
      var currentYear = t.slice(0, 4);
      var readingSettings = state.readingSettings || {
        annualGoal: 12,
        dailyPageGoal: 10,
      };
      var annualGoal = Number(readingSettings.annualGoal) || 12;
      var dailyPageGoal = Number(readingSettings.dailyPageGoal) || 10;
      var pagesToday = dependencies.pagesRange(t, t);
      var dailyProgress = Math.min(
        100,
        Math.round((pagesToday / dailyPageGoal) * 100),
      );
      var streakDate = pagesToday >= dailyPageGoal ? t : dependencies.addDays(t, -1);
      var readingStreak = 0;
      while (readingStreak <= state.readlog.length) {
        if (dependencies.pagesRange(streakDate, streakDate) < dailyPageGoal) break;
        readingStreak++;
        streakDate = dependencies.addDays(streakDate, -1);
      }
      var dailyGoalHint = pagesToday >= dailyPageGoal
        ? "Meta diária alcançada."
        : "Faltam " + (dailyPageGoal - pagesToday) + " páginas para alcançar a meta.";
      var streakHint = pagesToday < dailyPageGoal && readingStreak
        ? "Sua sequência segue ativa até o fim do dia."
        : "A sequência considera dias que atingiram a meta atual.";
      var finishedThisYear = state.books.filter(function (book) {
        return book.status === "completed" &&
          typeof book.finishedAt === "string" &&
          book.finishedAt.slice(0, 4) === currentYear;
      }).length;
      var annualProgress = Math.min(100, Math.round((finishedThisYear / annualGoal) * 100));
      var statusLabels = {
        planned: "Quero ler",
        reading: "Lendo",
        paused: "Pausado",
        completed: "Concluído",
        abandoned: "Abandonei",
      };
      var d14 = [];
      for (var i = 13; i >= 0; i--) {
        var d = dependencies.addDays(t, -i);
        d14.push({ l: dependencies.fmtD(d).slice(0, 5), v: dependencies.pagesRange(d, d) });
      }
      var p14 = dependencies.sum(d14, function (x) {
          return x.v;
        }),
        withMin = state.readlog.filter(function (r) {
          return r.min > 0;
        });
      var pph = withMin.length
        ? Math.round(
            dependencies.sum(withMin, function (r) {
              return r.pages;
            }) /
              (dependencies.sum(withMin, function (r) {
                return r.min;
              }) /
                60),
          )
        : 0;
      var statusOrder = { reading: 0, planned: 1, paused: 2, completed: 3, abandoned: 4 };
      var cards = state.books
        .slice()
        .sort(function (a, b) {
          var orderA = statusOrder[a.status] === undefined ? 5 : statusOrder[a.status];
          var orderB = statusOrder[b.status] === undefined ? 5 : statusOrder[b.status];
          return orderA - orderB ||
            String(a.title || "").localeCompare(String(b.title || ""), "pt-BR");
        })
        .map(function (b) {
          var p = b.total
              ? Math.min(100, Math.round((b.read / b.total) * 100))
              : 0,
            lg = dependencies.bookLog(b),
            status = statusLabels[b.status] ? b.status : "planned",
            fin = status === "completed",
            last = lg[lg.length - 1];
          var rate = dependencies.pagesRangeBook(b, dependencies.addDays(t, -13), t) / 14,
            rem = b.total - b.read;
          var eta = fin
            ? "concluído"
            : rate > 0
              ? "~" + Math.ceil(rem / rate) + " dias"
              : "sem ritmo recente";
          var avg = lg.length
            ? Math.round(
                dependencies.sum(lg, function (r) {
                  return r.pages;
                }) / lg.length,
              )
            : 0;
          var hist = lg
            .slice(-5)
            .reverse()
            .map(function (r) {
              return (
                '<li><span class="m num">' +
                dependencies.fmtD(r.date) +
                '</span><span class="t">p.' +
                dependencies.esc(r.from) +
                " → p." +
                dependencies.esc(r.to) +
                ' <span class="m">· +' +
                dependencies.esc(r.pages) +
                " págs" +
                (r.min ? " · " + dependencies.esc(r.min) + " min" : "") +
                "</span></span>" +
                (r.note
                  ? '<span class="reading-log-note">' + dependencies.esc(r.note) + "</span>"
                  : "") +
                (last && r.id === last.id
                  ? '<button class="ico" data-a="del-read" data-id="' +
                    dependencies.esc(r.id) +
                    '" aria-label="Desfazer esta leitura">×</button>'
                  : "") +
                "</li>"
              );
            })
            .join("");
          return (
            '<div class="card book" data-book-card data-book-status="' + dependencies.esc(status) + '"><div class="rowflex" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><h3>' +
            dependencies.esc(b.title) +
            "</h3>" +
            (b.author ? '<p class="book-author">' + dependencies.esc(b.author) + "</p>" : "") +
            (b.tag ? dependencies.chip(b.tag) : "") +
            ' <span class="badge book-status-badge">' +
            dependencies.esc(statusLabels[status]) +
            "</span>" +
            '</div><button class="ico" data-a="del" data-k="books" data-id="' +
            dependencies.esc(b.id) +
            '" aria-label="Remover leitura">×</button></div>' +
            '<div class="bar"><b style="width:' +
            p +
            '%"></b></div>' +
            '<div class="stats"><div><b class="num">p.' +
            dependencies.esc(b.read) +
            " / " +
            dependencies.esc(b.total) +
            "</b>" +
            p +
            "%</div><div><b>" +
            lg.length +
            "</b>leituras</div><div><b>" +
            (avg || "–") +
            "</b>págs por leitura</div><div><b>" +
            eta +
            "</b>previsão (ritmo de 14 dias)</div></div>" +
            '<form class="row book-status-form" data-form="book-status"><input type="hidden" name="id" value="' +
            dependencies.esc(b.id) +
            '"><label class="f">Estante<select name="status">' +
            Object.keys(statusLabels).map(function (value) {
              return '<option value="' + value + '"' + (status === value ? " selected" : "") + ">" + statusLabels[value] + "</option>";
            }).join("") +
            "</select></label>" +
            (status === "completed"
              ? '<label class="f">Concluído em <span class="m">opcional, para a meta anual</span><input type="date" name="finishedAt" value="' + dependencies.esc(b.finishedAt || "") + '"></label>'
              : "") +
            '<button class="btn sm" type="submit">Salvar estante</button></form>' +
            (fin
              ? ""
              : '<form class="row" data-form="read"><input type="hidden" name="id" value="' +
                dependencies.esc(b.id) +
                '"><label class="f">Parei na página<input id="r-' +
                dependencies.esc(b.id) +
                '" type="number" name="to" min="' +
                dependencies.esc(Number(b.read) + 1) +
                '" max="' +
                dependencies.esc(b.total) +
                '" placeholder="' +
                dependencies.esc(Number(b.read) + 1) +
                '+" required></label><label class="f">Minutos (opcional)<input id="rm-' +
                dependencies.esc(b.id) +
                '" type="number" name="min" min="1" max="720"></label><label class="f">Data<input id="rd-' +
                dependencies.esc(b.id) +
                '" type="date" name="date" value="' +
                t +
                '" required></label><details class="reading-note-editor"><summary>Anotar esta leitura <span class="m">opcional</span></summary><label class="f">Nota privada<textarea name="note" maxlength="600" rows="2" placeholder="Uma ideia, trecho ou impressão para lembrar…"></textarea></label></details><button class="btn pri" type="submit">Registrar leitura</button></form>') +
            '<details class="book-review"><summary>Dados e avaliação privada' +
            (b.rating ? ' · ' + dependencies.esc("★".repeat(b.rating)) : "") +
            '</summary><form class="row" data-form="book-review"><input type="hidden" name="id" value="' +
            dependencies.esc(b.id) +
            '"><label class="f grow">Autor <span class="m">Só você vê</span><input name="author" maxlength="120" value="' + dependencies.esc(b.author || "") + '" placeholder="Nome do autor"></label><label class="f">Nota<select name="rating"><option value="0"' + (b.rating ? "" : " selected") + '>Sem nota</option>' +
            [1, 2, 3, 4, 5].map(function (value) {
              return '<option value="' + value + '"' + (Number(b.rating) === value ? " selected" : "") + ">" + value + " / 5" + (value === 1 ? " · Não gostei" : value === 5 ? " · Adorei" : "") + "</option>";
            }).join("") +
            '</select></label><label class="f grow">Minha resenha <span class="m">Só você vê</span><textarea name="review" maxlength="1200" rows="3" placeholder="O que ficou com você depois da leitura?">' +
            dependencies.esc(b.review || "") +
            '</textarea></label><button class="btn sm" type="submit">Salvar dados</button></form></details>' +
            (hist ? '<ul class="list hist">' + hist + "</ul>" : "") +
            "</div>"
          );
        })
        .join("");
      return (
        dependencies.head(
          "Leitura",
          "Organize sua estante, acompanhe cada leitura e registre impressões privadas.",
        ) +
        '<section class="card reading-goal-card"><div class="reading-goal-overview"><div class="reading-annual-goal"><p class="eyebrow">DESAFIO DE ' +
        dependencies.esc(currentYear) +
        '</p><h2>Uma leitura de cada vez</h2><p class="m">' + finishedThisYear +
        ' de ' + annualGoal + (annualGoal === 1 ? ' livro concluído' : ' livros concluídos') +
        '</p><div class="bar" role="progressbar" aria-label="Progresso da meta anual" aria-valuemin="0" aria-valuemax="' + annualGoal + '" aria-valuenow="' + Math.min(finishedThisYear, annualGoal) + '"><b style="width:' + annualProgress + '%"></b></div><span class="m">A meta considera livros concluídos com a data registrada.</span></div>' +
        '<div class="reading-daily-goal"><div class="reading-daily-copy"><p class="eyebrow">META DIÁRIA</p><h3>' + pagesToday + ' de ' + dailyPageGoal + ' páginas hoje</h3><div class="bar" role="progressbar" aria-label="Progresso da meta diária de leitura" aria-valuemin="0" aria-valuemax="' + dailyPageGoal + '" aria-valuenow="' + Math.min(pagesToday, dailyPageGoal) + '"><b style="width:' + dailyProgress + '%"></b></div><p class="m">' + dailyGoalHint + '</p></div><div class="reading-streak"><strong class="num">' + readingStreak + '</strong><span>' + (readingStreak === 1 ? 'dia seguido' : 'dias seguidos') + '</span></div><p class="m reading-streak-hint">' + streakHint + '</p></div></div>' +
        '<form class="row reading-goal-settings" data-form="reading-goal"><label class="f">Livros no ano<input name="annualGoal" type="number" min="1" max="365" value="' + annualGoal + '" required></label><label class="f">Páginas por dia<input name="dailyPageGoal" type="number" min="1" max="500" value="' + dailyPageGoal + '" required></label><button class="btn sm" type="submit">Salvar metas</button></form></section>' +
        '<div class="tiles"><div class="tile"><div class="l">Hoje</div><div class="v num">' +
        dependencies.pagesRange(t, t) +
        '</div><div class="n">páginas</div></div>' +
        '<div class="tile"><div class="l">Semana</div><div class="v num">' +
        dependencies.pagesRange(ws, we) +
        '</div><div class="n">páginas</div></div>' +
        '<div class="tile"><div class="l">Média diária · 14 dias</div><div class="v num">' +
        Math.round(p14 / 14) +
        '</div><div class="n">páginas por dia</div></div>' +
        '<div class="tile"><div class="l">Ritmo</div><div class="v num">' +
        (pph || "–") +
        '</div><div class="n">' +
        (pph ? "páginas por hora" : "informe os minutos") +
        "</div></div></div>" +
        '<div class="card"><h2>Páginas por dia · 14 dias</h2>' +
        dependencies.barChart(d14, {
          label: "Páginas lidas por dia nos últimos 14 dias",
          unit: "pág.",
          emptyText: "Registre uma leitura para preencher este gráfico.",
          H: 190,
        }) +
        "</div>" +
        '<div class="card"><h2>Novo livro ou leitura</h2><form class="row" data-form="book">' +
        '<label class="f grow">Título<input id="b-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Dom Casmurro"></label>' +
        '<label class="f grow">Autor <span class="m">opcional</span><input class="grow" name="author" maxlength="120" placeholder="ex.: Machado de Assis"></label>' +
        '<label class="f grow">Tag' +
        dependencies.tagInput("b-tag", "ex.: Fisiologia, Romance") +
        "</label>" +
        '<label class="f">Total de páginas<input id="b-total" type="number" name="total" min="1" max="5000" required></label>' +
        '<label class="f">Já li até a página<input id="b-read" type="number" name="read" min="0" max="5000" step="1" value="0" required><span class="m">O progresso anterior não será contado como leitura de hoje.</span></label>' +
        '<button class="btn pri" type="submit">Adicionar</button></form></div>' +
        (state.books.length
          ? '<div class="reading-shelf-tools"><label class="f">Estante<select id="reading-shelf-filter"><option value="all">Todos os livros</option>' +
            Object.keys(statusLabels).map(function (value) {
              return '<option value="' + value + '">' + statusLabels[value] + '</option>';
            }).join("") +
            '</select></label><span id="reading-shelf-count" class="m" aria-live="polite">' + state.books.length + (state.books.length === 1 ? ' livro na estante' : ' livros na estante') + '</span></div>'
          : "") +
        (cards || '<p class="empty">Nenhum livro cadastrado.</p>')
      );
    }

    return Object.freeze({
      themesPage: themesPage,
      studyPage: studyPage,
      mistakesPage: mistakesPage,
      readingPage: readingPage,
    });
  }
  window.DesvelarLearningViews = Object.freeze({ create: create });
})();




