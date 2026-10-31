(function () {
  "use strict";

  function create(options) {
    if (!options || typeof options.userId !== "string" || !options.userId) {
      throw new Error("É necessário informar a conta para abrir os dados locais.");
    }
    if (
      typeof options.normalize !== "function" ||
      typeof options.mergeLegacyData !== "function"
    ) {
      throw new Error("As funções de migração dos dados não foram informadas.");
    }

    var key = "painel-estudos-v2:" + options.userId;
    var legacyKey = "painel-estudos-v2";
    var legacyOwnerKey = "painel-estudos-v2:migrated-to";
    var cloudMigrationKey = key + ":cloud-migrated";
    var legacyMigration = false;

    function parse(value) {
      return value === null ? null : JSON.parse(value);
    }

    function load() {
      var stored = window.localStorage.getItem(key);
      var legacyOwner = window.localStorage.getItem(legacyOwnerKey);
      var pendingOwner = "pending:" + options.userId;

      if (legacyOwner && legacyOwner.indexOf("done:") === 0) {
        return parse(stored);
      }

      if (
        legacyOwner &&
        legacyOwner !== options.userId &&
        legacyOwner !== pendingOwner
      ) {
        return parse(stored);
      }

      var legacy = window.localStorage.getItem(legacyKey);
      if (legacy === null) return parse(stored);

      if (!legacyOwner) {
        window.localStorage.setItem(legacyOwnerKey, pendingOwner);
      }

      legacyMigration = true;
      var legacyData = options.normalize(JSON.parse(legacy));
      if (stored === null) return legacyData;
      return options.mergeLegacyData(
        options.normalize(JSON.parse(stored)),
        legacyData,
      );
    }

    function save(data) {
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (error) {
        return false;
      }
    }

    function getSize() {
      try {
        return (window.localStorage.getItem(key) || "").length;
      } catch (error) {
        return 0;
      }
    }

    function hasStoredData() {
      try {
        if (window.localStorage.getItem(key) !== null) return true;

        var legacy = window.localStorage.getItem(legacyKey);
        if (legacy === null) return false;

        var owner = window.localStorage.getItem(legacyOwnerKey);
        return (
          !owner ||
          owner === options.userId ||
          owner === "pending:" + options.userId
        );
      } catch (error) {
        return false;
      }
    }

    function hasCloudMigration() {
      try {
        return window.localStorage.getItem(cloudMigrationKey) === "done";
      } catch (error) {
        return false;
      }
    }

    function finalizeCloudMigration(saved) {
      if (!saved) return false;

      try {
        window.localStorage.setItem(cloudMigrationKey, "done");
        return true;
      } catch (error) {
        return false;
      }
    }

    function hasLegacyMigration() {
      return legacyMigration;
    }

    function finalizeLegacyMigration(saved) {
      if (!legacyMigration || !saved) return false;

      try {
        window.localStorage.setItem(
          legacyOwnerKey,
          "done:" + options.userId,
        );
        return true;
      } catch (error) {
        return false;
      }
    }

    return Object.freeze({
      load: load,
      save: save,
      getSize: getSize,
      hasStoredData: hasStoredData,
      hasCloudMigration: hasCloudMigration,
      finalizeCloudMigration: finalizeCloudMigration,
      hasLegacyMigration: hasLegacyMigration,
      finalizeLegacyMigration: finalizeLegacyMigration,
    });
  }

  window.DesvelarLocalDataRepository = Object.freeze({ create: create });
})();

