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
      "getStudyGuideState",
      "isReviewDue",
      "head",
      "sum",
      "tkey",
      "groupMin",
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
      var guideState = dependencies.getStudyGuideState();
      var guideHtml = "";
      if (guideState.open) {
        guideHtml =
          '<section class="card study-first-session" aria-labelledby="study-first-session-title"><div class="study-first-session-copy"><h2 id="study-first-session-title">Seu próximo bloco começa por aqui.</h2><p>Inicie um Pomodoro ou registre o que você já estudou. Seu progresso fica associado à sua conta e sincroniza quando há conexão. Seus registros de Estudos são privados.</p></div><div class="study-first-session-actions"><button class="btn pri" type="button" data-a="tab" data-tab="foco">Iniciar Pomodoro</button><button class="btn" type="button" data-a="study-guide-session">Registrar sessão</button><button class="btn sm" type="button" data-a="study-guide-dismiss">Dispensar orientação</button></div></section>';
      } else if (guideState.hydrated) {
        guideHtml =
          '<div class="study-guide-reopen"><button class="btn sm" type="button" data-a="study-guide-open">Como começar</button></div>';
      }
      return (
        dependencies.head(
          "Estudos",
          "Todo bloco conta. Continue de onde parou.",
        ) +
        guideHtml +
        '<div class="study-overview"><div class="study-overview-primary">' +
        '<section class="card study-session-form-card"><p class="study-eyebrow">Nova sessão</p><h2>O que você vai estudar?</h2><p class="study-card-description">Guarde matéria, assunto e tempo em um só lugar.</p><form class="row study-session-form" data-form="session">' +
        '<label class="f grow study-session-subject">Matéria' +
        dependencies.tagInput("s-tag", "ex.: Biologia, Inglês") +
        "</label>" +
        '<label class="f study-session-minutes">Minutos<input id="s-min" type="number" name="min" min="1" max="720" value="60" required></label>' +
        '<label class="f study-session-date">Data<input id="s-date" type="date" name="date" value="' +
        t +
        '" required></label>' +
        '<details class="study-session-details"><summary>Adicionar detalhes (opcional)</summary><div class="study-session-detail-fields">' +
        dependencies.topicField("s-topic", "ex.: Ciclo celular") +
        dependencies
          .studyTypeField("s-type")
          .replace("Tipo (opcional)", "Tipo de estudo (opcional)") +
        '<label class="f grow">Anotação (opcional)<input id="s-note" class="grow" name="note" maxlength="120" placeholder="Ponto que quero lembrar"></label>' +
        '</div></details>' +
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

    return Object.freeze({
      themesPage: themesPage,
      studyPage: studyPage,
      mistakesPage: mistakesPage,
    });
  }
  window.DesvelarLearningViews = Object.freeze({ create: create });
})();




