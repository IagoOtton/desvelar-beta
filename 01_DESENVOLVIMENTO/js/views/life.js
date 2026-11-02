(function () {
  "use strict";
  var DIAF = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];

  function create(dependencies) {
    var required = [
      "getState",
      "getFinanceMonth",
      "today",
      "addDays",
      "pd",
      "fmtD",
      "fmtM",
      "pad",
      "esc",
      "chip",
      "tagInput",
      "head",
      "sum",
      "tkey",
      "tlabel",
      "tcolor",
      "donut",
      "barChart",
      "BRL",
      "daysBetween",
      "gprog",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Array.isArray(dependencies.months) ||
      !Array.isArray(dependencies.weekdays)
    ) {
      throw new Error(
        "As dependências das telas da área Vida não foram informadas.",
      );
    }
    function habStreak(h) {
      var d = dependencies.today();
      if (!h.days[d]) d = dependencies.addDays(d, -1);
      var n = 0;
      while (h.days[d]) {
        n++;
        d = dependencies.addDays(d, -1);
      }
      return n;
    }
    function hab30(h) {
      var t = dependencies.today(),
        c = 0;
      for (var i = 0; i < 30; i++) if (h.days[dependencies.addDays(t, -i)]) c++;
      return Math.round((c / 30) * 100);
    }
    function habitsPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        days = [];
      for (var i = 6; i >= 0; i--) days.push(dependencies.addDays(t, -i));
      var done = state.habits.filter(function (h) {
          return h.days[t];
        }).length,
        avg30 = state.habits.length
          ? Math.round(dependencies.sum(state.habits, hab30) / state.habits.length)
          : 0,
        best = state.habits.reduce(function (a, h) {
          return Math.max(a, habStreak(h));
        }, 0);
      var rows = state.habits
        .map(function (h) {
          return (
            '<div class="hab"><span class="t">' +
            dependencies.esc(h.name) +
            "</span>" +
            days
              .map(function (d) {
                return (
                  '<button class="hd' +
                  (h.days[d] ? " on" : "") +
                  (d === t ? " td" : "") +
                  '" data-a="hab-toggle" data-id="' +
                  dependencies.esc(h.id) +
                  '" data-d="' +
                  d +
                  '" aria-label="' +
                  dependencies.esc(h.name) +
                  " em " +
                  dependencies.fmtD(d) +
                  '"></button>'
                );
              })
              .join("") +
            '<span class="m num">' +
            habStreak(h) +
            ' d</span><button class="ico" data-a="del" data-k="habits" data-id="' +
            dependencies.esc(h.id) +
            '" aria-label="Apagar hábito">×</button></div>'
          );
        })
        .join("");
      return (
        dependencies.head(
          "Hábitos",
          "Marque o que você fez em cada dia. Dá para corrigir dias anteriores clicando no círculo.",
        ) +
        '<div class="tiles"><div class="tile"><div class="l">Hoje</div><div class="v num">' +
        done +
        "/" +
        state.habits.length +
        '</div><div class="n">hábitos feitos</div></div>' +
        '<div class="tile"><div class="l">Melhor sequência atual</div><div class="v num">' +
        best +
        '</div><div class="n">dias seguidos</div></div>' +
        '<div class="tile"><div class="l">Constância · 30 dias</div><div class="v num">' +
        (state.habits.length ? avg30 + "%" : "–") +
        '</div><div class="n">média dos hábitos</div></div></div>' +
        '<div class="card"><h2>Últimos 7 dias</h2>' +
        (state.habits.length
          ? '<div class="habwrap"><div class="hab hh"><span></span>' +
            days
              .map(function (d) {
                return "<span>" + dependencies.weekdays[(dependencies.pd(d).getDay() + 6) % 7] + "</span>";
              })
              .join("") +
            "<span>seq.</span><span></span></div>" +
            rows +
            "</div>"
          : '<p class="empty">Nenhum hábito ainda. Adicione abaixo.</p>') +
        "</div>" +
        '<div class="card"><h2>Novo hábito</h2><form class="row" data-form="habit"><label class="f grow">Nome<input id="h-name" class="grow" name="name" maxlength="50" required placeholder="ex.: Dormir 7h, Meditar, Caminhar"></label><button class="btn pri" type="submit">Adicionar</button></form></div>'
      );
    }

    function financePage() {
      var state = dependencies.getState();
      var financeMonth = dependencies.getFinanceMonth();
      var y = financeMonth.getFullYear(),
        m = financeMonth.getMonth(),
        ym = y + "-" + dependencies.pad(m + 1);
      var tx = state.txs
        .filter(function (x) {
          return x.date.slice(0, 7) === ym;
        })
        .sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        });
      var inn = dependencies.sum(
          tx.filter(function (x) {
            return x.type === "in";
          }),
          function (x) {
            return x.amount;
          },
        ),
        out = dependencies.sum(
          tx.filter(function (x) {
            return x.type === "out";
          }),
          function (x) {
            return x.amount;
          },
        ),
        sd = inn - out;
      var g = {};
      tx.filter(function (x) {
        return x.type === "out";
      }).forEach(function (x) {
        var k = dependencies.tkey(x.tag);
        g[k] = (g[k] || 0) + x.amount;
      });
      var segs = Object.keys(g)
        .map(function (k) {
          return { k: k, label: dependencies.tlabel(k), m: g[k] };
        })
        .sort(function (a, b) {
          return b.m - a.m;
        });
      var items = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date(y, m - i, 1),
          key = d.getFullYear() + "-" + dependencies.pad(d.getMonth() + 1);
        items.push({
          l: dependencies.months[d.getMonth()].slice(0, 3),
          v: dependencies.sum(
            state.txs.filter(function (x) {
              return x.type === "out" && x.date.slice(0, 7) === key;
            }),
            function (x) {
              return x.amount;
            },
          ),
        });
      }
      var leg = segs.length
        ? '<div class="leg">' +
          segs
            .slice(0, 6)
            .map(function (x) {
              return (
                '<div><i style="background:' +
                dependencies.tcolor(x.k) +
                '"></i><span>' +
                dependencies.esc(x.label) +
                "</span><em>" +
              dependencies.esc(dependencies.BRL(x.m)) +
                "</em></div>"
              );
            })
            .join("") +
          "</div>"
        : '<p class="empty">Sem saídas neste mês.</p>';
      return (
        dependencies.head(
          "Finanças",
          "Entradas e saídas simples do mês, com categorias que você mesmo escolhe.",
        ) +
        '<div class="rowflex" style="justify-content:space-between"><button class="btn sm" data-a="fin-prev" aria-label="Mês anterior">‹</button><h2 style="margin:0">' +
        dependencies.months[m] +
        " de " +
        y +
        '</h2><button class="btn sm" data-a="fin-next" aria-label="Próximo mês">›</button></div>' +
        '<div class="tiles"><div class="tile"><div class="l">Entradas</div><div class="v num" style="font-size:21px;color:var(--good)">' +
      dependencies.esc(dependencies.BRL(inn)) +
        "</div></div>" +
        '<div class="tile"><div class="l">Saídas</div><div class="v num" style="font-size:21px">' +
      dependencies.esc(dependencies.BRL(out)) +
        "</div></div>" +
        '<div class="tile"><div class="l">Saldo</div><div class="v num" style="font-size:21px;color:var(--' +
        (sd >= 0 ? "good" : "bad") +
        ')">' +
      dependencies.esc(dependencies.BRL(sd)) +
        "</div></div></div>" +
        '<div class="grid"><div class="card"><h2>Saídas por categoria</h2><div class="donut">' +
      dependencies.donut(segs, dependencies.BRL(out), "em saídas", true) +
        leg +
        "</div></div>" +
        '<div class="card"><h2>Saídas · 6 meses (R$)</h2>' +
        dependencies.barChart(items, {
          H: 200,
          formatValue: function (value) {
            return dependencies.BRL(value);
          },
          axisWidth: 138,
          valueLabels: false,
          emptyText: "Registre saídas para visualizar os gastos por mês.",
          label: "Saídas por mês nos últimos 6 meses",
        }) +
        "</div></div>" +
        '<div class="card"><h2>Novo lançamento</h2><form class="row" data-form="tx"><label class="f">Tipo<select id="x-type" name="type"><option value="out">Saída</option><option value="in">Entrada</option></select></label>' +
        '<label class="f">Valor (R$)<input id="x-amt" type="number" name="amount" min="0.01" step="0.01" required></label>' +
        '<label class="f grow">Descrição<input id="x-title" class="grow" name="title" maxlength="80" required placeholder="ex.: Mercado"></label>' +
        '<label class="f grow">Categoria' +
        dependencies.tagInput("x-tag", "ex.: Alimentação, Moradia") +
        "</label>" +
        '<label class="f">Data<input id="x-date" type="date" name="date" value="' +
        (dependencies.today().slice(0, 7) === ym ? dependencies.today() : ym + "-01") +
        '" required></label>' +
        '<button class="btn pri" type="submit">Lançar</button></form></div>' +
        '<div class="card"><h2>Lançamentos do mês</h2>' +
        (tx.length
          ? '<ul class="list">' +
            tx
              .map(function (x) {
                return (
                  '<li><span class="m num">' +
                  dependencies.fmtD(x.date) +
                  '</span><span class="t">' +
                  dependencies.esc(x.title) +
                  '<div class="m">' +
                  dependencies.chip(x.tag) +
                  '</div></span><span class="num" style="color:var(--' +
                  (x.type === "in" ? "good" : "ink") +
                  ')">' +
                  (x.type === "in" ? "+" : "−") +
                dependencies.esc(dependencies.BRL(x.amount)) +
                  '</span><button class="ico" data-a="del" data-k="txs" data-id="' +
                  dependencies.esc(x.id) +
                  '" aria-label="Apagar lançamento">×</button></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty">Nenhum lançamento neste mês.</p>') +
        "</div>"
      );
    }

    function goalsPage() {
      var state = dependencies.getState();
      var t = dependencies.today(),
        act = state.goals.filter(function (g) {
          return dependencies.gprog(g) < 100;
        }).length,
        dn = state.goals.length - act;
      var cards = state.goals
        .slice()
        .sort(function (a, b) {
          return (a.due || "9") < (b.due || "9") ? -1 : 1;
        })
        .map(function (g) {
          var p = dependencies.gprog(g),
            dl = g.due ? dependencies.daysBetween(t, g.due) : null;
          var due = g.due
            ? p >= 100
              ? "concluída"
              : (dl < 0
                  ? '<span class="late">atrasada há ' + -dl + " dias</span>"
                  : dl + " dias restantes") +
                " · " +
                dependencies.fmtD(g.due)
            : "sem prazo";
          var ms = g.ms
            .map(function (x) {
              return (
                '<li class="' +
                (x.done ? "done" : "") +
                '"><button class="check' +
                (x.done ? " on" : "") +
                '" data-a="ms-toggle" data-g="' +
                dependencies.esc(g.id) +
                '" data-id="' +
                dependencies.esc(x.id) +
                '" aria-label="Alternar marco">' +
                (x.done ? "✓" : "") +
                '</button><span class="t">' +
                dependencies.esc(x.text) +
                '</span><button class="ico" data-a="ms-del" data-g="' +
                dependencies.esc(g.id) +
                '" data-id="' +
                dependencies.esc(x.id) +
                '" aria-label="Apagar marco">×</button></li>'
              );
            })
            .join("");
          return (
            '<div class="card book"><div class="rowflex" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><h3>' +
            dependencies.esc(g.title) +
            "</h3>" +
            (g.tag ? dependencies.chip(g.tag) + " · " : "") +
            '<span class="m">' +
            due +
            '</span></div><button class="ico" data-a="del" data-k="goals" data-id="' +
            dependencies.esc(g.id) +
            '" aria-label="Apagar meta">×</button></div>' +
            '<div class="rowflex" style="justify-content:space-between;margin-top:10px"><span class="m">progresso</span><b class="num">' +
            p +
            '%</b></div><div class="bar" style="margin-top:4px"><b style="width:' +
            p +
            '%"></b></div>' +
            (ms
              ? '<ul class="list" style="margin-top:8px">' + ms + "</ul>"
              : "") +
            '<form class="row" data-form="ms" style="margin-top:10px"><input type="hidden" name="g" value="' +
            dependencies.esc(g.id) +
            '"><label class="f grow">Novo marco<input id="m-' +
            dependencies.esc(g.id) +
            '" class="grow" name="text" maxlength="100" required placeholder="ex.: Terminar o módulo de cardio"></label><button class="btn sm" type="submit">Adicionar marco</button></form>' +
            (g.ms.length
              ? ""
              : '<form class="row" data-form="gman" style="margin-top:10px"><input type="hidden" name="g" value="' +
                dependencies.esc(g.id) +
                '"><label class="f">Ou informe o progresso (%)<input id="gp-' +
                dependencies.esc(g.id) +
                '" type="number" name="pct" min="0" max="100" value="' +
                (g.manual || 0) +
                '" required></label><button class="btn sm" type="submit">Atualizar</button></form>') +
            "</div>"
          );
        })
        .join("");
      return (
        dependencies.head(
          "Metas de longo prazo",
          "Objetivos do semestre, do ano ou da carreira. Divida em marcos e acompanhe o progresso.",
        ) +
        '<div class="tiles"><div class="tile"><div class="l">Em andamento</div><div class="v num">' +
        act +
        '</div><div class="n">metas</div></div><div class="tile"><div class="l">Concluídas</div><div class="v num">' +
        dn +
        '</div><div class="n">metas</div></div></div>' +
        '<div class="card"><h2>Nova meta</h2><form class="row" data-form="goal"><label class="f grow">Meta<input id="go-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Passar na residência"></label>' +
        '<label class="f grow">Tag (opcional)' +
        dependencies.tagInput("go-tag", "ex.: Carreira, Saúde") +
        '</label><label class="f">Prazo<input id="go-due" type="date" name="due"></label><button class="btn pri" type="submit">Criar meta</button></form></div>' +
        (cards || '<p class="empty">Nenhuma meta ainda.</p>')
      );
    }

    function routinePanel() {
      var state = dependencies.getState();
      var dow = (new Date().getDay() + 6) % 7;
      var cols = [0, 1, 2, 3, 4, 5, 6]
        .map(function (d) {
          var bl = state.routine
            .filter(function (x) {
              return x.day === d;
            })
            .sort(function (a, b) {
              return a.start < b.start ? -1 : 1;
            });
          return (
            '<div class="card rcol' +
            (d === dow ? " today" : "") +
            '"><h2>' +
            DIAF[d] +
            "</h2>" +
            (bl.length
              ? '<ul class="list">' +
                bl
                  .map(function (x) {
                    return (
                      '<li><span class="t"><b class="num">' +
                      dependencies.esc(x.start) +
                      "–" +
                      dependencies.esc(x.end) +
                      "</b><br>" +
                      dependencies.esc(x.title) +
                      (x.tag ? '<div class="m">' + dependencies.chip(x.tag) + "</div>" : "") +
                      '</span><button class="ico" data-a="del" data-k="routine" data-id="' +
                      dependencies.esc(x.id) +
                      '" aria-label="Apagar bloco">×</button></li>'
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">livre</p>') +
            "</div>"
          );
        })
        .join("");
      return (
        '<section class="agenda-panel" aria-labelledby="agenda-routine-title"><div><h2 id="agenda-routine-title">Rotina semanal</h2><p class="m">Cadastre os blocos que se repetem na sua semana.</p></div>' +
        '<div class="card"><h3>Novo bloco fixo</h3><form class="row" data-form="routine"><label class="f grow">Atividade<input id="ro-title" class="grow" name="title" maxlength="80" required placeholder="ex.: Aulas, Academia"></label>' +
        '<label class="f grow">Tag (opcional)' +
        dependencies.tagInput("ro-tag", "ex.: Faculdade, Saúde") +
        "</label>" +
        '<label class="f">Início<input id="ro-start" type="time" name="start" value="08:00" required></label><label class="f">Fim<input id="ro-end" type="time" name="end" value="09:00" required></label>' +
        '<fieldset class="days" style="width:100%"><legend class="m" style="padding:0 0 5px">Dias da semana</legend>' +
        DIAF.map(function (n, i) {
          return (
            '<label class="dchk" for="rd' +
            i +
            '"><input id="rd' +
            i +
            '" type="checkbox" name="d" value="' +
            i +
            '">' +
            n.slice(0, 3) +
            "</label>"
          );
        }).join("") +
        "</fieldset>" +
        '<button class="btn pri" type="submit">Adicionar</button></form></div>' +
        '<div class="rgrid">' +
        cols +
        "</div></section>"
      );
    }

    function routinePage() {
      return (
        dependencies.head(
          "Rotina semanal",
          "Seus blocos fixos de cada semana: aulas, estágio, academia, refeições. O que cair em hoje aparece no Início.",
        ) + routinePanel()
      );
    }


    return Object.freeze({
      habitsPage: habitsPage,
      financePage: financePage,
      goalsPage: goalsPage,
      routinePage: routinePage,
      routinePanel: routinePanel,
    });
  }
  window.DesvelarLifeViews = Object.freeze({ create: create });
})();
