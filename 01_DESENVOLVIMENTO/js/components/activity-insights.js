(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState",
      "today",
      "wkStart",
      "addDays",
      "fmtD",
      "fmtM",
      "esc",
      "sum",
      "BRL",
      "minsOn",
      "minsRange",
      "pagesRange",
      "streak",
      "questionTotalsInRange",
      "isReviewDue",
      "tagKey",
      "tagLabel",
      "tagColor",
    ];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências dos indicadores do DESVELAR não foram informadas.");
    }

    var S = null;
    var today = dependencies.today;
    var wkStart = dependencies.wkStart;
    var addDays = dependencies.addDays;
    var fmtD = dependencies.fmtD;
    var fmtM = dependencies.fmtM;
    var esc = dependencies.esc;
    var sum = dependencies.sum;
    var BRL = dependencies.BRL;
    var minsOn = dependencies.minsOn;
    var minsRange = dependencies.minsRange;
    var pagesRange = dependencies.pagesRange;
    var streak = dependencies.streak;
    var qTotRange = dependencies.questionTotalsInRange;
    var tkey = dependencies.tagKey;
    var tlabel = dependencies.tagLabel;
    var tcolor = dependencies.tagColor;

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
      S = dependencies.getState();
      var t = today(),
        ws = wkStart(t),
        we = addDays(ws, 6),
        pws = addDays(ws, -7),
        pwe = addDays(ws, -1);
      var wk = minsRange(ws, we),
        pw = minsRange(pws, pwe),
        day = minsOn(t),
        yd = minsOn(addDays(t, -1));
      var q1 = qTotRange(ws, we),
        q0 = qTotRange(pws, pwe);
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
          return dependencies.isReviewDue(x, t);
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
        ["REVISÃO", String(rev), { t: "para hoje", c: rev ? "down" : "up" }],
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
      S = dependencies.getState();
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
          '<div class="home-empty"><p class="empty">Registre uma sessão com matéria para começar seu mapa de conhecimento.</p><button class="btn sm" data-a="tab" data-tab="estudo" data-focus="s-tag">Registrar sessão</button></div>'
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
          var reviewDue = dependencies.isReviewDue(x, today());
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
            (x.reviewed && !reviewDue ? 0.3 : 1) +
            '"><title>' +
            esc(x.title) +
            " · dificuldade " +
            esc(x.diff) +
            "/5" +
            (reviewDue
              ? " · revisão pendente"
              : x.reviewed
                ? " · próxima revisão agendada"
                : "") +
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
        '" role="img" aria-label="Mapa de conhecimento: matérias e temas estudados"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
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
              '" transform="rotate(-90 75 75)"><title>' +
              esc(
                g.label +
                  ": " +
                  (small ? BRL(g.m) : fmtM(g.m)),
              ) +
              "</title></circle>";
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
        c = "",
        hasStudy = false;
      for (var i = 0; i < 84; i++) {
        var d = addDays(start, i),
          m = minsOn(d),
          l = m === 0 ? 0 : m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4;
        if (d <= t && m > 0) hasStudy = true;
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
      if (!hasStudy)
        return (
          '<div class="chart-empty compact" role="status">Registre uma sessão para acompanhar sua constância aqui.</div>'
        );
      return (
        '<div class="heat" role="img" aria-label="Mapa de estudo das últimas 12 semanas">' +
        c +
        "</div>"
      );
    }

    return Object.freeze({
      delta: dlt,
      tickerHtml: tickerHtml,
      brainGraph: brainGraph,
      donut: donut,
      heat: heat,
    });
  }

  window.DesvelarActivityInsights = Object.freeze({ create: create });
})();


