
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

    var fmtD = function (s) {
      var d = pd(s);
      return pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
    };

    return {
      pad: pad,
      ds: ds,
      addDays: addDays,
      today: today,
      wkStart: wkStart,
      fmtD: fmtD,
    };
  })();
})();
