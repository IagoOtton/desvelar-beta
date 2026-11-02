(function () {
  "use strict";

  var RESULTS = ["again", "effort", "easy"];
  var MAX_INTERVAL_DAYS = 90;

  function isDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    var date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function create(dependencies) {
    if (!dependencies || typeof dependencies.addDays !== "function") {
      throw new Error("A função para calcular datas de revisão não foi informada.");
    }

    function isDue(theme, today) {
      if (!theme || !isDateKey(today)) return false;
      if (isDateKey(theme.nextReview)) return theme.nextReview <= today;
      return theme.diff >= 4 && !theme.reviewed;
    }

    function schedule(theme, result, today) {
      if (!theme || typeof theme !== "object") {
        throw new Error("O tema da revisão é inválido.");
      }
      if (RESULTS.indexOf(result) === -1 || !isDateKey(today)) {
        throw new Error("A avaliação da revisão é inválida.");
      }

      var previousInterval = Number.isInteger(theme.reviewIntervalDays)
        ? Math.max(0, Math.min(MAX_INTERVAL_DAYS, theme.reviewIntervalDays))
        : 0;
      var intervalDays =
        result === "again"
          ? 1
          : result === "effort"
            ? previousInterval
              ? Math.min(45, Math.max(3, Math.ceil(previousInterval * 1.5)))
              : 3
            : previousInterval
              ? Math.min(MAX_INTERVAL_DAYS, Math.max(7, previousInterval * 2))
              : 7;
      var nextReview = dependencies.addDays(today, intervalDays);

      theme.reviewed = true;
      theme.reviewCount = Number.isInteger(theme.reviewCount)
        ? Math.min(10000, Math.max(0, theme.reviewCount) + 1)
        : 1;
      theme.lastReviewed = today;
      theme.lastReviewResult = result;
      theme.reviewIntervalDays = intervalDays;
      theme.nextReview = nextReview;

      return { intervalDays: intervalDays, nextReview: nextReview };
    }

    return Object.freeze({ isDue: isDue, schedule: schedule });
  }

  window.DesvelarStudyReviewDomain = Object.freeze({ create: create });
})();

