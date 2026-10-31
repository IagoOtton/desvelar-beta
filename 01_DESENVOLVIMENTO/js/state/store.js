(function () {
  "use strict";

  function create(dependencies) {
    var required = ["load", "save", "normalize", "onStateChange"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      })
    ) {
      throw new Error("As dependências do estado não foram informadas.");
    }

    var currentState = null;
    var savedSnapshot = null;

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function publish(state) {
      currentState = state;
      dependencies.onStateChange(currentState);
    }

    function saveCandidate(candidate) {
      try {
        return dependencies.save(candidate) === true;
      } catch (error) {
        return false;
      }
    }

    function load() {
      var loaded = dependencies.normalize(dependencies.load());
      publish(loaded);
      savedSnapshot = clone(loaded);
      return currentState;
    }

    function getState() {
      return currentState;
    }

    function createDraft() {
      if (currentState === null) {
        throw new Error("O estado precisa ser carregado antes de ser alterado.");
      }
      return clone(currentState);
    }

    function saveDraft(draft) {
      var candidate;
      try {
        candidate = dependencies.normalize(draft);
      } catch (error) {
        return false;
      }
      if (!saveCandidate(candidate)) return false;

      publish(candidate);
      savedSnapshot = clone(candidate);
      return true;
    }

    function replaceState(state) {
      var candidate = dependencies.normalize(clone(state));
      if (!saveCandidate(candidate)) return false;

      publish(candidate);
      savedSnapshot = clone(candidate);
      return true;
    }

    function persist() {
      if (currentState === null) return false;
      if (saveCandidate(currentState)) {
        savedSnapshot = clone(currentState);
        return true;
      }

      if (savedSnapshot !== null) publish(clone(savedSnapshot));
      return false;
    }

    return Object.freeze({
      load: load,
      getState: getState,
      createDraft: createDraft,
      saveDraft: saveDraft,
      replaceState: replaceState,
      persist: persist,
    });
  }

  window.DesvelarStateStore = Object.freeze({ create: create });
})();
