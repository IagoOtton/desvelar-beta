(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "tagKey", "tagLabel", "sum"];
    if (
      !dependencies ||
      required.some(function (key) { return typeof dependencies[key] !== "function"; })
    ) {
      throw new Error("As dependências dos indicadores de Estudos não foram informadas.");
    }

    var cachedState = null;
    var sessionsIndex = null;
    var questionsIndex = null;
    var groupMinCache = Object.create(null);
    var accuracyCache = null;

    function snapshot() {
      var state = dependencies.getState();
      if (state !== cachedState) {
        cachedState = state;
        sessionsIndex = null;
        questionsIndex = null;
        groupMinCache = Object.create(null);
        accuracyCache = null;
      }
      return state;
    }

    function addTotal(target, key, value) {
      target[key] = Object.prototype.hasOwnProperty.call(target, key)
        ? target[key] + value
        : value;
    }

    function buildPrefixIndex(totals) {
      var dates = Object.keys(totals).sort();
      var prefix = [0];
      var valid = dates.every(function (date) {
        return typeof totals[date] === "number" && Number.isFinite(totals[date]);
      });
      dates.forEach(function (date) {
        prefix.push(valid ? prefix[prefix.length - 1] + totals[date] : 0);
      });
      return { dates: dates, prefix: prefix, valid: valid };
    }

    function lowerBound(values, target) {
      var low = 0;
      var high = values.length;
      while (low < high) {
        var middle = Math.floor((low + high) / 2);
        if (values[middle] < target) low = middle + 1;
        else high = middle;
      }
      return low;
    }

    function upperBound(values, target) {
      var low = 0;
      var high = values.length;
      while (low < high) {
        var middle = Math.floor((low + high) / 2);
        if (values[middle] <= target) low = middle + 1;
        else high = middle;
      }
      return low;
    }

    function rangeTotal(index, startDate, endDate) {
      if (!index || !index.dates.length || startDate > endDate) return 0;
      if (!index.valid) return null;
      var start = lowerBound(index.dates, startDate);
      var end = upperBound(index.dates, endDate);
      return index.prefix[end] - index.prefix[start];
    }

    function sessionData() {
      var state = snapshot();
      if (sessionsIndex) return sessionsIndex;

      var minutesByDate = Object.create(null);
      var minutesByDateAndTag = Object.create(null);
      var hasOnlyFiniteMinutes = true;
      state.sessions.forEach(function (session) {
        if (typeof session.date !== "string") return;
        if (typeof session.min !== "number" || !Number.isFinite(session.min)) {
          hasOnlyFiniteMinutes = false;
        }
        addTotal(minutesByDate, session.date, session.min);
        var tagTotals = minutesByDateAndTag[session.date];
        if (!tagTotals) {
          tagTotals = Object.create(null);
          minutesByDateAndTag[session.date] = tagTotals;
        }
        addTotal(tagTotals, dependencies.tagKey(session.tag), session.min);
      });

      sessionsIndex = {
        minutesByDate: minutesByDate,
        dateTotals: buildPrefixIndex(minutesByDate),
        minutesByDateAndTag: minutesByDateAndTag,
        hasOnlyFiniteMinutes: hasOnlyFiniteMinutes,
      };
      return sessionsIndex;
    }

    function questionData() {
      var state = snapshot();
      if (questionsIndex) return questionsIndex;

      var totalsByTag = Object.create(null);
      state.questions.forEach(function (question) {
        var key = dependencies.tagKey(question.tag);
        if (!totalsByTag[key]) totalsByTag[key] = { total: 0, correct: 0 };
        totalsByTag[key].total += question.total;
        totalsByTag[key].correct += question.correct;
      });
      questionsIndex = { totalsByTag: totalsByTag };
      return questionsIndex;
    }

    function groupMinByScan(state, startDate, endDate) {
      var minutesByTag = Object.create(null);
      state.sessions.forEach(function (session) {
        if (session.date >= startDate && session.date <= endDate) {
          addTotal(minutesByTag, dependencies.tagKey(session.tag), session.min);
        }
      });
      return Object.keys(minutesByTag)
        .map(function (key) {
          return { k: key, label: dependencies.tagLabel(key), m: minutesByTag[key] };
        })
        .sort(function (a, b) { return b.m - a.m; });
    }

    function groupMin(startDate, endDate) {
      var state = snapshot();
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        return groupMinByScan(state, startDate, endDate);
      }

      var indexed = sessionData();
      if (!indexed.hasOnlyFiniteMinutes) return groupMinByScan(state, startDate, endDate);

      var cacheKey = startDate + "\u001f" + endDate;
      if (Object.prototype.hasOwnProperty.call(groupMinCache, cacheKey)) {
        return groupMinCache[cacheKey].map(function (item) {
          return { k: item.k, label: item.label, m: item.m };
        });
      }

      var dateKeys = indexed.dateTotals.dates;
      var start = lowerBound(dateKeys, startDate);
      var end = upperBound(dateKeys, endDate);
      var minutesByTag = Object.create(null);
      for (var index = start; index < end; index++) {
        var dateTotals = indexed.minutesByDateAndTag[dateKeys[index]];
        Object.keys(dateTotals).forEach(function (key) {
          addTotal(minutesByTag, key, dateTotals[key]);
        });
      }

      var result = Object.keys(minutesByTag)
        .map(function (key) {
          return { k: key, label: dependencies.tagLabel(key), m: minutesByTag[key] };
        })
        .sort(function (a, b) { return b.m - a.m; });
      if (Object.keys(groupMinCache).length >= 32) groupMinCache = Object.create(null);
      groupMinCache[cacheKey] = result;
      return result.map(function (item) { return { k: item.k, label: item.label, m: item.m }; });
    }

    function accuracyByTag() {
      var index = questionData();
      if (!accuracyCache) {
        accuracyCache = Object.keys(index.totalsByTag)
          .map(function (key) {
            var totals = index.totalsByTag[key];
            return {
              k: key,
              label: dependencies.tagLabel(key),
              t: totals.total,
              c: totals.correct,
            };
          })
          .sort(function (a, b) { return a.c / a.t - b.c / b.t; });
      }
      return accuracyCache.map(function (item) {
        return { k: item.k, label: item.label, t: item.t, c: item.c };
      });
    }

    function minutesOn(date) {
      var indexed = sessionData();
      if (!indexed.hasOnlyFiniteMinutes) {
        var state = snapshot();
        return dependencies.sum(state.sessions.filter(function (session) {
          return session.date === date;
        }), function (session) { return session.min; });
      }
      return Object.prototype.hasOwnProperty.call(indexed.minutesByDate, date)
        ? indexed.minutesByDate[date]
        : 0;
    }

    function minutesInRange(startDate, endDate) {
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        var state = snapshot();
        return dependencies.sum(state.sessions.filter(function (session) {
          return session.date >= startDate && session.date <= endDate;
        }), function (session) { return session.min; });
      }
      var indexed = sessionData();
      var total = rangeTotal(indexed.dateTotals, startDate, endDate);
      if (total !== null) return total;
      var state = snapshot();
      return dependencies.sum(state.sessions.filter(function (session) {
        return session.date >= startDate && session.date <= endDate;
      }), function (session) { return session.min; });
    }

    return Object.freeze({
      accuracyByTag: accuracyByTag,
      groupMin: groupMin,
      minutesInRange: minutesInRange,
      minutesOn: minutesOn,
    });
  }

  window.DesvelarAnalytics = Object.freeze({ create: create });
})();
