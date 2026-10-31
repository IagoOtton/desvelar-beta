(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getState", "tagKey", "tagLabel", "sum", "today", "addDays"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !Array.isArray(dependencies.lists)
    ) {
      throw new Error("As dependências dos cálculos do DESVELAR não foram informadas.");
    }

    function groupMin(startDate, endDate) {
      var state = dependencies.getState();
      var minutesByTag = {};
      state.sessions.forEach(function (session) {
        if (session.date >= startDate && session.date <= endDate) {
          var key = dependencies.tagKey(session.tag);
          minutesByTag[key] = (minutesByTag[key] || 0) + session.min;
        }
      });

      return Object.keys(minutesByTag)
        .map(function (key) {
          return {
            k: key,
            label: dependencies.tagLabel(key),
            m: minutesByTag[key],
          };
        })
        .sort(function (a, b) {
          return b.m - a.m;
        });
    }

    function accuracyByTag() {
      var state = dependencies.getState();
      var totals = {};
      state.questions.forEach(function (question) {
        var key = dependencies.tagKey(question.tag);
        totals[key] = totals[key] || { total: 0, correct: 0 };
        totals[key].total += question.total;
        totals[key].correct += question.correct;
      });

      return Object.keys(totals)
        .map(function (key) {
          return {
            k: key,
            label: dependencies.tagLabel(key),
            t: totals[key].total,
            c: totals[key].correct,
          };
        })
        .sort(function (a, b) {
          return a.c / a.t - b.c / b.t;
        });
    }

    function minutesOn(date) {
      var state = dependencies.getState();
      return dependencies.sum(
        state.sessions.filter(function (session) {
          return session.date === date;
        }),
        function (session) {
          return session.min;
        },
      );
    }

    function minutesInRange(startDate, endDate) {
      var state = dependencies.getState();
      return dependencies.sum(
        state.sessions.filter(function (session) {
          return session.date >= startDate && session.date <= endDate;
        }),
        function (session) {
          return session.min;
        },
      );
    }

    function pagesInRange(startDate, endDate) {
      var state = dependencies.getState();
      return dependencies.sum(
        state.readlog.filter(function (entry) {
          return entry.date >= startDate && entry.date <= endDate;
        }),
        function (entry) {
          return entry.pages;
        },
      );
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
      var state = dependencies.getState();
      var questions = state.questions.filter(
        filter || function () {
          return true;
        },
      );
      return {
        t: dependencies.sum(questions, function (question) {
          return question.total;
        }),
        c: dependencies.sum(questions, function (question) {
          return question.correct;
        }),
      };
    }

    function hasDemoData() {
      var state = dependencies.getState();
      return dependencies.lists.some(function (key) {
        return state[key].some(function (item) {
          return item.ex;
        });
      });
    }

    function realCount() {
      var state = dependencies.getState();
      return dependencies.sum(dependencies.lists, function (key) {
        return state[key].filter(function (item) {
          return !item.ex;
        }).length;
      });
    }

    function bookLog(book) {
      var state = dependencies.getState();
      return state.readlog
        .filter(function (entry) {
          return entry.bookId === book.id;
        })
        .sort(function (a, b) {
          return a.date < b.date ? -1 : a.date > b.date ? 1 : a.to - b.to;
        });
    }

    function pagesForBookInRange(book, startDate, endDate) {
      var state = dependencies.getState();
      return dependencies.sum(
        state.readlog.filter(function (entry) {
          return (
            entry.bookId === book.id &&
            entry.date >= startDate &&
            entry.date <= endDate
          );
        }),
        function (entry) {
          return entry.pages;
        },
      );
    }

    return Object.freeze({
      accuracyByTag: accuracyByTag,
      bookLog: bookLog,
      groupMin: groupMin,
      hasDemoData: hasDemoData,
      minutesInRange: minutesInRange,
      minutesOn: minutesOn,
      pagesForBookInRange: pagesForBookInRange,
      pagesInRange: pagesInRange,
      questionTotals: questionTotals,
      realCount: realCount,
      streak: streak,
    });
  }

  window.DesvelarAnalytics = Object.freeze({ create: create });
})();

