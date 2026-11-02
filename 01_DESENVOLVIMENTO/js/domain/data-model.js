(function () {
  "use strict";
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
  var MODULE_IDS = [
    "foco",
    "estudo",
    "temas",
    "leitura",
    "desempenho",
    "agenda",
    "tarefas",
    "rotina",
    "habitos",
    "metas",
    "financas",
    "grupos",
    "comunidade",
    "atividade_fisica",
    "comunidade_estudos",
    "comunidade_atividade_fisica",
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
  var STUDY_TYPES = ["theory", "questions", "class", "review", "other"];
  function emptyState() {
    return {
      v: 5,
      name: "",
      goalH: 20,
      sessions: [],
      books: [],
      events: [],
      tasks: [],
      questions: [],
      readlog: [],
      themes: [],
      habits: [],
      txs: [],
      goals: [],
      routine: [],
    };
  }
  function boundedInteger(value, fallback, min, max) {
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max
      ? value
      : fallback;
  }

  function normalizeEnabledTabs(value) {
    var source =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};
    var enabledTabs = {};

    MODULE_IDS.forEach(function (id) {
      enabledTabs[id] =
        typeof source[id] === "boolean" ? source[id] : true;
    });

    return enabledTabs;
  }

  function normalize(o) {
    // Primeiro acesso: começa sem registros até o usuário adicionar dados.
    if (o === null) o = emptyState();

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

      // Remove dados de demonstração antigos sem tocar nos registros do usuário.
      o[k] = o[k].filter(function (x) {
        return !x.ex;
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

    function normalizeStudyMetadata(item) {
      if (item.topic !== undefined) {
        item.topic =
          typeof item.topic === "string" ? item.topic.trim().slice(0, 100) : "";
      }
      if (item.studyType !== undefined) {
        item.studyType = STUDY_TYPES.indexOf(item.studyType) !== -1
          ? item.studyType
          : "";
      }
    }

    o.sessions.forEach(normalizeStudyMetadata);
    o.questions.forEach(normalizeStudyMetadata);

    delete o.timer;

    if (["dark", "light", "system"].indexOf(o.theme) === -1) {
      delete o.theme;
    }

    o.enabledTabs = normalizeEnabledTabs(o.enabledTabs);

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
    if (o.pomoRun) normalizeStudyMetadata(o.pomoRun);

    delete o.subjects;
    delete o.ach;

    if (!o.goalH) o.goalH = 20;
    o.name = typeof o.name === "string" ? o.name : "";
    delete o.lastBackup;

    o.v = 5;

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

    if ((!current.name || current.name === "Iago") && legacy.name) {
      merged.name = legacy.name;
    }
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

    var currentEnabledTabs = current.enabledTabs || {};
    var legacyEnabledTabs = legacy.enabledTabs || {};
    merged.enabledTabs = Object.assign({}, currentEnabledTabs);
    MODULE_IDS.forEach(function (id) {
      if (
        currentEnabledTabs[id] === true &&
        legacyEnabledTabs[id] === false
      ) {
        merged.enabledTabs[id] = false;
      }
    });

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

      // As comparações acima mantêm a exclusão se o outro lado não mudou.
      // Se o outro lado editou, preservamos a edição para evitar perda silenciosa.
      if (localValue === missing && baseValue !== missing) return clone(remoteValue);
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
    MODULE_IDS: Object.freeze(MODULE_IDS.slice()),
    TAGGED: Object.freeze(TAGGED.slice()),
    OLD: Object.freeze(Object.assign({}, OLD)),
    normalize: normalize,
    mergeLegacyData: mergeLegacyData,
    mergeForSync: mergeForSync,
  });
})();

