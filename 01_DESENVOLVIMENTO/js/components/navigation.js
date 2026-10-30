
(function () {
  "use strict";

  window.DesvelarNavigation = (function () {
    function render(tabs, activeTab, heads) {
      var last = "x";

      return tabs
        .map(function (t) {
          var h = "";

          if (heads && t[3] && t[3] !== last) {
            h = '<div class="ng">' + t[3] + "</div>";
          }

          if (t[3]) last = t[3];
          else if (heads) last = "";

          return (
            h +
            '<button class="nb" data-a="tab" data-tab="' +
            t[0] +
            '"' +
            (activeTab === t[0] ? ' aria-current="page"' : "") +
            '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
            t[2] +
            '"/></svg>' +
            t[1] +
            "</button>"
          );
        })
        .join("");
    }

    return {
      render: render,
    };
  })();
})();
