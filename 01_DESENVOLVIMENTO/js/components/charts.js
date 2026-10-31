(function () {
  "use strict";

  var F = window.DesvelarFormatting;

  if (!F) {
    throw new Error(
      "As funções de formatação do DESVELAR não foram carregadas.",
    );
  }

  window.DesvelarCharts = (function () {
    var chartN = 0;

    function niceTop(mx) {
      if (mx <= 0) return 4;

      var mag = Math.pow(10, Math.floor(Math.log10(mx))),
        c = [1, 2, 4, 5, 8, 10];

      for (var i = 0; i < c.length; i++) {
        if (c[i] * mag >= mx) return c[i] * mag;
      }

      return 10 * mag;
    }

    function barChart(items, o) {
      o = o || {};

      var id = "g" + ++chartN,
        W = 640,
        H = o.H || 220,
        L = 38,
        R = o.goal ? 46 : 10,
        T = 16,
        B = 28,
        n = items.length;

      var mx = Math.max.apply(
          null,
          items
            .map(function (x) {
              return x.v;
            })
            .concat([o.goal || 0]),
        ),
        top = niceTop(mx),
        y = function (v) {
          return T + (H - T - B) * (1 - v / top);
        },
        bw = (W - L - R) / n,
        s = "";

      s +=
        '<defs><linearGradient id="' +
        id +
        '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>';

      for (var k = 0; k <= 4; k++) {
        var v = (top / 4) * k;

        s +=
          '<line class="gl" x1="' +
          L +
          '" x2="' +
          (W - R) +
          '" y1="' +
          y(v) +
          '" y2="' +
          y(v) +
          '"/><text x="' +
          (L - 7) +
          '" y="' +
          (y(v) + 4) +
          '" text-anchor="end">' +
          Math.round(v * 10) / 10 +
          F.esc(o.unit || "") +
          "</text>";
      }

      items.forEach(function (it, i) {
        var w = Math.min(bw * 0.55, 34),
          x = L + i * bw + (bw - w) / 2,
          last = i === n - 1,
          h = Math.max(0, y(0) - y(it.v));

        if (it.v > 0)
          s +=
            '<rect x="' +
            x +
            '" y="' +
            y(it.v) +
            '" width="' +
            w +
            '" height="' +
            h +
            '" rx="' +
            Math.min(6, w / 2) +
            '" fill="url(#' +
            id +
            ')" opacity="' +
            (last ? 1 : 0.6) +
            '"/>';

        if (it.v > 0 && n <= 10)
          s +=
            '<text class="vl" x="' +
            (x + w / 2) +
            '" y="' +
            (y(it.v) - 6) +
            '" text-anchor="middle">' +
            Math.round(it.v * 10) / 10 +
            "</text>";

        if (n <= 10 || i % 2 === (n - 1) % 2)
          s +=
            '<text x="' +
            (x + w / 2) +
            '" y="' +
            (H - 8) +
            '" text-anchor="middle">' +
            F.esc(it.l) +
            "</text>";
      });

      if (o.goal)
        s +=
          '<line class="goal" x1="' +
          L +
          '" x2="' +
          (W - R) +
          '" y1="' +
          y(o.goal) +
          '" y2="' +
          y(o.goal) +
          '"/><text class="gt" x="' +
          (W - R + 5) +
          '" y="' +
          (y(o.goal) + 4) +
          '">meta</text>';

      return (
        '<svg class="ch" viewBox="0 ' +
        "0 " +
        W +
        " " +
        H +
        '" role="img" aria-label="' +
        F.esc(o.label || "Gráfico") +
        '">' +
        s +
        "</svg>"
      );
    }

    function areaChart(vals, labels, o) {
      o = o || {};

      var id = "a" + ++chartN,
        W = 640,
        H = o.H || 230,
        L = 36,
        R = 16,
        T = 14,
        B = 26,
        n = vals.length;

      var mx = Math.max.apply(null, vals.concat([0.5])),
        top = niceTop(mx);

      var x = function (i) {
          return L + (i * (W - L - R)) / (n - 1);
        },
        y = function (v) {
          return T + (H - T - B) * (1 - v / top);
        };

      var ma = vals.map(function (_, i) {
        var seg = vals.slice(Math.max(0, i - 6), i + 1);

        return (
          F.sum(seg, function (z) {
            return z;
          }) / seg.length
        );
      });

      var pts = vals.map(function (v, i) {
          return x(i).toFixed(1) + "," + y(v).toFixed(1);
        }),
        mpts = ma.map(function (v, i) {
          return x(i).toFixed(1) + "," + y(v).toFixed(1);
        });

      var s =
        '<defs><linearGradient id="' +
        id +
        '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)" stop-opacity=".38"/><stop offset="1" stop-color="var(--a1)" stop-opacity="0"/></linearGradient></defs>';

      for (var k = 0; k <= 4; k++) {
        var v = (top / 4) * k;

        s +=
          '<line class="gl" x1="' +
          L +
          '" x2="' +
          (W - R) +
          '" y1="' +
          y(v) +
          '" y2="' +
          y(v) +
          '"/><text x="' +
          (L - 7) +
          '" y="' +
          (y(v) + 4) +
          '" text-anchor="end">' +
          Math.round(v * 10) / 10 +
          F.esc(o.unit || "") +
          "</text>";
      }

      s +=
        '<polygon points="' +
        x(0) +
        "," +
        y(0) +
        " " +
        pts.join(" ") +
        " " +
        x(n - 1) +
        "," +
        y(0) +
        '" fill="url(#' +
        id +
        ')"/>';

      s +=
        '<polyline points="' +
        mpts.join(" ") +
        '" fill="none" stroke="var(--a2)" stroke-width="1.6" stroke-dasharray="5 4"/>';

      s +=
        '<polyline points="' +
        pts.join(" ") +
        '" fill="none" stroke="var(--a1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

      labels.forEach(function (l, i) {
        if (i % 5 === (n - 1) % 5)
          s +=
            '<text x="' +
            x(i) +
            '" y="' +
            (H - 8) +
            '" text-anchor="middle">' +
            F.esc(l) +
            "</text>";
      });

      s +=
        '<circle cx="' +
        x(n - 1) +
        '" cy="' +
        y(vals[n - 1]) +
        '" r="4.5" fill="var(--a1)" stroke="var(--surface)" stroke-width="2"/>';

      return (
        '<svg class="ch" viewBox="0 ' +
        "0 " +
        W +
        " " +
        H +
        '" role="img" aria-label="' +
        F.esc(o.label || "Gráfico de área") +
        '">' +
        s +
        "</svg>"
      );
    }

    function spark(vals, cls) {
      var n = vals.length,
        mx = Math.max.apply(null, vals.concat([1])),
        id = "s" + ++chartN;

      var pts = vals
        .map(function (v, i) {
          return (
            ((i * 120) / (n - 1)).toFixed(1) +
            "," +
            (31 - (v / mx) * 27).toFixed(1)
          );
        })
        .join(" ");

      return (
        '<svg class="sp ' +
        F.esc(cls) +
        '" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' +
        id +
        '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".3"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,34 ' +
        pts +
        ' 120,34" fill="url(#' +
        id +
        ')"/><polyline points="' +
        pts +
        '" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>'
      );
    }

    function kpi(label, value, d, series, note) {
      return (
        '<div class="kpi"><span class="l">' +
        F.esc(label) +
        '</span><span class="v">' +
        F.esc(value) +
        '</span><span class="d ' +
        F.esc(d.c) +
        '">' +
        F.esc(d.t) +
        (note ? ' <span class="m">' + F.esc(note) + "</span>" : "") +
        "</span>" +
        (series ? spark(series, d.c) : "") +
        "</div>"
      );
    }

    function ring(pct, center, sub) {
      var id = "r" + ++chartN,
        r = 54,
        C = 2 * Math.PI * r,
        p = Math.max(0, Math.min(100, pct));

      return (
        '<div class="ringbox"><svg viewBox="0 0 132 132" aria-hidden="true"><defs><linearGradient id="' +
        id +
        '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--chart-primary)"/><stop offset="1" stop-color="var(--chart-secondary)"/></linearGradient></defs>' +
        '<circle cx="66" cy="66" r="' +
        r +
        '" fill="none" stroke="var(--surface2)" stroke-width="11"/>' +
        '<circle cx="66" cy="66" r="' +
        r +
        '" fill="none" stroke="url(#' +
        id +
        ')" stroke-width="11" stroke-linecap="round" stroke-dasharray="' +
        (C * p) / 100 +
        " " +
        C +
        '" transform="rotate(-90 66 66)"/></svg>' +
        '<div class="c"><b>' +
        F.esc(center) +
        "</b><span>" +
        F.esc(sub) +
        "</span></div></div>"
      );
    }

    return {
      barChart: barChart,
      areaChart: areaChart,
      spark: spark,
      kpi: kpi,
      ring: ring,
    };
  })();
})();
