(function () {
  "use strict";
  var utils = window.DesvelarUtils;
  var formatting = window.DesvelarFormatting;
  if (!utils || !formatting) {
    throw new Error("As dependências do modelo de dados não foram carregadas.");
  }
  var uid = formatting.uid;
  var today = utils.today;
  var addDays = utils.addDays;
  var LISTS = [
    "sessions",
    "books",
    "events",
    "tasks",
    "questions",
    "readlog",
    "themes",
    "habits",
    "txs",
    "goals",
    "routine",
  ];
  var TAGGED = [
    "sessions",
    "books",
    "tasks",
    "questions",
    "themes",
    "txs",
    "goals",
    "routine",
  ];
  var OLD = {
    anat: "Anatomia",
    fisio: "Fisiologia",
    pato: "Patologia",
    farma: "Farmacologia",
    cond: "Conduta / Clínica",
    pbl: "PBL / Tutoria",
    out: "Outros",
  };
  function demo() {
    var t = today(),
      o = {
        v: 3,
        name: "Iago",
        goalH: 20,
        sessions: [],
        books: [],
        events: [],
        tasks: [],
        questions: [],
        readlog: [],
      };
    var tg = [
      "Fisiologia",
      "Anatomia",
      "Farmacologia",
      "Patologia",
      "Clínica",
      "PBL",
    ];
    for (var i = 0; i < 45; i++) {
      if (i % 7 === 5 || i % 11 === 3) continue;
      o.sessions.push({
        id: uid(),
        date: addDays(t, -i),
        min: 50 + ((i * 37) % 110),
        tag: tg[i % 6],
        note: "",
        ex: 1,
      });
    }
    var b1 = uid(),
      b2 = uid();
    o.books = [
      {
        id: b1,
        title: "Fisiologia Médica",
        tag: "Fisiologia",
        total: 1176,
        read: 312,
        ex: 1,
      },
      {
        id: b2,
        title: "Dom Casmurro",
        tag: "Literatura",
        total: 256,
        read: 90,
        ex: 1,
      },
    ];
    o.readlog = [
      {
        id: uid(),
        bookId: b1,
        date: addDays(t, -6),
        from: 150,
        to: 210,
        pages: 60,
        min: 90,
        ex: 1,
      },
      {
        id: uid(),
        bookId: b1,
        date: addDays(t, -3),
        from: 210,
        to: 262,
        pages: 52,
        min: 80,
        ex: 1,
      },
      {
        id: uid(),
        bookId: b1,
        date: addDays(t, -1),
        from: 262,
        to: 312,
        pages: 50,
        min: 70,
        ex: 1,
      },
      {
        id: uid(),
        bookId: b2,
        date: addDays(t, -4),
        from: 40,
        to: 90,
        pages: 50,
        min: 60,
        ex: 1,
      },
    ];
    o.events = [
      {
        id: uid(),
        date: addDays(t, 1),
        time: "08:00",
        title: "Sessão de tutoria",
        kind: "Tutoria",
        ex: 1,
      },
      {
        id: uid(),
        date: addDays(t, 3),
        time: "14:00",
        title: "Prática de anatomia",
        kind: "Aula",
        ex: 1,
      },
      {
        id: uid(),
        date: addDays(t, 9),
        time: "09:00",
        title: "Prova de fisiologia",
        kind: "Prova",
        ex: 1,
      },
    ];
    o.tasks = [
      {
        id: uid(),
        title: "Resumo do ciclo cardíaco",
        due: addDays(t, 2),
        tag: "Fisiologia",
        done: false,
        ex: 1,
      },
      {
        id: uid(),
        title: "Fechar objetivos do problema 3",
        due: addDays(t, 1),
        tag: "PBL",
        done: false,
        ex: 1,
      },
      {
        id: uid(),
        title: "Revisar anti-hipertensivos",
        due: addDays(t, -1),
        tag: "Farmacologia",
        done: false,
        ex: 1,
      },
      {
        id: uid(),
        title: "Lista de questões de anatomia",
        due: addDays(t, -3),
        tag: "Anatomia",
        done: true,
        doneOn: addDays(t, -3),
        ex: 1,
      },
    ];
    o.questions = [
      {
        id: uid(),
        date: addDays(t, -1),
        tag: "Fisiologia",
        total: 20,
        correct: 15,
        ex: 1,
      },
      {
        id: uid(),
        date: addDays(t, -2),
        tag: "Anatomia",
        total: 15,
        correct: 8,
        ex: 1,
      },
      {
        id: uid(),
        date: addDays(t, -4),
        tag: "Farmacologia",
        total: 25,
        correct: 14,
        ex: 1,
      },
      {
        id: uid(),
        date: addDays(t, -6),
        tag: "Patologia",
        total: 20,
        correct: 13,
        ex: 1,
      },
    ];
    var dd = function (n) {
        return addDays(t, -n);
      },
      ym = t.slice(0, 7);
    o.themes = [
      {
        id: uid(),
        date: dd(0),
        title: "Ciclo cardíaco",
        tag: "Fisiologia",
        diff: 4,
        note: "",
        reviewed: false,
        ex: 1,
      },
      {
        id: uid(),
        date: dd(1),
        title: "Plexo braquial",
        tag: "Anatomia",
        diff: 5,
        note: "confundo as raízes",
        reviewed: false,
        ex: 1,
      },
      {
        id: uid(),
        date: dd(2),
        title: "Farmacocinética básica",
        tag: "Farmacologia",
        diff: 2,
        note: "",
        reviewed: false,
        ex: 1,
      },
      {
        id: uid(),
        date: dd(3),
        title: "Inflamação aguda",
        tag: "Patologia",
        diff: 3,
        note: "",
        reviewed: false,
        ex: 1,
      },
    ];
    var hd = function (a) {
      var r = {};
      a.forEach(function (n) {
        r[dd(n)] = 1;
      });
      return r;
    };
    o.habits = [
      {
        id: uid(),
        name: "Dormir 7h ou mais",
        days: hd([1, 2, 3, 5, 6]),
        ex: 1,
      },
      { id: uid(), name: "Exercício", days: hd([0, 2, 4, 6]), ex: 1 },
      {
        id: uid(),
        name: "2 litros de água",
        days: hd([0, 1, 2, 3, 4, 5, 6]),
        ex: 1,
      },
    ];
    o.txs = [
      {
        id: uid(),
        date: ym + "-05",
        type: "in",
        amount: 1800,
        title: "Mesada",
        tag: "Renda",
        ex: 1,
      },
      {
        id: uid(),
        date: ym + "-08",
        type: "out",
        amount: 420,
        title: "Aluguel (parte)",
        tag: "Moradia",
        ex: 1,
      },
      {
        id: uid(),
        date: ym + "-12",
        type: "out",
        amount: 86.5,
        title: "Mercado",
        tag: "Alimentação",
        ex: 1,
      },
      {
        id: uid(),
        date: ym + "-15",
        type: "out",
        amount: 59.9,
        title: "Assinatura de questões",
        tag: "Estudos",
        ex: 1,
      },
    ];
    o.goals = [
      {
        id: uid(),
        title: "Passar na prova de residência",
        tag: "Carreira",
        due: addDays(t, 400),
        manual: 0,
        ms: [
          {
            id: uid(),
            text: "Fechar o cronograma do 1º semestre",
            done: true,
          },
          { id: uid(), text: "1000 questões de clínica", done: false },
          { id: uid(), text: "Simulado completo", done: false },
        ],
        ex: 1,
      },
      {
        id: uid(),
        title: "Ler 12 livros no ano",
        tag: "Leitura",
        due: ym.slice(0, 4) + "-12-31",
        manual: 25,
        ms: [],
        ex: 1,
      },
    ];
    o.routine = [
      {
        id: uid(),
        day: 0,
        start: "08:00",
        end: "12:00",
        title: "Aulas",
        tag: "Faculdade",
        ex: 1,
      },
      {
        id: uid(),
        day: 2,
        start: "14:00",
        end: "16:00",
        title: "Estágio",
        tag: "Prática",
        ex: 1,
      },
      {
        id: uid(),
        day: 1,
        start: "19:00",
        end: "20:00",
        title: "Academia",
        tag: "Saúde",
        ex: 1,
      },
      {
        id: uid(),
        day: 4,
        start: "19:00",
        end: "20:00",
        title: "Academia",
        tag: "Saúde",
        ex: 1,
      },
    ];
    return o;
  }
  function boundedInteger(value, fallback, min, max) {
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max
      ? value
      : fallback;
  }

  function normalize(o) {
    // Primeiro acesso: inicializa com os dados demonstrativos.
    if (o === null) o = demo();

    // Rejeita estruturas inválidas.
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      throw new Error("Estrutura principal dos dados inválida");
    }

    // Valida as coleções e seus registros.
    LISTS.forEach(function (k) {
      if (o[k] === undefined) {
        if (typeof o.v === "number" && o.v >= 4) {
          throw new Error("Coleção ausente em dados da versão atual: " + k);
        }

        o[k] = [];
      }

      if (!Array.isArray(o[k])) {
        throw new Error("Coleção inválida: " + k);
      }

      o[k].forEach(function (x) {
        if (!x || typeof x !== "object" || Array.isArray(x)) {
          throw new Error("Registro inválido na coleção: " + k);
        }
      });
    });

    // Valida matérias de versões anteriores.
    if (o.subjects !== undefined) {
      if (!Array.isArray(o.subjects)) {
        throw new Error("Lista de matérias inválida");
      }

      o.subjects.forEach(function (s) {
        if (!s || typeof s !== "object" || Array.isArray(s)) {
          throw new Error("Registro de matéria inválido");
        }
      });
    }

    var names = {};
    Object.keys(OLD).forEach(function (k) {
      names[k] = OLD[k];
    });

    (o.subjects || []).forEach(function (s) {
      names[s.id] = s.name;
    });

    // Migração das antigas matérias para tags.
    TAGGED.forEach(function (k) {
      o[k].forEach(function (x) {
        if (x.tag == null) {
          x.tag = x.subj ? names[x.subj] || "" : "";
        }
        delete x.subj;
      });
    });

    delete o.timer;

    if (["dark", "light", "system"].indexOf(o.theme) === -1) {
      delete o.theme;
    }

    // Valida e prepara as configurações do Pomodoro.
    if (o.pomo === undefined || o.pomo === null) {
      o.pomo = {};
    }

    if (typeof o.pomo !== "object" || Array.isArray(o.pomo)) {
      throw new Error("Configurações do Pomodoro inválidas");
    }

    var P = o.pomo;
    P.focus = boundedInteger(P.focus, 25, 1, 180);
    P.short = boundedInteger(P.short, 5, 1, 60);
    P.long = boundedInteger(P.long, 15, 1, 90);
    P.every = boundedInteger(P.every, 4, 2, 10);
    P.cycle = boundedInteger(P.cycle, 1, 1, P.every);
    P.lastTag = typeof P.lastTag === "string" ? P.lastTag : "";
    P.daily = boundedInteger(P.daily, 6, 1, 30);
    P.rateId = typeof P.rateId === "string" ? P.rateId : "";

    if (o.pomoRun === undefined) {
      o.pomoRun = null;
    }

    if (
      o.pomoRun !== null &&
      (typeof o.pomoRun !== "object" || Array.isArray(o.pomoRun))
    ) {
      throw new Error("Sessão do Pomodoro inválida");
    }

    delete o.subjects;
    delete o.ach;

    if (!o.goalH) o.goalH = 20;
    if (!o.name) o.name = "Iago";
    delete o.lastBackup;

    o.v = 4;

    return o;
  }
  function mergeLegacyData(current, legacy) {
    var merged = Object.assign({}, legacy, current);

    LISTS.forEach(function (key) {
      var items = legacy[key].slice();
      var byId = Object.create(null);

      items.forEach(function (item, index) {
        if (item.id != null) byId[item.id] = index;
      });

      current[key].forEach(function (item) {
        if (
          item.id != null &&
          Object.prototype.hasOwnProperty.call(byId, item.id)
        ) {
          items[byId[item.id]] = item;
        } else {
          if (item.id != null) byId[item.id] = items.length;
          items.push(item);
        }
      });

      merged[key] = items;
    });

    if (current.name === "Iago" && legacy.name) merged.name = legacy.name;
    if (current.goalH === 20 && legacy.goalH) merged.goalH = legacy.goalH;
    var pomoDefaults = {
      focus: 25,
      short: 5,
      long: 15,
      every: 4,
      cycle: 1,
      lastTag: "",
      daily: 6,
      rateId: "",
    };
    merged.pomo = Object.assign({}, legacy.pomo, current.pomo);
    Object.keys(pomoDefaults).forEach(function (key) {
      if (
        current.pomo[key] === pomoDefaults[key] &&
        legacy.pomo[key] !== undefined
      ) {
        merged.pomo[key] = legacy.pomo[key];
      }
    });
    if (current.pomoRun == null && legacy.pomoRun != null) {
      merged.pomoRun = legacy.pomoRun;
    }

    return merged;
  }

  function mergeForSync(base, local, remote) {
    var missing = {};

    function clone(value) {
      if (value === missing || value === undefined) return value;
      return JSON.parse(JSON.stringify(value));
    }

    function equal(left, right) {
      if (left === missing || right === missing) return left === right;
      return JSON.stringify(left) === JSON.stringify(right);
    }

    function isObject(value) {
      return (
        value !== missing &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      );
    }

    function mergeArray(baseArray, localArray, remoteArray) {
      var baseItems = indexItems(baseArray);
      var localItems = indexItems(localArray);
      var remoteItems = indexItems(remoteArray);
      var keys = [];
      var seen = Object.create(null);
      var result = [];

      [remoteArray, localArray, baseArray].forEach(function (items) {
        items.forEach(function (item, index) {
          var key = item && item.id != null ? "id:" + item.id : "index:" + index;
          if (!seen[key]) {
            seen[key] = true;
            keys.push(key);
          }
        });
      });

      keys.forEach(function (key) {
        var merged = mergeValue(
          Object.prototype.hasOwnProperty.call(baseItems, key) ? baseItems[key] : missing,
          Object.prototype.hasOwnProperty.call(localItems, key) ? localItems[key] : missing,
          Object.prototype.hasOwnProperty.call(remoteItems, key) ? remoteItems[key] : missing,
        );
        if (merged !== missing) result.push(merged);
      });

      return result;
    }

    function indexItems(items) {
      var indexed = Object.create(null);
      items.forEach(function (item, index) {
        var key = item && item.id != null ? "id:" + item.id : "index:" + index;
        indexed[key] = item;
      });
      return indexed;
    }

    function mergeObject(baseValue, localValue, remoteValue) {
      var result = {};
      var keys = Object.create(null);

      [baseValue, localValue, remoteValue].forEach(function (value) {
        if (isObject(value)) {
          Object.keys(value).forEach(function (key) {
            keys[key] = true;
          });
        }
      });

      Object.keys(keys).forEach(function (key) {
        var merged = mergeValue(
          isObject(baseValue) && Object.prototype.hasOwnProperty.call(baseValue, key)
            ? baseValue[key]
            : missing,
          isObject(localValue) && Object.prototype.hasOwnProperty.call(localValue, key)
            ? localValue[key]
            : missing,
          isObject(remoteValue) && Object.prototype.hasOwnProperty.call(remoteValue, key)
            ? remoteValue[key]
            : missing,
        );
        if (merged !== missing) result[key] = merged;
      });

      return result;
    }

    function mergeValue(baseValue, localValue, remoteValue) {
      if (equal(localValue, remoteValue)) return clone(localValue);
      if (equal(localValue, baseValue)) return clone(remoteValue);
      if (equal(remoteValue, baseValue)) return clone(localValue);

      // Uma exclusão feita em um dispositivo prevalece sobre um valor sem alteração.
      if (localValue === missing && baseValue !== missing) return missing;
      if (remoteValue === missing && baseValue !== missing) return clone(localValue);

      if (Array.isArray(localValue) || Array.isArray(remoteValue) || Array.isArray(baseValue)) {
        return mergeArray(
          Array.isArray(baseValue) ? baseValue : [],
          Array.isArray(localValue) ? localValue : [],
          Array.isArray(remoteValue) ? remoteValue : [],
        );
      }

      if (isObject(localValue) || isObject(remoteValue) || isObject(baseValue)) {
        return mergeObject(baseValue, localValue, remoteValue);
      }

      // Em conflito no mesmo campo simples, preserva a alteração local mais recente.
      return clone(localValue);
    }

    return mergeValue(base, local, remote);
  }

  window.DesvelarDataModel = Object.freeze({
    LISTS: Object.freeze(LISTS.slice()),
    TAGGED: Object.freeze(TAGGED.slice()),
    OLD: Object.freeze(Object.assign({}, OLD)),
    demo: demo,
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
    mergeForSync: mergeForSync,
  });
})();
