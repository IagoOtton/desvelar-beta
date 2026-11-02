(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "tagKey", "tagLabel", "sum", "today", "addDays"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências dos cálculos do DESVELAR não foram informadas.");
    }

    var cachedState = null;
    var sessionsIndex = null;
    var readingIndex = null;
    var questionsIndex = null;
    var groupMinCache = Object.create(null);
    var accuracyCache = null;
    var questionTotalsCache = null;
    var goalProgressCache = new WeakMap();

    function snapshot() {
      var state = dependencies.getState();
      if (state !== cachedState) {
        cachedState = state;
        sessionsIndex = null;
        readingIndex = null;
        questionsIndex = null;
        groupMinCache = Object.create(null);
        accuracyCache = null;
        questionTotalsCache = null;
        goalProgressCache = new WeakMap();
      }
      return state;
    }

    function addTotal(target, key, value) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] += value;
      } else {
        target[key] = value;
      }
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
      if (!index || !index.dates.length) return 0;
      if (!index.valid) return null;
      if (startDate > endDate) return 0;
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

    function readingData() {
      var state = snapshot();
      if (readingIndex) return readingIndex;

      var pagesByDate = Object.create(null);
      var pagesByBookDate = Object.create(null);
      var logsByBook = Object.create(null);
      var hasOnlyFinitePages = true;
      state.readlog.forEach(function (entry) {
        var bookKey = typeof entry.bookId + ":" + String(entry.bookId);
        if (!logsByBook[bookKey]) logsByBook[bookKey] = [];
        logsByBook[bookKey].push(entry);

        if (typeof entry.date !== "string") return;
        if (typeof entry.pages !== "number" || !Number.isFinite(entry.pages)) {
          hasOnlyFinitePages = false;
        }
        addTotal(pagesByDate, entry.date, entry.pages);
        var bookPages = pagesByBookDate[bookKey];
        if (!bookPages) {
          bookPages = Object.create(null);
          pagesByBookDate[bookKey] = bookPages;
        }
        addTotal(bookPages, entry.date, entry.pages);
      });

      readingIndex = {
        dateTotals: buildPrefixIndex(pagesByDate),
        hasOnlyFinitePages: hasOnlyFinitePages,
        pagesByBookDate: pagesByBookDate,
        bookPrefixes: Object.create(null),
        logsByBook: logsByBook,
        sortedLogsByBook: Object.create(null),
      };
      return readingIndex;
    }

    function questionData() {
      var state = snapshot();
      if (questionsIndex) return questionsIndex;

      var totalsByDate = Object.create(null);
      var correctByDate = Object.create(null);
      var totalsByTag = Object.create(null);
      var allTotal = 0;
      var allCorrect = 0;
      state.questions.forEach(function (question) {
        allTotal += question.total;
        allCorrect += question.correct;
        if (typeof question.date === "string") {
          addTotal(totalsByDate, question.date, question.total);
          addTotal(correctByDate, question.date, question.correct);
        }
        var key = dependencies.tagKey(question.tag);
        if (!totalsByTag[key]) totalsByTag[key] = { total: 0, correct: 0 };
        totalsByTag[key].total += question.total;
        totalsByTag[key].correct += question.correct;
      });

      questionsIndex = {
        totalsByDate: buildPrefixIndex(totalsByDate),
        correctByDate: buildPrefixIndex(correctByDate),
        totalsByTag: totalsByTag,
        allTotal: allTotal,
        allCorrect: allCorrect,
      };
      return questionsIndex;
    }

    function groupMinByScan(state, startDate, endDate) {
      var minutesByTag = {};
      state.sessions.forEach(function (session) {
        if (session.date >= startDate && session.date <= endDate) {
          var key = dependencies.tagKey(session.tag);
          minutesByTag[key] = (minutesByTag[key] || 0) + session.min;
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
      if (Object.keys(groupMinCache).length >= 32) {
        groupMinCache = Object.create(null);
      }
      groupMinCache[cacheKey] = result;
      return result.map(function (item) {
        return { k: item.k, label: item.label, m: item.m };
      });
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

    function pagesInRange(startDate, endDate) {
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        var state = snapshot();
        return dependencies.sum(state.readlog.filter(function (entry) {
          return entry.date >= startDate && entry.date <= endDate;
        }), function (entry) { return entry.pages; });
      }
      var indexed = readingData();
      var total = rangeTotal(indexed.dateTotals, startDate, endDate);
      if (total !== null && indexed.hasOnlyFinitePages) return total;
      var state = snapshot();
      return dependencies.sum(state.readlog.filter(function (entry) {
        return entry.date >= startDate && entry.date <= endDate;
      }), function (entry) { return entry.pages; });
    }

    function streak() {
      var date = dependencies.today();
      var count = 0;
      if (!minutesOn(date)) date = dependencies.addDays(date, -1);
      while (minutesOn(date) > 0) {
        count++;
        date = dependencies.addDays(date, -1);
      }
      return count;
    }

    function questionTotals(filter) {
      var state = snapshot();
      if (!filter) {
        if (!questionTotalsCache) {
          var index = questionData();
          questionTotalsCache = {
            t: index.allTotal,
            c: index.allCorrect,
          };
        }
        return { t: questionTotalsCache.t, c: questionTotalsCache.c };
      }
      var questions = state.questions.filter(filter);
      return {
        t: dependencies.sum(questions, function (question) { return question.total; }),
        c: dependencies.sum(questions, function (question) { return question.correct; }),
      };
    }

    function questionTotalsInRange(startDate, endDate) {
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        var state = snapshot();
        var questions = state.questions.filter(function (question) {
          return question.date >= startDate && question.date <= endDate;
        });
        return {
          t: dependencies.sum(questions, function (question) { return question.total; }),
          c: dependencies.sum(questions, function (question) { return question.correct; }),
        };
      }
      var index = questionData();
      var total = rangeTotal(index.totalsByDate, startDate, endDate);
      var correct = rangeTotal(index.correctByDate, startDate, endDate);
      if (total === null || correct === null) {
        var currentState = snapshot();
        var matchingQuestions = currentState.questions.filter(function (question) {
          return question.date >= startDate && question.date <= endDate;
        });
        return {
          t: dependencies.sum(matchingQuestions, function (question) { return question.total; }),
          c: dependencies.sum(matchingQuestions, function (question) { return question.correct; }),
        };
      }
      return {
        t: total,
        c: correct,
      };
    }

    function bookLog(book) {
      var index = readingData();
      var key = typeof book.id + ":" + String(book.id);
      if (!Object.prototype.hasOwnProperty.call(index.sortedLogsByBook, key)) {
        var logs = index.logsByBook[key] || [];
        logs.sort(function (a, b) {
          return a.date < b.date ? -1 : a.date > b.date ? 1 : a.to - b.to;
        });
        index.sortedLogsByBook[key] = Object.freeze(logs);
      }
      return index.sortedLogsByBook[key];
    }

    function pagesForBookInRange(book, startDate, endDate) {
      var index = readingData();
      var key = typeof book.id + ":" + String(book.id);
      if (!index.bookPrefixes[key]) {
        index.bookPrefixes[key] = buildPrefixIndex(index.pagesByBookDate[key] || Object.create(null));
      }
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        var state = snapshot();
        return dependencies.sum(state.readlog.filter(function (entry) {
          return entry.bookId === book.id && entry.date >= startDate && entry.date <= endDate;
        }), function (entry) { return entry.pages; });
      }
      var total = rangeTotal(index.bookPrefixes[key], startDate, endDate);
      if (total !== null) return total;
      var state = snapshot();
      return dependencies.sum(state.readlog.filter(function (entry) {
        return entry.bookId === book.id && entry.date >= startDate && entry.date <= endDate;
      }), function (entry) { return entry.pages; });
    }

    function goalProgress(goal) {
      snapshot();
      if (goalProgressCache.has(goal)) return goalProgressCache.get(goal);
      var milestones = Array.isArray(goal.ms) ? goal.ms : [];
      var result;
      if (milestones.length) {
        var completed = milestones.filter(function (milestone) {
          return milestone.done;
        }).length;
        result = Math.round((completed / milestones.length) * 100);
      } else {
        result = Math.max(0, Math.min(100, goal.manual || 0));
      }
      goalProgressCache.set(goal, result);
      return result;
    }

    return Object.freeze({
      accuracyByTag: accuracyByTag,
      bookLog: bookLog,
      groupMin: groupMin,
      goalProgress: goalProgress,
      minutesInRange: minutesInRange,
      minutesOn: minutesOn,
      pagesForBookInRange: pagesForBookInRange,
      pagesInRange: pagesInRange,
      questionTotals: questionTotals,
      questionTotalsInRange: questionTotalsInRange,
      streak: streak,
    });
  }

  window.DesvelarAnalytics = Object.freeze({ create: create });
})();
