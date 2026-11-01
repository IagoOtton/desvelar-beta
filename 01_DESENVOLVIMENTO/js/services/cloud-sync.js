(function () {
  "use strict";

  var SYNC_ERROR_MESSAGE =
    "Os dados ficaram salvos neste dispositivo, mas não sincronizaram. Confira sua conexão e a tela Sistema.";

  function create(options) {
    var required = [
      "localData",
      "normalize",
      "mergeLegacyData",
      "mergeForSync",
      "getState",
      "replaceState",
      "persist",
      "onStatusChange",
      "onSyncError",
    ];

    if (
      !options ||
      required.some(function (key) {
        return typeof options[key] !== "function" && key !== "localData";
      }) ||
      !options.localData
    ) {
      throw new Error("As dependências da sincronização não foram informadas.");
    }

    var localData = options.localData;
    var repository = options.repository || null;
    var bootstrap = options.initialSnapshot || {};
    var syncState = bootstrap.error ? "error" : "syncing";
    var saveRequest = 0;
    var savePromise = Promise.resolve(false);
    var retryPromise = Promise.resolve(false);
    var errorNotified = false;
    var retryTimer = 0;
    var retryDelay = 1000;
    var retrying = false;
    var hadLocalDataAtStartup = localData.hasStoredData();

    function statusLabel() {
      if (syncState === "synced") return "Sincronizado com sua conta";
      if (syncState === "error") return "Sem sincronização com a nuvem";
      return "Sincronizando com sua conta…";
    }

    function publishStatus() {
      options.onStatusChange(statusLabel(), syncState);
    }

    function isOnline() {
      return typeof options.isOnline === "function"
        ? options.isOnline()
        : navigator.onLine !== false;
    }

    function scheduleRetry() {
      if (retryTimer || retrying || !repository) return;

      var delay = retryDelay;
      retryDelay = Math.min(retryDelay * 2, 60000);
      retryTimer = window.setTimeout(function () {
        retryTimer = 0;
        retry();
      }, delay);
    }

    function clearRetry() {
      if (!retryTimer) return;
      window.clearTimeout(retryTimer);
      retryTimer = 0;
    }

    function notifySyncError(error) {
      if (!errorNotified) {
        errorNotified = true;
        options.onSyncError(SYNC_ERROR_MESSAGE, error);
      }
    }

    function sync(state) {
      if (!repository) {
        syncState = "error";
        publishStatus();
        return Promise.resolve(false);
      }

      if (bootstrap.error) {
        syncState = "error";
        publishStatus();
        scheduleRetry();
        return Promise.resolve(false);
      }

      var requestId = ++saveRequest;
      syncState = "syncing";
      publishStatus();

      return repository
        .save(state)
        .then(function (result) {
          if (requestId !== saveRequest) return false;

          if (!result || !result.ok) {
            syncState = "error";
            publishStatus();
            console.error("Erro ao sincronizar os dados:", result && result.error);
            scheduleRetry();
            notifySyncError(result && result.error);
            return false;
          }

          if (!localData.finalizeCloudSync(result.data || state)) {
            syncState = "syncing";
            publishStatus();
            scheduleRetry();
            return false;
          }

          syncState = "synced";
          localData.finalizeCloudMigration(true);
          retryDelay = 1000;
          errorNotified = false;
          clearRetry();
          publishStatus();
          return true;
        })
        .catch(function (error) {
          if (requestId !== saveRequest) return false;
          syncState = "error";
          publishStatus();
          console.error("Erro ao sincronizar os dados:", error);
          scheduleRetry();
          notifySyncError(error);
          return false;
        });
    }

    function loadAccountData() {
      var hasLocalData = localData.hasStoredData();
      var localState = hasLocalData ? localData.load() : null;

      if (bootstrap.error) return localState;

      if (bootstrap.data) {
        var remoteState = options.normalize(JSON.parse(JSON.stringify(bootstrap.data)));
        if (hasLocalData && localData.hasPendingCloudSync()) {
          var cloudBase = localData.loadCloudBase();
          return cloudBase
            ? options.mergeForSync(
                options.normalize(cloudBase),
                options.normalize(localState),
                remoteState,
              )
            : options.mergeLegacyData(remoteState, options.normalize(localState));
        }

        return hasLocalData && !localData.hasCloudMigration()
          ? options.mergeLegacyData(remoteState, options.normalize(localState))
          : remoteState;
      }

      return localState;
    }

    function save(state) {
      var saved = localData.save(state);
      if (saved) savePromise = sync(state);
      return saved;
    }

    function retry() {
      if (retrying) return retryPromise;
      if (!repository || !options.getState()) return Promise.resolve(false);
      if (!isOnline()) {
        scheduleRetry();
        return Promise.resolve(false);
      }

      retrying = true;
      clearRetry();

      var refresh;
      try {
        refresh =
          typeof repository.refresh === "function"
            ? repository.refresh()
            : repository.load();
      } catch (error) {
        refresh = Promise.reject(error);
      }

      var attempt = Promise.resolve(refresh)
        .then(function (snapshot) {
          if (!snapshot || snapshot.error) {
            throw (snapshot && snapshot.error) || new Error("Falha ao reler os dados da conta.");
          }

          bootstrap = snapshot;
          var currentState = options.getState();
          var nextState = currentState;

          if (snapshot.data) {
            if (localData.hasPendingCloudSync()) {
              var cloudBase = localData.loadCloudBase();
              nextState = cloudBase
                ? options.mergeForSync(
                    options.normalize(cloudBase),
                    options.normalize(currentState),
                    options.normalize(snapshot.data),
                  )
                : hadLocalDataAtStartup
                  ? options.mergeLegacyData(
                      options.normalize(snapshot.data),
                      options.normalize(currentState),
                    )
                  : options.normalize(snapshot.data);
            } else {
              nextState = options.normalize(snapshot.data);
            }
          }

          if (!options.replaceState(nextState)) {
            throw new Error("Não foi possível guardar o estado recuperado neste dispositivo.");
          }
          return savePromise;
        })
        .then(function (synced) {
          return synced === true && !localData.hasPendingCloudSync();
        })
        .catch(function (error) {
          bootstrap = {
            data: bootstrap.data || null,
            revision: bootstrap.revision || 0,
            updatedAt: bootstrap.updatedAt || null,
            error: error,
          };
          syncState = "error";
          publishStatus();
          console.error("Erro ao retomar a sincronização:", error);
          return false;
        })
        .finally(function () {
          retrying = false;
          if (syncState === "error") scheduleRetry();
        });

      retryPromise = attempt;
      return attempt;
    }

    async function flush() {
      if (!options.persist()) return { saved: false, synced: false };

      if ((await savePromise) && !localData.hasPendingCloudSync()) {
        return { saved: true, synced: true };
      }

      if (!isOnline()) return { saved: true, synced: false };

      var synced = await retry();
      return {
        saved: true,
        synced: synced === true && !localData.hasPendingCloudSync(),
      };
    }

    function handleOnline() {
      if (!options.getState()) return;
      if (bootstrap.error || localData.hasPendingCloudSync()) {
        retry();
      } else {
        savePromise = sync(options.getState());
      }
    }

    return Object.freeze({
      flush: flush,
      getStatus: function () {
        return syncState;
      },
      getStatusLabel: statusLabel,
      handleOnline: handleOnline,
      loadAccountData: loadAccountData,
      retry: retry,
      save: save,
    });
  }

  window.DesvelarCloudSync = Object.freeze({ create: create });
})();

