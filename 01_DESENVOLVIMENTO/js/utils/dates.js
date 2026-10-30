
(function () {
  "use strict";

  window.DesvelarUtils = (function () {
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };

    var ds = function (d) {
      return (
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate())
      );
    };

    var pd = function (s) {
      var a = s.split("-").map(Number);
      return new Date(a[0], a[1] - 1, a[2]);
    };

    var addDays = function (s, n) {
      var d = pd(s);
      d.setDate(d.getDate() + n);
      return ds(d);
    };

    var today = function () {
      return ds(new Date());
    };

    var wkStart = function (s) {
      var d = pd(s);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return ds(d);
    };

    var MES = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];

    var DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

    var fmtD = function (s) {
      var d = pd(s);
      return pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
    };

    var daysBetween = function (a, b) {
      return Math.round((pd(b) - pd(a)) / 864e5);
    };

    return {
      pad: pad,
      ds: ds,
      pd: pd,
      addDays: addDays,
      today: today,
      wkStart: wkStart,
      MES: MES,
      DIAS: DIAS,
      fmtD: fmtD,
      daysBetween: daysBetween,
    };
  })();
})();
