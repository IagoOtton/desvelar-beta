(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState",
      "getUserId",
      "homeGroupGoals",
      "today",
      "wkStart",
      "addDays",
      "pd",
      "fmtD",
      "pad",
      "daysBetween",
      "esc",
      "fmtM",
      "sum",
      "chip",
      "tcolor",
      "head",
      "areaChart",
      "kpi",
      "ring",
      "groupMin",
      "minsOn",
      "minsRange",
      "pagesRange",
      "questionTotals",
      "accuracyByTag",
      "delta",
      "donut",
      "brainGraph",
      "goalProgress",
      "phaseName",
      "pomoRemaining",
      "formatClock",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Array.isArray(dependencies.MES)
    ) {
      throw new Error("As dependências da tela inicial do DESVELAR não foram informadas.");
    }

    var S = null;
    var today = dependencies.today;
    var wkStart = dependencies.wkStart;
    var addDays = dependencies.addDays;
    var pd = dependencies.pd;
    var MES = dependencies.MES;
    var fmtD = dependencies.fmtD;
    var daysBetween = dependencies.daysBetween;
    var pad = dependencies.pad;
    var esc = dependencies.esc;
    var fmtM = dependencies.fmtM;
    var sum = dependencies.sum;
    var chip = dependencies.chip;
    var tcolor = dependencies.tcolor;
    var dlt = dependencies.delta;
    var donut = dependencies.donut;
    var brainGraph = dependencies.brainGraph;
    var head = dependencies.head;
    var areaChart = dependencies.areaChart;
    var kpi = dependencies.kpi;
    var ring = dependencies.ring;
    var groupMin = dependencies.groupMin;
    var minsOn = dependencies.minsOn;
    var minsRange = dependencies.minsRange;
    var pagesRange = dependencies.pagesRange;
    var qTot = dependencies.questionTotals;
    var accByTag = dependencies.accuracyByTag;
    var gprog = dependencies.goalProgress;
    var phaseName = dependencies.phaseName;
    var pomoRem = dependencies.pomoRemaining;
    var fmtClock = dependencies.formatClock;

    async function homePage() {
      var groupGoalsHtml = await dependencies.homeGroupGoals(
        dependencies.getUserId(),
      );
      S = dependencies.getState();
      var hasRecords = !!S.pomoRun || [
        S.sessions,
        S.books,
        S.events,
        S.tasks,
        S.questions,
        S.readlog,
        S.themes,
        S.habits,
        S.txs,
        S.goals,
        S.routine,
      ].some(function (records) {
        return records.length > 0;
      });
      var startActions = [
        { tab: "estudo", focus: "s-tag", label: "Registrar sessão" },
        { tab: "foco", label: "Iniciar Pomodoro" },
        { tab: "metas", focus: "go-title", label: "Criar uma meta" },
      ].filter(function (action) {
        return !S.enabledTabs || S.enabledTabs[action.tab] !== false;
      }).slice(0, 2);
      if (!startActions.length) {
        startActions.push({ tab: "sistema", label: "Escolher minhas abas" });
      }
      var startActionsHtml = startActions
        .map(function (action, index) {
          return (
            '<button class="btn' +
            (index === 0 ? " pri" : "") +
            '" data-a="tab" data-tab="' +
            esc(action.tab) +
            '"' +
            (action.focus ? ' data-focus="' + esc(action.focus) + '"' : "") +
            ">" +
            esc(action.label) +
            "</button>"
          );
        })
        .join("");
      var quickActions = [
        {
          tab: "estudo",
          focus: "s-tag",
          label: "Estudo",
          accessibleLabel: "Registrar uma sessão de estudo",
        },
        {
          tab: "tarefas",
          focus: "k-title",
          label: "Atividade",
          accessibleLabel: "Criar uma atividade",
        },
        {
          tab: "agenda",
          focus: "e-title",
          label: "Compromisso",
          accessibleLabel: "Adicionar um compromisso",
        },
        {
          tab: "metas",
          focus: "go-title",
          label: "Meta",
          accessibleLabel: "Criar uma meta",
        },
      ].filter(function (action) {
        return !S.enabledTabs || S.enabledTabs[action.tab] !== false;
      });
      var quickActionsHtml = quickActions.length
        ? '<section class="home-quick-actions" aria-label="Ações rápidas"><div class="home-quick-label">Criar rapidamente</div><div class="home-quick-list">' +
          quickActions
            .map(function (action) {
              return (
                '<button class="quick-action" data-a="tab" data-tab="' +
                esc(action.tab) +
                '" data-focus="' +
                esc(action.focus) +
                '" aria-label="' +
                esc(action.accessibleLabel) +
                '"><span class="quick-action-icon" aria-hidden="true">+</span><span>' +
                esc(action.label) +
                "</span></button>"
              );
            })
            .join("") +
          "</div></section>"
        : "";
      var emptyAction = function (message, label, targetTab, focusId) {
        return (
          '<div class="home-empty"><p class="empty">' +
          esc(message) +
          '</p><button class="btn sm" data-a="tab" data-tab="' +
          esc(targetTab) +
          '" data-focus="' +
          esc(focusId) +
          '">' +
          esc(label) +
          "</button></div>"
        );
      };
      var t = today(),
        ws = wkStart(t),
        we = addDays(ws, 6),
        pws = addDays(ws, -7),
        pwe = addDays(ws, -1),
        h = new Date().getHours();
      var hi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      var day = minsOn(t),
        wk = minsRange(ws, we),
        pw = minsRange(pws, pwe),
        goal = S.goalH * 60,
        pct = Math.round((wk / goal) * 100);
      var q1 = qTot(function (q) {
          return q.date >= ws && q.date <= we;
        }),
        q0 = qTot(function (q) {
          return q.date >= pws && q.date <= pwe;
        });
      var a1 = q1.t ? Math.round((q1.c / q1.t) * 100) : null,
        a0 = q0.t ? Math.round((q0.c / q0.t) * 100) : null;
      var dAcc =
        a1 == null
          ? { t: "— sem dados", c: "flat" }
          : a0 == null
            ? { t: "▲ novo", c: "up" }
            : {
                t: (a1 >= a0 ? "▲ +" : "▼ −") + Math.abs(a1 - a0) + " pp",
                c: a1 > a0 ? "up" : a1 < a0 ? "down" : "flat",
              };
      var pg = pagesRange(ws, we),
        ppg = pagesRange(pws, pwe);
      var ser = function (f) {
        var a = [];
        for (var i = 13; i >= 0; i--) a.push(f(addDays(t, -i)));
        return a;
      };
      var sMin = ser(minsOn),
        sPg = ser(function (d) {
          return pagesRange(d, d);
        }),
        sQ = ser(function (d) {
          return sum(
            S.questions.filter(function (q) {
              return q.date === d;
            }),
            function (q) {
              return q.total;
            },
          );
        });
      var ev = S.events
        .filter(function (e) {
          return e.date >= t;
        })
        .sort(function (a, b) {
          return a.date + a.time < b.date + b.time ? -1 : 1;
        })
        .slice(0, 4);
      var tk = S.tasks
        .filter(function (x) {
          return !x.done;
        })
        .sort(function (a, b) {
          return (a.due || "9") < (b.due || "9") ? -1 : 1;
        });
      var late = tk.filter(function (x) {
          return x.due && x.due < t;
        }).length,
        np = S.sessions.filter(function (x) {
          return x.date === t && x.pomo;
        }).length;
      var kpis =
        '<div class="kpis">' +
        kpi("Horas · semana", fmtM(wk), dlt(wk, pw), sMin, "vs sem. ant.") +
        kpi(
          "Hoje",
          fmtM(day),
          dlt(day, minsOn(addDays(t, -1))),
          null,
          "vs ontem",
        ) +
        kpi("Acerto · semana", a1 == null ? "–" : a1 + "%", dAcc, sQ, "") +
        kpi("Páginas · semana", String(pg), dlt(pg, ppg), sPg, "vs sem. ant.") +
        "</div>";
      var d30 = [],
        l30 = [];
      for (var i = 29; i >= 0; i--) {
        var dd = addDays(t, -i);
        d30.push(minsOn(dd) / 60);
        l30.push(fmtD(dd).slice(0, 5));
      }
      var pr = S.pomoRun,
        timer;
      if (pr) {
        timer =
          '<div class="card timer on"><h2>' +
          phaseName(pr) +
          "</h2>" +
          (pr.tag ? chip(pr.tag) : "") +
          '<div class="clock" id="mclock">' +
          fmtClock(pomoRem(pr)) +
          '</div><div class="rowflex"><button class="btn pri" data-a="tab" data-tab="foco">Abrir Foco</button></div></div>';
      } else {
        timer =
          '<div class="card timer"><h2>Pomodoro</h2><div class="clock">' +
          pad(S.pomo.focus) +
          ':00</div><div class="rowflex"><button class="btn pri" data-a="tab" data-tab="foco">Iniciar foco</button><span class="m">' +
          np +
          " de " +
          S.pomo.daily +
          " hoje</span></div></div>";
      }
      if (!hasRecords) {
        return (
          head(
            hi + (S.name ? ", " + S.name : ""),
            pd(t).getDate() +
              " de " +
              MES[pd(t).getMonth()] +
              " · semana de " +
              fmtD(ws),
          ) +
          '<section class="card welcome-state"><div class="welcome-kicker">PRIMEIROS PASSOS</div><h2>Seu espaço está pronto</h2><p>Registre uma sessão ou escolha uma ação para começar. Seus indicadores e gráficos aparecem aqui conforme você avança.</p><div class="welcome-actions">' +
          startActionsHtml +
          "</div></section>" +
          groupGoalsHtml
        );
      }
      var segs = groupMin(ws, we),
        tot = sum(segs, function (g) {
          return g.m;
        });
      var leg = segs.length
        ? '<div class="leg">' +
          segs
            .slice(0, 6)
            .map(function (g) {
              return (
                '<div><i style="background:' +
                tcolor(g.k) +
                '"></i><span>' +
                esc(g.label) +
                "</span><em>" +
                fmtM(g.m) +
                "</em></div>"
              );
            })
            .join("") +
          "</div>"
        : emptyAction(
            "Registre uma sessão para ver a divisão por tag.",
            "Registrar sessão",
            "estudo",
            "s-tag",
          );
      var evh = ev.length
        ? '<ul class="list">' +
          ev
            .map(function (e) {
              return (
                '<li><span class="m num">' +
                fmtD(e.date) +
                '</span><span class="t">' +
                esc(e.title) +
                '<div class="m">' +
                esc(e.kind || "") +
                (e.time ? (e.kind ? " · " : "") + esc(e.time) : "") +
                "</div></span></li>"
              );
            })
            .join("") +
          "</ul>"
        : emptyAction(
            "Nenhum compromisso à frente.",
            "Adicionar compromisso",
            "agenda",
            "e-title",
          );
      var tkh = tk.length
        ? '<ul class="list">' +
          tk
            .slice(0, 4)
            .map(function (x) {
              var lt = x.due && x.due < t;
              return (
                '<li><button class="check" data-a="toggle" data-id="' +
                esc(x.id) +
                '" aria-label="Concluir"></button><span class="t">' +
                esc(x.title) +
                '<div class="m">' +
                chip(x.tag) +
                (x.due
                  ? ' · <span class="' +
                    (lt ? "late" : "") +
                    '">' +
                    (lt ? "atrasada " : "") +
                    fmtD(x.due) +
                    "</span>"
                  : "") +
                "</div></span></li>"
              );
            })
            .join("") +
          "</ul>"
        : emptyAction(
            "Nenhuma atividade pendente.",
            "Criar atividade",
            "tarefas",
            "k-title",
          );
      var att = [],
        weak = accByTag().filter(function (r) {
          return r.t >= 10 && r.c / r.t < 0.7;
        })[0];
      if (weak)
        att.push(
          "Acerto baixo em <b>" +
            esc(weak.label) +
            "</b>: " +
            Math.round((weak.c / weak.t) * 100) +
            "% em " +
            weak.t +
            " questões.",
        );
      if (late) att.push("<b>" + late + "</b> atividade(s) atrasada(s).");
      var lastRead = S.readlog.reduce(function (a, r) {
          return r.date > a ? r.date : a;
        }, ""),
        open = S.books.some(function (b) {
          return b.read < b.total;
        });
      if (open && lastRead && daysBetween(lastRead, t) > 7)
        att.push("Sem leitura há <b>" + daysBetween(lastRead, t) + " dias</b>.");
      if (!day) att.push("Nenhum estudo registrado hoje ainda.");
      var nrev = S.themes.filter(function (x) {
        return x.diff >= 4 && !x.reviewed;
      }).length;
      if (nrev)
        att.push("<b>" + nrev + "</b> tema(s) difícil(is) esperando revisão.");
      var attention = att.length
        ? '<div class="card attention"><h2>Pontos de atenção</h2><div style="display:flex;flex-direction:column;gap:8px">' +
          att
            .map(function (a) {
              return '<div class="note">' + a + "</div>";
            })
            .join("") +
          "</div></div>"
        : "";
      var dow = (new Date().getDay() + 6) % 7,
        nowHM = pad(h) + ":" + pad(new Date().getMinutes());
      var rt = S.routine
        .filter(function (x) {
          return x.day === dow;
        })
        .sort(function (a, b) {
          return a.start < b.start ? -1 : 1;
        });
      var rth = rt.length
        ? '<ul class="list">' +
          rt
            .map(function (x) {
              var on = x.start <= nowHM && nowHM < x.end;
              return (
                '<li><span class="m num">' +
                esc(x.start) +
                '</span><span class="t">' +
                esc(x.title) +
                (on ? ' <span class="badge">agora</span>' : "") +
                (x.tag ? '<div class="m">' + chip(x.tag) + "</div>" : "") +
                '</span><span class="m num">' +
                esc(x.end) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : emptyAction(
            "Nada fixo na rotina de hoje.",
            "Montar rotina",
            "rotina",
            "ro-title",
          );
      var hbh = S.habits.length
        ? '<ul class="list">' +
          S.habits
            .map(function (x) {
              var d = !!x.days[t];
              return (
                '<li class="' +
                (d ? "done" : "") +
                '"><button class="check' +
                (d ? " on" : "") +
                '" data-a="hab-toggle" data-id="' +
                esc(x.id) +
                '" data-d="' +
                t +
                '" aria-label="Marcar hábito">' +
                (d ? "✓" : "") +
                '</button><span class="t">' +
                esc(x.name) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : emptyAction(
            "Nenhum hábito cadastrado.",
            "Criar hábito",
            "habitos",
            "h-name",
          );
      var gl = S.goals
        .filter(function (g) {
          return gprog(g) < 100;
        })
        .sort(function (a, b) {
          return (a.due || "9") < (b.due || "9") ? -1 : 1;
        })
        .slice(0, 3);
      var glh = gl.length
        ? gl
            .map(function (g) {
              return (
                '<div style="margin-bottom:12px"><div class="rowflex" style="justify-content:space-between;flex-wrap:nowrap"><span>' +
                esc(g.title) +
                '</span><span class="m num">' +
                gprog(g) +
                '%</span></div><div class="bar"><b style="width:' +
                gprog(g) +
                '%"></b></div></div>'
              );
            })
            .join("")
        : emptyAction(
            "Nenhuma meta em andamento.",
            "Criar meta",
            "metas",
            "go-title",
          );
      return (
        head(
          hi + (S.name ? ", " + S.name : ""),
          pd(t).getDate() +
            " de " +
            MES[pd(t).getMonth()] +
            " · semana de " +
            fmtD(ws),
        ) +
        quickActionsHtml +
        kpis +
        '<div class="today-grid"><div class="card"><h2>Atividades pendentes</h2>' +
        tkh +
        '</div><div class="card"><h2>Próximos compromissos</h2>' +
        evh +
        "</div>" +
        timer +
        attention +
        '</div><div class="grid"><div class="card"><h2>Rotina de hoje</h2>' +
        rth +
        '</div><div class="card"><h2>Hábitos de hoje</h2>' +
        hbh +
        '</div><div class="card"><h2>Metas em andamento</h2>' +
        glh +
        "</div></div>" +
        groupGoalsHtml +
        '<div class="grid2"><div class="card"><h2>Horas por dia · 30 dias</h2>' +
        areaChart(d30, l30, {
          H: 300,
          unit: "h",
          emptyText: "Registre uma sessão de estudo para ver sua evolução diária.",
          label: "Horas estudadas por dia nos últimos 30 dias",
        }) +
        '<div class="legend"><span><i></i>horas por dia</span><span><i class="ma"></i>média de 7 dias</span></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="card hero">' +
        ring(pct, pct + "%", "da meta semanal") +
        '<div><div class="big num">' +
        fmtM(wk) +
        ' <span class="m">de ' +
        esc(S.goalH) +
        'h</span></div><div class="m">estudado nesta semana</div></div></div>' +
        "</div></div>" +
        '<div class="grid"><div class="card"><h2>Horas por tag · semana</h2><div class="donut">' +
        donut(segs, fmtM(tot), "na semana") +
        leg +
        '</div></div><div class="card"><h2>Mapa de conhecimento</h2>' +
        brainGraph(280) +
        "</div></div>"
      );
    }

    return Object.freeze({
      homePage: homePage,
    });
  }

  window.DesvelarHomeViews = Object.freeze({ create: create });
})();

