(function () {
  "use strict";
  var U = window.DesvelarUtils;

  if (!U) {
    throw new Error("As funções de data do DESVELAR não foram carregadas.");
  }

  var pad = U.pad;
  var ds = U.ds;
  var pd = U.pd;
  var addDays = U.addDays;
  var today = U.today;
  var wkStart = U.wkStart;
  var MES = U.MES;
  var DIAS = U.DIAS;
  var fmtD = U.fmtD;
  var daysBetween = U.daysBetween;

  var F = window.DesvelarFormatting;

  if (!F) {
    throw new Error(
      "As funções de formatação do DESVELAR não foram carregadas.",
    );
  }

  var uid = F.uid;
  var esc = F.esc;
  var fmtM = F.fmtM;
  var sum = F.sum;

  var DataModel = window.DesvelarDataModel;
  if (!DataModel) {
    throw new Error("O modelo de dados do DESVELAR não foi carregado.");
  }
  var LISTS = DataModel.LISTS;
  var TAGGED = DataModel.TAGGED;
  var normalize = DataModel.normalize;
  var mergeLegacyData = DataModel.mergeLegacyData;
  var PomodoroDomain = window.DesvelarPomodoroDomain.create({
    uid: uid,
    dateKey: ds,
  });
  var PC = 2 * Math.PI * 118,
    zen = false;
  var finM = new Date();
  var S = null,
    tab = "inicio",
    calM = new Date(),
    selDay = today(),
    saveOk = true,
    wipeArm = 0,
    TM = {};

  /* ---------- dados ---------- */
  var localData = window.DesvelarLocalDataRepository.create({
    userId: window.desvelarUser.id,
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
  });
  var stateStore = null;
  var cloudSync = window.DesvelarCloudSync.create({
    initialSnapshot: window.desvelarCloudBootstrap || {},
    repository: window.desvelarCloudData || null,
    localData: localData,
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
    mergeForSync: DataModel.mergeForSync,
    getState: function () {
      return stateStore ? stateStore.getState() : null;
    },
    replaceState: function (state) {
      return stateStore ? stateStore.replaceState(state) : false;
    },
    persist: function () {
      return stateStore ? stateStore.persist() : false;
    },
    onStatusChange: function (label) {
      var status = document.getElementById("cloud-sync-status");
      if (status) status.textContent = label;
    },
    onSyncError: function (message) {
      toast(message);
    },
  });

  stateStore = window.DesvelarStateStore.create({
    load: cloudSync.loadAccountData,
    save: function (state) {
      saveOk = cloudSync.save(state);
      return saveOk;
    },
    normalize: normalize,
    onStateChange: function (state) {
      S = state;
    },
  });

  function persist() {
    return stateStore.persist();
  }

  function load() {
    var state = stateStore.load();
    if (["dark", "light", "system"].indexOf(state.theme) === -1) {
      var storedTheme = null;
      try {
        storedTheme = window.localStorage.getItem("painel-tema");
      } catch (error) {}

      if (storedTheme === "dark" || storedTheme === "light") {
        state.theme = storedTheme;
      }
    }
    applyTheme(state.theme || "system");
    return state;
  }
  /* ---------- tags livres ---------- */
  var T = window.DesvelarTags;

  if (!T) {
    throw new Error(
      "As funções de etiquetas do DESVELAR não foram carregadas.",
    );
  }

  var tkey = T.key;
  function buildTags() {
    TM = {};
    var kinds = {};
    TAGGED.forEach(function (k) {
      S[k].forEach(function (x) {
        var kk = tkey(x.tag);
        if (kk && !TM[kk]) TM[kk] = String(x.tag).trim();
      });
    });
    S.events.forEach(function (e) {
      if (e.kind) kinds[e.kind] = 1;
    });
    document.getElementById("tags").innerHTML = Object.keys(TM)
      .map(function (k) {
        return '<option value="' + esc(TM[k]) + '">';
      })
      .join("");
    document.getElementById("kinds").innerHTML = Object.keys(kinds)
      .map(function (k) {
        return '<option value="' + esc(k) + '">';
      })
      .join("");
  }
  function tlabel(t) {
    var k = tkey(t);
    return k ? TM[k] || String(t).trim() : "sem tag";
  }
  function tcolor(t) {
    var k = tkey(t);
    if (!k) return "var(--muted)";
    var h = 0;
    for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 360;
    return "hsl(" + h + " 72% var(--tl))";
  }
  function chip(t) {
    return Common.chip(tcolor(t), tlabel(t));
  }

  function tagInput(id, ph, req) {
    return Common.tagInput(id, ph, req);
  }
  function groupMin(a, b) {
    var g = {};
    S.sessions.forEach(function (x) {
      if (x.date >= a && x.date <= b) {
        var k = tkey(x.tag);
        g[k] = (g[k] || 0) + x.min;
      }
    });
    return Object.keys(g)
      .map(function (k) {
        return { k: k, label: tlabel(k), m: g[k] };
      })
      .sort(function (x, y) {
        return y.m - x.m;
      });
  }
  function accByTag() {
    var g = {};
    S.questions.forEach(function (q) {
      var k = tkey(q.tag);
      g[k] = g[k] || { t: 0, c: 0 };
      g[k].t += q.total;
      g[k].c += q.correct;
    });
    return Object.keys(g)
      .map(function (k) {
        return { k: k, label: tlabel(k), t: g[k].t, c: g[k].c };
      })
      .sort(function (x, y) {
        return x.c / x.t - y.c / y.t;
      });
  }

  /* ---------- cálculos ---------- */
  function minsOn(d) {
    return sum(
      S.sessions.filter(function (x) {
        return x.date === d;
      }),
      function (x) {
        return x.min;
      },
    );
  }
  function minsRange(a, b) {
    return sum(
      S.sessions.filter(function (x) {
        return x.date >= a && x.date <= b;
      }),
      function (x) {
        return x.min;
      },
    );
  }
  function pagesRange(a, b) {
    return sum(
      S.readlog.filter(function (x) {
        return x.date >= a && x.date <= b;
      }),
      function (x) {
        return x.pages;
      },
    );
  }
  function streak() {
    var d = today(),
      n = 0;
    if (!minsOn(d)) d = addDays(d, -1);
    while (minsOn(d) > 0) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }
  function qTot(f) {
    var q = S.questions.filter(
      f ||
        function () {
          return true;
        },
    );
    return {
      t: sum(q, function (x) {
        return x.total;
      }),
      c: sum(q, function (x) {
        return x.correct;
      }),
    };
  }
  function hasDemo() {
    return LISTS.some(function (k) {
      return S[k].some(function (x) {
        return x.ex;
      });
    });
  }
  function realCount() {
    return sum(LISTS, function (k) {
      return S[k].filter(function (x) {
        return !x.ex;
      }).length;
    });
  }
  function bookLog(b) {
    return S.readlog
      .filter(function (r) {
        return r.bookId === b.id;
      })
      .sort(function (a, c) {
        return a.date < c.date ? -1 : a.date > c.date ? 1 : a.to - c.to;
      });
  }

  /* ---------- gráficos ---------- */
  var C = window.DesvelarCharts;

  if (!C) {
    throw new Error(
      "Os componentes de gráficos do DESVELAR não foram carregados.",
    );
  }

  var barChart = C.barChart;
  var areaChart = C.areaChart;
  var spark = C.spark;
  var kpi = C.kpi;
  var ring = C.ring;
  function dlt(cur, prev) {
    if (!cur && !prev) return { t: "— sem dados", c: "flat" };
    if (!prev) return { t: "▲ novo", c: "up" };
    var p = Math.round(((cur - prev) / prev) * 100);
    return {
      t: p > 0 ? "▲ +" + p + "%" : p < 0 ? "▼ −" + Math.abs(p) + "%" : "■ 0%",
      c: p > 0 ? "up" : p < 0 ? "down" : "flat",
    };
  }
  function tickerHtml() {
    var t = today(),
      ws = wkStart(t),
      we = addDays(ws, 6),
      pws = addDays(ws, -7),
      pwe = addDays(ws, -1);
    var wk = minsRange(ws, we),
      pw = minsRange(pws, pwe),
      day = minsOn(t),
      yd = minsOn(addDays(t, -1));
    var q1 = qTot(function (q) {
        return q.date >= ws && q.date <= we;
      }),
      q0 = qTot(function (q) {
        return q.date >= pws && q.date <= pwe;
      });
    var a1 = q1.t ? Math.round((q1.c / q1.t) * 100) : null,
      a0 = q0.t ? Math.round((q0.c / q0.t) * 100) : null;
    var da =
      a1 == null
        ? { t: "—", c: "flat" }
        : a0 == null
          ? { t: "▲ novo", c: "up" }
          : {
              t: (a1 >= a0 ? "▲ +" : "▼ −") + Math.abs(a1 - a0) + "pp",
              c: a1 > a0 ? "up" : a1 < a0 ? "down" : "flat",
            };
    var pg = pagesRange(ws, we),
      ppg = pagesRange(pws, pwe),
      ym = t.slice(0, 7);
    var sd = sum(
      S.txs.filter(function (x) {
        return x.date.slice(0, 7) === ym;
      }),
      function (x) {
        return x.type === "in" ? x.amount : -x.amount;
      },
    );
    var np = S.sessions.filter(function (x) {
        return x.date === t && x.pomo;
      }).length,
      rev = S.themes.filter(function (x) {
        return x.diff >= 4 && !x.reviewed;
      }).length;
    var it = [
      ["HORAS·SEM", fmtM(wk), dlt(wk, pw)],
      ["HOJE", fmtM(day), dlt(day, yd)],
      ["ACERTO", a1 == null ? "–" : a1 + "%", da],
      ["PÁGINAS", String(pg), dlt(pg, ppg)],
      ["SEQUÊNCIA", streak() + "d", { t: "", c: "flat" }],
      ["POMODOROS", String(np), { t: "hoje", c: "flat" }],
      [
        "SALDO·MÊS",
        BRL(sd),
        { t: sd >= 0 ? "▲" : "▼", c: sd >= 0 ? "up" : "down" },
      ],
      ["REVISÃO", String(rev), { t: "temas", c: rev ? "down" : "up" }],
    ];
    var half = it
      .map(function (i) {
        return (
          '<span class="tkp"><b>' +
          esc(i[0]) +
          "</b>" +
          esc(i[1]) +
          ' <span class="' +
          esc(i[2].c) +
          '">' +
          esc(i[2].t) +
          "</span></span>"
        );
      })
      .join("");
    return (
      '<div class="ticker" role="marquee" aria-label="Indicadores resumidos"><div class="track"><span class="half">' +
      half +
      '</span><span class="half" aria-hidden="true">' +
      half +
      "</span></div></div>"
    );
  }
  function brainGraph(H) {
    var W = 640,
      cx = W / 2,
      cy = H / 2,
      hubs = {};
    S.sessions.forEach(function (x) {
      var k = tkey(x.tag);
      if (!k) return;
      hubs[k] = hubs[k] || { k: k, min: 0, th: [] };
      hubs[k].min += x.min;
    });
    S.themes.forEach(function (x) {
      var k = tkey(x.tag);
      if (!k) return;
      hubs[k] = hubs[k] || { k: k, min: 0, th: [] };
      hubs[k].th.push(x);
    });
    var arr = Object.keys(hubs)
      .map(function (k) {
        return hubs[k];
      })
      .sort(function (a, b) {
        return b.min + b.th.length * 60 - (a.min + a.th.length * 60);
      })
      .slice(0, 7);
    if (!arr.length)
      return (
        '<div class="home-empty"><p class="empty">Registre uma sessão com tag para começar seu mapa de conhecimento.</p><button class="btn sm" data-a="tab" data-tab="estudo" data-focus="s-tag">Registrar sessão</button></div>'
      );
    var rx = W * 0.3,
      ry = H * 0.29,
      n = arr.length,
      mx = Math.max.apply(
        null,
        arr
          .map(function (h) {
            return h.min;
          })
          .concat([1]),
      );
    var lines = "",
      nodes = "",
      labels = "";
    var dc = function (d) {
      return d >= 5
        ? "var(--bad)"
        : d === 4
          ? "var(--warn)"
          : d === 3
            ? "var(--a1)"
            : "var(--good)";
    };
    arr.forEach(function (h, i) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / n,
        hx = cx + rx * Math.cos(a),
        hy = cy + ry * Math.sin(a),
        hr = 9 + 9 * Math.sqrt(h.min / mx),
        col = tcolor(h.k);
      lines +=
        '<line class="ed" x1="' +
        cx +
        '" y1="' +
        cy +
        '" x2="' +
        hx.toFixed(1) +
        '" y2="' +
        hy.toFixed(1) +
        '"/>';
      var th = h.th
          .slice()
          .sort(function (p, q) {
            return p.date < q.date ? 1 : -1;
          })
          .slice(0, 6),
        m = th.length;
      th.forEach(function (x, j) {
        var aj = a + (m > 1 ? -0.55 + (1.1 * j) / (m - 1) : 0),
          r = hr + 22 + (j % 2) * 14,
          tx = hx + r * Math.cos(aj),
          ty = hy + r * Math.sin(aj);
        lines +=
          '<line class="ed e2" x1="' +
          hx.toFixed(1) +
          '" y1="' +
          hy.toFixed(1) +
          '" x2="' +
          tx.toFixed(1) +
          '" y2="' +
          ty.toFixed(1) +
          '"/>';
        nodes +=
          '<circle cx="' +
          tx.toFixed(1) +
          '" cy="' +
          ty.toFixed(1) +
          '" r="5" style="fill:' +
          dc(x.diff) +
          '" opacity="' +
          (x.reviewed ? 0.3 : 1) +
          '"><title>' +
          esc(x.title) +
          " · dificuldade " +
          esc(x.diff) +
          "/5" +
          (x.reviewed ? " · revisado" : "") +
          "</title></circle>";
      });
      nodes +=
        '<circle cx="' +
        hx.toFixed(1) +
        '" cy="' +
        hy.toFixed(1) +
        '" r="' +
        hr.toFixed(1) +
        '" style="fill:color-mix(in srgb,' +
        col +
        " 22%,var(--surface));stroke:" +
        col +
        '" stroke-width="2"><title>' +
        esc(tlabel(h.k)) +
        " · " +
        fmtM(h.min) +
        "</title></circle>";
      labels +=
        '<text x="' +
        hx.toFixed(1) +
        '" y="' +
        (hy < cy ? hy - hr - 7 : hy + hr + 15).toFixed(1) +
        '" text-anchor="middle">' +
        esc(tlabel(h.k)) +
        "</text>";
    });
    var core =
      '<circle class="pulse" cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="15" fill="var(--a1)" opacity=".4"/><circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="15" fill="url(#cg)"/><text x="' +
      cx +
      '" y="' +
      (cy + 5) +
      '" text-anchor="middle" style="fill:var(--on-a);font:700 14px var(--display)">' +
      esc((S.name || "?").charAt(0).toUpperCase()) +
      "</text>";
    return (
      '<svg class="graph" viewBox="0 0 ' +
      W +
      " " +
      H +
      '" role="img" aria-label="Mapa de conhecimento: tags e temas estudados"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
      lines +
      nodes +
      labels +
      core +
      "</svg>" +
      '<div class="glegend"><span><i style="background:var(--bad)"></i>muito difícil</span><span><i style="background:var(--warn)"></i>difícil</span><span><i style="background:var(--a1)"></i>médio</span><span><i style="background:var(--good)"></i>fácil</span><span>nós claros = revisado</span></div>'
    );
  }
  function donut(segs, center, sub, small) {
    var r = 58,
      C = 2 * Math.PI * r,
      tot = sum(segs, function (s) {
        return s.m;
      }),
      cum = 0,
      s = "";
    s +=
      '<circle cx="75" cy="75" r="' +
      r +
      '" fill="none" stroke="var(--surface2)" stroke-width="14"/>';
    if (tot > 0)
      segs.forEach(function (g) {
        var len = (g.m / tot) * C,
          gap = segs.length > 1 ? 3 : 0;
        if (len > gap)
          s +=
            '<circle cx="75" cy="75" r="' +
            r +
            '" fill="none" style="stroke:' +
            tcolor(g.k) +
            '" stroke-width="14" stroke-dasharray="' +
            (len - gap) +
            " " +
            (C - len + gap) +
            '" stroke-dashoffset="' +
            -cum +
            '" transform="rotate(-90 75 75)"/>';
        cum += len;
      });
    return (
      '<div class="ringbox' +
      (small ? " sm" : "") +
      '"><svg viewBox="0 0 150 150" aria-hidden="true">' +
      s +
      '</svg><div class="c"><b>' +
      esc(center) +
      "</b><span>" +
      esc(sub) +
      "</span></div></div>"
    );
  }
  function heat() {
    var t = today(),
      start = addDays(wkStart(t), -77),
      c = "";
    for (var i = 0; i < 84; i++) {
      var d = addDays(start, i),
        m = minsOn(d),
        l = m === 0 ? 0 : m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4;
      c +=
        d > t
          ? '<i class="fut"></i>'
          : '<i class="l' +
            l +
            '" title="' +
            fmtD(d) +
            ": " +
            fmtM(m) +
            '"></i>';
    }
    return (
      '<div class="heat" role="img" aria-label="Mapa de estudo das últimas 12 semanas">' +
      c +
      "</div>"
    );
  }

  /* ---------- telas ---------- */
  var TABS = [
    ["inicio", "Início", "M3 11l9-8 9 8v9H3z", ""],
    [
      "foco",
      "Pomodoro",
      "M10 2h4M12 5a8 8 0 100 16 8 8 0 000-16zM12 9v4l2.5 1.5",
      "Estudos",
    ],
    [
      "estudo",
      "Estudo",
      "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
      "Estudos",
    ],
    ["temas", "Temas", "M6 3h12v18l-6-4-6 4z", "Estudos"],
    ["leitura", "Leitura", "M5 4h13v16H7a2 2 0 01-2-2V4zM9 8h6", "Estudos"],
    [
      "desempenho",
      "Desempenho",
      "M4 20V10M10 20V4M16 20v-7M22 20H2",
      "Estudos",
    ],
    ["agenda", "Agenda", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Vida"],
    [
      "tarefas",
      "Atividades",
      "M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6",
      "Vida",
    ],
    ["rotina", "Rotina", "M21 12a9 9 0 11-3-6.7M21 3v6h-6", "Vida"],
    [
      "habitos",
      "Hábitos",
      "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z",
      "Vida",
    ],
    [
      "metas",
      "Metas",
      "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
      "Vida",
    ],
    ["financas", "Finanças", "M3 7h18v12H3zM3 11h18M16 15h2", "Vida"],
    [
      "grupos",
      "Grupos",
      "M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM16 13c-1.1 0-2.15.2-3.09.56 1.29.82 2.09 1.84 2.09 2.94V19h7v-2c0-2.21-3.13-4-6-4zM8 13c-3 0-6 1.79-6 4v2h11v-2c0-2.21-2.69-4-5-4z",
      "Comunidade",
    ],
    [
      "sistema",
      "Sistema",
      "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3",
      "",
    ],
  ];

  var N = window.DesvelarNavigation;

  if (!N) {
    throw new Error("O módulo de navegação do DESVELAR não foi carregado.");
  }

  function navHtml(heads) {
    return N.render(TABS, tab, heads);
  }

  var LOGO =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs><path d="M3.5 16Q16 5 28.5 16Q16 27 3.5 16Z" fill="none" stroke="url(#lg)" stroke-width="2"/><circle cx="16" cy="16" r="4.6" fill="url(#lg)"/><circle cx="17.6" cy="14.4" r="1.2" fill="var(--bg)"/></svg>';

  var Common = window.DesvelarCommon;

  if (!Common) {
    throw new Error("Os componentes comuns do DESVELAR não foram carregados.");
  }

  function head(title, sub) {
    return Common.head(title, sub, {
      saveOk: saveOk,
      hasDemo: hasDemo(),
      realCount: realCount(),
      activeTab: tab,
    });
  }

  var GroupViews = window.DesvelarGroupViews.create({
    head: head,
    esc: esc,
    repository: window.DesvelarGroupRepository,
  });
  var TaskViews = window.DesvelarTaskViews.create({
    getState: stateStore.getState,
    today: today,
    esc: esc,
    chip: chip,
    fmtD: fmtD,
    head: head,
    tagInput: tagInput,
  });
  var LearningViews = window.DesvelarLearningViews.create({
    getState: stateStore.getState,
    today: today,
    wkStart: wkStart,
    addDays: addDays,
    fmtD: fmtD,
    fmtM: fmtM,
    esc: esc,
    chip: chip,
    tagInput: tagInput,
    head: head,
    sum: sum,
    tkey: tkey,
    groupMin: groupMin,
    pagesRange: pagesRange,
    pagesRangeBook: pagesRangeBook,
    bookLog: bookLog,
    barChart: barChart,
    brainGraph: brainGraph,
  });
  var BRL = function (n) {
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };
  var LifeViews = window.DesvelarLifeViews.create({
    getState: stateStore.getState,
    getFinanceMonth: function () {
      return finM;
    },
    today: today,
    addDays: addDays,
    pd: pd,
    fmtD: fmtD,
    fmtM: fmtM,
    pad: pad,
    esc: esc,
    chip: chip,
    tagInput: tagInput,
    head: head,
    sum: sum,
    tkey: tkey,
    tlabel: tlabel,
    tcolor: tcolor,
    donut: donut,
    barChart: barChart,
    BRL: BRL,
    daysBetween: daysBetween,
    gprog: gprog,
    months: MES,
    weekdays: DIAS,
  });
  var FocusViews = window.DesvelarFocusViews.create({
    getState: stateStore.getState,
    getZen: function () {
      return zen;
    },
    circumference: PC,
    today: today,
    tkey: tkey,
    tlabel: tlabel,
    phaseName: phaseName,
    pomoRem: pomoRem,
    fmtClock: fmtClock,
    esc: esc,
    chip: chip,
    sum: sum,
    minsOn: minsOn,
    fmtM: fmtM,
    head: head,
  });
  var PerformanceViews = window.DesvelarPerformanceViews.create({
    getState: stateStore.getState,
    today: today,
    wkStart: wkStart,
    addDays: addDays,
    fmtD: fmtD,
    fmtM: fmtM,
    minsRange: minsRange,
    accByTag: accByTag,
    groupMin: groupMin,
    barChart: barChart,
    heat: heat,
    head: head,
    chip: chip,
    esc: esc,
    tagInput: tagInput,
    sum: sum,
  });
  var SystemViews = window.DesvelarSystemViews.create({
    getState: stateStore.getState,
    getCloudSyncStatus: cloudSync.getStatusLabel,
    getWipeArm: function () {
      return wipeArm;
    },
    head: head,
    esc: esc,
  });
  var AgendaViews = window.DesvelarAgendaViews.create({
    getState: stateStore.getState,
    getCalendar: function () {
      return { month: calM, selectedDay: selDay };
    },
    today: today,
    addDays: addDays,
    ds: ds,
    pd: pd,
    esc: esc,
    head: head,
    months: MES,
    weekdays: DIAS,
  });
  var FormController = window.DesvelarFormController.create({
    stateStore: stateStore,
    getSelectedDay: function () {
      return selDay;
    },
    getUserId: function () {
      return window.desvelarUser.id;
    },
    uid: uid,
    commit: commit,
    toast: toast,
    groupRepository: window.DesvelarGroupRepository,
    feedbackRepository: window.DesvelarFeedbackRepository,
  });
  var ActionController = window.DesvelarActionController.create({
    stateStore: stateStore,
    setTheme: applyTheme,
    verifyPassword: verifyAccountPassword,
    signOut: signOutAccount,
    toast: toast,
    getUiState: function () {
      return {
        tab: tab,
        zen: zen,
        finM: finM,
        calM: calM,
        selDay: selDay,
        wipeArm: wipeArm,
      };
    },
    setUiState: function (updates) {
      if (Object.prototype.hasOwnProperty.call(updates, "tab")) {
        tab = updates.tab;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "zen")) {
        zen = updates.zen;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "finM")) {
        finM = updates.finM;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "calM")) {
        calM = updates.calM;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "selDay")) {
        selDay = updates.selDay;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "wipeArm")) {
        wipeArm = updates.wipeArm;
      }
    },
    lists: LISTS,
    uid: uid,
    today: today,
    dateKey: ds,
    parseDate: pd,
    pomoRem: pomoRem,
    pomoStart: pomoStart,
    pomoPause: pomoPause,
    pomoComplete: pomoComplete,
    render: render,
    commit: commit,
  });

  async function vInicio() {
    var groupGoalsHtml = await GroupViews.homeGroupGoals(
      window.desvelarUser.id,
    );
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
    var ym0 = t.slice(0, 7),
      mSaldo = sum(
        S.txs.filter(function (x) {
          return x.date.slice(0, 7) === ym0;
        }),
        function (x) {
          return x.type === "in" ? x.amount : -x.amount;
        },
      );
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
      kpi(
        "Saldo do mês",
        BRL(mSaldo),
        {
          t: mSaldo >= 0 ? "▲ positivo" : "▼ negativo",
          c: mSaldo >= 0 ? "up" : "down",
        },
        null,
        "",
      ) +
      kpi(
        "Sequência",
        streak() + " d",
        { t: np + " pomodoro(s) hoje", c: "flat" },
        null,
        "",
      ) +
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
      ? '<div class="card"><h2>Pontos de atenção</h2><div style="display:flex;flex-direction:column;gap:8px">' +
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
        hi + ", " + S.name,
        pd(t).getDate() +
          " de " +
          MES[pd(t).getMonth()] +
          " · semana de " +
          fmtD(ws),
      ) +
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
  function phaseName(r) {
    return PomodoroDomain.phaseName(r);
  }
  function pomoRem(r) {
    return PomodoroDomain.remaining(r, Date.now());
  }
  function fmtClock(sec) {
    return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60);
  }
  function vFoco() {
    return FocusViews.focusPage();
  }
  function gprog(g) {
    return g.ms.length
      ? Math.round(
          (g.ms.filter(function (m) {
            return m.done;
          }).length /
            g.ms.length) *
            100,
        )
      : Math.max(0, Math.min(100, g.manual || 0));
  }
  function vTemas() {
    return LearningViews.themesPage();
  }
  function vHabitos() {
    return LifeViews.habitsPage();
  }
  function vFinancas() {
    return LifeViews.financePage();
  }
  function vMetas() {
    return LifeViews.goalsPage();
  }
  function vRotina() {
    return LifeViews.routinePage();
  }
  function vEstudo() {
    return LearningViews.studyPage();
  }
  function vLeitura() {
    return LearningViews.readingPage();
  }
  function pagesRangeBook(b, a, z) {
    return sum(
      S.readlog.filter(function (r) {
        return r.bookId === b.id && r.date >= a && r.date <= z;
      }),
      function (r) {
        return r.pages;
      },
    );
  }

  function vAgenda() {
    return AgendaViews.agendaPage();
  }

  function vTarefas() {
    return TaskViews.tasksPage();
  }

  function vDesempenho() {
    return PerformanceViews.performancePage();
  }
  function vSistema() {
    return SystemViews.systemPage();
  }
  function vGrupos() {
    return GroupViews.groupsPage(window.desvelarUser.id);
  }
  var VIEWS = {
    inicio: vInicio,
    foco: vFoco,
    temas: vTemas,
    habitos: vHabitos,
    financas: vFinancas,
    metas: vMetas,
    rotina: vRotina,
    estudo: vEstudo,
    leitura: vLeitura,
    agenda: vAgenda,
    tarefas: vTarefas,
    desempenho: vDesempenho,
    grupos: vGrupos,
    sistema: vSistema,
  };
  function render() {
    buildTags();
    document.getElementById("sidenav").innerHTML =
      '<div class="brand">' +
      LOGO +
      '<div><span class="wm">DESVELAR</span><small>second brain · estudos e vida</small></div></div>' +
      navHtml(true) +
      '<div class="sync' +
      (saveOk ? "" : " bad") +
      '"><i></i>' +
      (saveOk ? "Salvo neste navegador" : "Sem salvar") +
      "</div>";
    document.getElementById("botnav").innerHTML = navHtml(false);
    if (tab !== "foco") zen = false;
    document.body.classList.toggle("zen", zen);
    var currentTab = tab;
    document.getElementById("view").innerHTML =
      (zen ? "" : tickerHtml()) +
      '<div class="card"><p class="m">Carregando...</p></div>';

    Promise.resolve()
      .then(function () {
        return VIEWS[currentTab]();
      })
      .then(function (html) {
        if (tab === currentTab) {
          document.getElementById("view").innerHTML =
            (zen ? "" : tickerHtml()) + html;
          tick();
        }
      })
      .catch(function (error) {
        console.error("Erro ao carregar a tela " + currentTab + ":", error);
        if (tab !== currentTab) return;

        document.getElementById("view").innerHTML =
          (zen ? "" : tickerHtml()) +
          '<div class="card"><h2>Não foi possível abrir esta tela</h2><p class="m">Verifique sua conexão e tente novamente.</p><button class="btn" data-a="retry">Tentar novamente</button></div>';
      });
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.getElementById("toasts").appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 2400);
  }
  function commit(msg, savedResult) {
    var saved =
      typeof savedResult === "boolean" ? savedResult : persist();
    saveOk = saved;
    render();

    if (!saved) {
      toast("Não foi possível salvar esta alteração. Verifique o armazenamento e tente novamente.");
      return;
    }

    if (msg) toast(msg);
  }
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      theme = "system";
      document.documentElement.removeAttribute("data-theme");
    }

    try {
      if (theme === "system") {
        window.localStorage.removeItem("painel-tema");
      } else {
        window.localStorage.setItem("painel-tema", theme);
      }
    } catch (error) {}
  }

  async function verifyAccountPassword(password) {
    if (!password || !window.desvelarUser || !window.desvelarUser.email) {
      return false;
    }

    var result = await window.desvelarSupabase.auth.signInWithPassword({
      email: window.desvelarUser.email,
      password: password,
    });

    if (result.error) {
      if (
        result.error.status === 400 ||
        result.error.code === "invalid_credentials"
      ) {
        return false;
      }
      throw result.error;
    }

    return Boolean(
      result.data &&
        result.data.user &&
        result.data.user.id === window.desvelarUser.id,
    );
  }

  var signingOut = false;

  async function signOutAccount() {
    if (signingOut) return false;
    signingOut = true;

    try {
      var saveResult = await cloudSync.flush();
      if (!saveResult.saved) {
        toast("Não foi possível salvar neste navegador. Você continua conectado.");
        return false;
      }

      if (
        !saveResult.synced &&
        !window.confirm(
          "Não foi possível sincronizar agora. Seu progresso está salvo neste navegador e tentará sincronizar na próxima entrada. Sair mesmo assim?",
        )
      ) {
        return false;
      }

      var result = await window.desvelarSupabase.auth.signOut();
      if (result.error) throw result.error;

      window.location.reload();
      return true;
    } finally {
      signingOut = false;
    }
  }

  /* ---------- pomodoro ---------- */
  function pomoComplete(atMs, targetState) {
    PomodoroDomain.complete(targetState || S, atMs);
  }
  function pomoStart(tag, intent, targetState) {
    PomodoroDomain.start(targetState || S, tag, intent, Date.now());
    try {
      if (window.Notification && Notification.permission === "default")
        Notification.requestPermission();
    } catch (x) {}
  }
  function pomoPause(targetState) {
    PomodoroDomain.pause(targetState || S, Date.now());
  }
  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext,
        a = new C();
      [0, 0.28, 0.56].forEach(function (t, i) {
        var o = a.createOscillator(),
          g = a.createGain();
        o.frequency.value = i === 2 ? 880 : 660;
        o.connect(g);
        g.connect(a.destination);
        g.gain.setValueAtTime(0.0001, a.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.22);
        o.start(a.currentTime + t);
        o.stop(a.currentTime + t + 0.25);
      });
    } catch (e) {}
  }
  function notify(title, body) {
    try {
      if (window.Notification && Notification.permission === "granted")
        new Notification(title, { body: body });
    } catch (e) {}
  }
  function burst() {
    try {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      var box = document.querySelector(".dial");
      if (!box) return;
      var cols = ["var(--a1)", "var(--a2)", "var(--good)", "var(--warn)"];
      for (var i = 0; i < 26; i++) {
        (function (i) {
          var d = document.createElement("span");
          d.className = "pt";
          d.style.background = cols[i % 4];
          box.appendChild(d);
          var ang = Math.random() * Math.PI * 2,
            dist = 100 + Math.random() * 110,
            dx = Math.cos(ang) * dist,
            dy = Math.sin(ang) * dist;
          var an = d.animate(
            [
              { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
              {
                transform:
                  "translate(calc(-50% + " +
                  dx +
                  "px),calc(-50% + " +
                  dy +
                  "px)) scale(.2)",
                opacity: 0,
              },
            ],
            {
              duration: 900 + Math.random() * 600,
              easing: "cubic-bezier(.2,.8,.3,1)",
            },
          );
          an.onfinish = function () {
            d.remove();
          };
        })(i);
      }
    } catch (e) {}
  }
  function setArc(frac) {
    var el,
      ang = ((-90 + frac * 360) * Math.PI) / 180;
    ["pring", "pglow"].forEach(function (id) {
      if ((el = document.getElementById(id)))
        el.setAttribute("stroke-dasharray", PC * frac + " " + PC);
    });
    if ((el = document.getElementById("pknob"))) {
      el.setAttribute("cx", (160 + 118 * Math.cos(ang)).toFixed(1));
      el.setAttribute("cy", (160 + 118 * Math.sin(ang)).toFixed(1));
    }
    var g = document.getElementById("pticks");
    if (g) {
      var ls = g.children;
      for (var i = 0; i < ls.length; i++)
        ls[i].setAttribute(
          "class",
          "tickl" + ((i + 1) / 60 <= frac + 1e-6 ? " on" : ""),
        );
    }
  }
  function tick() {
    var fin = null;
    while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
      fin = S.pomoRun.phase;
      pomoComplete(S.pomoRun.end);
    }
    if (fin) {
      var saved = persist();
      var msg;

      if (fin === "focus") {
        msg = saved
          ? "Foco concluído e salvo. Hora da pausa."
          : "Foco concluído, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.";
      } else {
        msg = saved
          ? "Pausa terminou. Pronto para o próximo foco?"
          : "Pausa terminou, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.";
      }

      beep();
      notify("DESVELAR", msg);
      render();
      toast(msg);

      if (fin === "focus" && tab === "foco") burst();

      return;
    }
    var r = S.pomoRun,
      el;
    if (r) {
      var rem = pomoRem(r),
        txt = fmtClock(rem);
      document.title = txt + " · " + phaseName(r) + " — DESVELAR";
      if ((el = document.getElementById("pclock"))) el.textContent = txt;
      if ((el = document.getElementById("mclock"))) el.textContent = txt;
      if (r.end) setArc(Math.max(0, Math.min(1, rem / r.dur)));
    } else document.title = "DESVELAR";
  }
  setInterval(tick, 1000);

  /* ---------- ações ---------- */
  document.addEventListener("click", function (event) {
    ActionController.handleClick(event).catch(function (error) {
      console.error("Erro ao processar ação:", error);
      toast("Não foi possível concluir esta ação. Tente novamente.");
    });
  });
  document.addEventListener("submit", function (event) {
    FormController.submit(event).catch(function (error) {
      console.error("Erro ao processar formulário:", error);
      toast("Não foi possível concluir esta ação. Tente novamente.");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && zen) {
      zen = false;
      render();
      return;
    }
    if (e.code !== "Space" || tab !== "foco") return;
    var el = e.target,
      tn = el && el.tagName;
    if (
      tn === "INPUT" ||
      tn === "SELECT" ||
      tn === "TEXTAREA" ||
      tn === "BUTTON"
    )
      return;
    e.preventDefault();
    if (!S.pomoRun) {
      var ti = document.getElementById("pomo-tag"),
        ii = document.getElementById("pomo-intent");
      pomoStart(
        ti ? ti.value.trim() : S.pomo.lastTag,
        ii ? ii.value.trim() : "",
      );
    } else pomoPause();
    commit();
  });

  try {
    load();
  } catch (e) {
    console.error("Erro ao carregar os dados do DESVELAR:", e);

    var warning = document.createElement("div");
    warning.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#111827;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;text-align:center;font-family:Arial,sans-serif;";

    var title = document.createElement("h2");
    title.textContent = "Não foi possível carregar seus dados";

    var message = document.createElement("p");
    message.textContent =
      "O DESVELAR encontrou um problema ao acessar os dados salvos. Nenhum dado será sobrescrito automaticamente. Não limpe os dados do navegador.";

    warning.appendChild(title);
    warning.appendChild(message);
    document.body.appendChild(warning);

    return;
  }

  var caught = false;
  while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
    pomoComplete(S.pomoRun.end);
    caught = true;
  }

  var initSaved = persist();
  var legacyMigration = localData.hasLegacyMigration();
  var migrationFinalized = localData.finalizeLegacyMigration(initSaved);
  render();

  if (legacyMigration) {
    toast(
      !initSaved
        ? "Não foi possível salvar a migração. Os dados originais foram preservados."
        : migrationFinalized
          ? "Dados locais mesclados na sua conta. A cópia original foi preservada."
          : "Dados copiados, mas não foi possível finalizar a migração. A cópia original foi preservada.",
    );
  }

  if (caught) {
    toast(
      initSaved
        ? "Pomodoro concluído enquanto a aba estava fechada."
        : "Pomodoro concluído, mas não foi possível salvar os dados. Verifique a sincronização na tela Sistema.",
    );
  }

  try {
    if (navigator.storage && navigator.storage.persist)
      navigator.storage.persist();
  } catch (e) {}

  window.addEventListener("online", function () {
    cloudSync.handleOnline();
  });
})();

