(function () {
  "use strict";

  window.DesvelarTags = (function () {
    var key = function (t) {
      return String(t || "")
        .trim()
        .toLowerCase();
    };

    return {
      key: key,
    };
  })();
})();
