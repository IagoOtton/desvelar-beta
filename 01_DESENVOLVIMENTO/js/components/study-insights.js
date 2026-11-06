(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "getState", "today", "wkStart", "addDays", "fmtD", "fmtM", "esc",
      "minsOn", "isReviewDue", "tagKey", "tagLabel", "tagColor",
    ];
    if (!dependencies || required.some(function (key) { return typeof dependencies[key] !== "function"; })) {
      throw new Error("As dependências dos indicadores de Estudos não foram informadas.");
    }

    var today = dependencies.today;
    var wkStart = dependencies.wkStart;
    var addDays = dependencies.addDays;
    var fmtD = dependencies.fmtD;
    var fmtM = dependencies.fmtM;
    var esc = dependencies.esc;
    var minsOn = dependencies.minsOn;
    var isReviewDue = dependencies.isReviewDue;
    var tkey = dependencies.tagKey;
    var tlabel = dependencies.tagLabel;
    var tcolor = dependencies.tagColor;
    function brainGraph(H) {
      var S = dependencies.getState();
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
          '<div class="study-insights-empty"><p class="empty">Registre uma sessão com matéria para começar seu mapa de conhecimento.</p><button class="btn sm" data-a="tab" data-tab="estudo" data-focus="s-tag">Registrar sessão</button></div>'
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

    return Object.freeze({ brainGraph: brainGraph, heat: heat });
  }

  window.DesvelarStudyInsights = Object.freeze({ create: create });
})();
