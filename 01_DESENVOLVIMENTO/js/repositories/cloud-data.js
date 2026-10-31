(function () {
  "use strict";

  function create(options) {
    if (
      !options ||
      !options.client ||
      typeof options.userId !== "string" ||
      !options.userId ||
      typeof options.mergeForSync !== "function"
    ) {
      throw new Error("As dependências da sincronização não foram informadas.");
    }

    var revision = 0;
    var baseData = null;
    var loaded = false;
    var queue = Promise.resolve();

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    async function load() {
      try {
        var result = await options.client
          .from("app_user_data")
          .select("data, revision, updated_at")
          .eq("user_id", options.userId)
          .maybeSingle();

        if (result.error) {
          loaded = true;
          revision = 0;
          baseData = null;
          return { data: null, revision: 0, updatedAt: null, error: result.error };
        }

        loaded = true;
        if (!result.data) {
          revision = 0;
          baseData = null;
          return { data: null, revision: 0, updatedAt: null, error: null };
        }

        revision = Number(result.data.revision) || 0;
        baseData = clone(result.data.data);
        return {
          data: clone(baseData),
          revision: revision,
          updatedAt: result.data.updated_at || null,
          error: null,
        };
      } catch (error) {
        loaded = true;
        revision = 0;
        baseData = null;
        return { data: null, revision: 0, updatedAt: null, error: error };
      }
    }

    async function saveSnapshot(snapshot) {
      if (!loaded) {
        return {
          ok: false,
          error: new Error("Os dados da conta ainda não foram carregados."),
        };
      }

      var next = snapshot;
      for (var attempt = 0; attempt < 4; attempt++) {
        var result;
        try {
          result = await options.client.rpc("save_my_app_data", {
            p_data: next,
            p_expected_revision: revision,
          });
        } catch (error) {
          return { ok: false, error: error };
        }

        if (result.error) return { ok: false, error: result.error };

        var saved = result.data;
        if (Array.isArray(saved)) saved = saved[0];
        if (!saved || typeof saved !== "object") {
          return {
            ok: false,
            error: new Error("A resposta de sincronização não é válida."),
          };
        }

        if (saved.ok === true) {
          revision = Number(saved.revision) || revision + 1;
          baseData = clone(saved.data || next);
          return {
            ok: true,
            revision: revision,
            updatedAt: saved.updated_at || null,
          };
        }

        if (saved.ok !== false || !saved.data) {
          return {
            ok: false,
            error: new Error("Não foi possível resolver a versão dos dados."),
          };
        }

        var remoteData = clone(saved.data);
        next = options.mergeForSync(baseData, next, remoteData);
        baseData = remoteData;
        revision = Number(saved.revision) || 0;
      }

      return {
        ok: false,
        error: new Error("Há alterações simultâneas. Tente salvar novamente."),
      };
    }

    function save(data) {
      var snapshot;
      try {
        snapshot = clone(data);
      } catch (error) {
        return Promise.resolve({ ok: false, error: error });
      }

      var operation = queue.then(function () {
        return saveSnapshot(snapshot);
      });
      queue = operation.then(
        function () {},
        function () {},
      );
      return operation;
    }

    return Object.freeze({ load: load, save: save });
  }

  window.DesvelarCloudDataRepository = Object.freeze({ create: create });
})();

