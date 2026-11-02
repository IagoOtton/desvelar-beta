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
          return x.diff >= 4 && !x.reviewed;
        })
        .sort(function (a, b) {
          return a.date < b.date ? -1 : 1;
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
      var li = function (x, rv) {
        return (
          '<li><span class="m num">' +
          dependencies.fmtD(x.date) +
          '</span><span class="t">' +
          dependencies.esc(x.title) +
          '<div class="m">' +
          dependencies.chip(x.tag) +
          (x.note ? " · " + dependencies.esc(x.note) : "") +
          "</div></span>" +
          diffPill(x.diff) +
          (rv
            ? '<button class="btn sm" data-a="th-rev" data-id="' +
              dependencies.esc(x.id) +
              '">Revisado</button>'
            : "") +
          '<button class="ico" data-a="del" data-k="themes" data-id="' +
          dependencies.esc(x.id) +
          '" aria-label="Apagar tema">×</button></li>'
        );
      };
      return (
        dependencies.head(
          "Temas estudados",
          "Anote cada tema estudado, sua matéria e o nível de dificuldade. Os de nota 4 ou 5 entram na fila de revisão.",
        ) +
        '<div class="tiles"><div class="tile"><div class="l">Temas na semana</div><div class="v num">' +
        wk +
        '</div><div class="n">estudados</div></div>' +
        '<div class="tile"><div class="l">Total registrado</div><div class="v num">' +
        all.length +
        '</div><div class="n">temas</div></div>' +
        '<div class="tile"><div class="l">Dificuldade média</div><div class="v num">' +
        (all.length ? avg.toFixed(1) : "–") +
        '</div><div class="n">de 5</div></div>' +
        '<div class="tile"><div class="l">Para revisar</div><div class="v num">' +
        rev.length +
        '</div><div class="n">nota 4 ou 5</div></div></div>' +
        '<div class="card"><h2>Mapa de conhecimento</h2>' +
        dependencies.brainGraph(360) +
        "</div>" +
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
        '<div class="grid"><div class="card"><h2>Fila de revisão</h2>' +
        (rev.length
          ? '<ul class="list">' +
            rev
              .map(function (x) {
                return li(x, true);
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhum tema difícil pendente.</p>') +
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
        g = dependencies.groupMin(ws, we),
        tot = Math.max.apply(
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
          "Registre sessões, assuntos e tipos de estudo. O Pomodoro salva os blocos automaticamente.",
        ) +
        '<div class="card"><h2>Registrar sessão</h2><form class="row" data-form="session">' +
        '<label class="f grow">Matéria' +
        dependencies.tagInput("s-tag", "ex.: Fisiologia, Inglês") +
        "</label>" +
        dependencies.topicField("s-topic", "ex.: Ciclo cardíaco") +
        dependencies.studyTypeField("s-type") +
        '<label class="f">Minutos<input id="s-min" type="number" name="min" min="1" max="720" value="60" required></label>' +
        '<label class="f">Data<input id="s-date" type="date" name="date" value="' +
        t +
        '" required></label>' +
        '<label class="f grow">Anotação (opcional)<input id="s-note" class="grow" name="note" maxlength="120" placeholder="ex.: ponto que quero lembrar"></label>' +
        '<button class="btn pri" type="submit">Registrar</button></form></div>' +
        '<div class="grid"><div class="card"><h2>Semana por matéria</h2>' +
        (g.length
          ? g
              .map(function (r) {
                return (
                  '<div class="acc"><span>' +
                  dependencies.chip(r.k) +
                  '</span><div class="bar"><b style="width:' +
                  Math.round((r.m / tot) * 100) +
                  '%"></b></div><span class="m num">' +
                  dependencies.fmtM(r.m) +
                  "</span></div>"
                );
              })
              .join("")
          : '<p class="empty">Nada registrado nesta semana.</p>') +
        "</div>" +
        '<div class="card"><h2>Últimas sessões</h2>' +
        (rec.length
          ? '<ul class="list">' +
            rec
              .map(function (x) {
                return (
                  '<li><span class="m num">' +
                  dependencies.fmtD(x.date) +
                  '</span><span class="t">' +
                  dependencies.chip(x.tag) +
                  (x.topic ? '<div class="m">Assunto: ' + dependencies.esc(x.topic) + "</div>" : "") +
                  (dependencies.studyTypeLabel(x.studyType)
                    ? '<div class="m">Tipo: ' + dependencies.esc(dependencies.studyTypeLabel(x.studyType)) + "</div>"
                    : "") +
                  (x.note ? '<div class="m">' + dependencies.esc(x.note) + "</div>" : "") +
                  (x.incomplete ? '<span class="session-status session-status--incomplete">Bloco incompleto</span>' : "") +
                  '</span><span class="num">' +
                  dependencies.fmtM(x.min) +
                  '</span><button class="ico" data-a="del" data-k="sessions" data-id="' +
                  dependencies.esc(x.id) +
                  '" aria-label="Apagar sessão">×</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhuma sessão ainda.</p>') +
        "</div></div>"
      );
    }


    function readingPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        ws = dependencies.wkStart(t),
        we = dependencies.addDays(ws, 6);
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
      var cards = state.books
        .map(function (b) {
          var p = b.total
              ? Math.min(100, Math.round((b.read / b.total) * 100))
              : 0,
            lg = dependencies.bookLog(b),
            fin = b.total && b.read >= b.total,
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
            '<div class="card book"><div class="rowflex" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><h3>' +
            dependencies.esc(b.title) +
            "</h3>" +
            dependencies.chip(b.tag) +
            (fin ? ' <span class="badge">concluído</span>' : "") +
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
                '" required></label><button class="btn pri" type="submit">Registrar leitura</button></form>') +
            (hist ? '<ul class="list hist">' + hist + "</ul>" : "") +
            "</div>"
          );
        })
        .join("");
      return (
        dependencies.head(
          "Leitura",
          "Todo livro começa na página 0. A cada leitura, diga em que página parou: eu calculo quantas páginas você leu.",
        ) +
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
        '<label class="f grow">Tag' +
        dependencies.tagInput("b-tag", "ex.: Fisiologia, Romance") +
        "</label>" +
        '<label class="f">Total de páginas<input id="b-total" type="number" name="total" min="1" max="5000" required></label>' +
        '<button class="btn pri" type="submit">Adicionar</button></form></div>' +
        (cards || '<p class="empty">Nenhum livro cadastrado.</p>')
      );
    }

    return Object.freeze({
      themesPage: themesPage,
      studyPage: studyPage,
      readingPage: readingPage,
    });
  }
  window.DesvelarLearningViews = Object.freeze({ create: create });
})();
