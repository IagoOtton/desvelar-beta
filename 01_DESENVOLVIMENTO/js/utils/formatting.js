
(function () {
  "use strict";

  var U = window.DesvelarUtils;

  if (!U) {
    throw new Error("As funções de data do DESVELAR não foram carregadas.");
  }

  window.DesvelarFormatting = (function () {
    var uid = function () {
      return Math.random().toString(36).slice(2, 9);
    };

    var esc = function (s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c];
      });
    };

    var fmtM = function (m) {
      var h = Math.floor(m / 60),
        r = Math.round(m % 60);
      return h + "h" + U.pad(r);
    };

    var sum = function (a, f) {
      return a.reduce(function (x, y) {
        return x + f(y);
      }, 0);
    };

    return {
      uid: uid,
      esc: esc,
      fmtM: fmtM,
      sum: sum,
    };
  })();
})();
