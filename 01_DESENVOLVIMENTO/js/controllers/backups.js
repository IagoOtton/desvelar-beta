(function () {
  "use strict";

  function create(dependencies) {
    var required = [
      "render",
      "toast",
      "today",
    ];
    if (
      !dependencies ||
      !Array.isArray(dependencies.lists) ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !dependencies.stateStore ||
      typeof dependencies.stateStore.replaceState !== "function"
    ) {
      throw new Error("As dependências de backup não foram informadas.");
    }

    function isValidId(id) {
      return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
    }

    function isValidRecord(collection, record) {
      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record) ||
        !isValidId(record.id)
      ) {
        return false;
      }

      if (collection === "readlog" && !isValidId(record.bookId)) {
        return false;
      }

      if (
        collection === "habits" &&
        (!record.days ||
          typeof record.days !== "object" ||
          Array.isArray(record.days))
      ) {
        return false;
      }

      if (collection === "goals") {
        if (!Array.isArray(record.ms)) return false;
        return record.ms.every(function (milestone) {
          return (
            milestone &&
            typeof milestone === "object" &&
            !Array.isArray(milestone) &&
            isValidId(milestone.id)
          );
        });
      }

      return true;
    }

    function validateBackup(backup) {
      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        throw new Error("Formato inválido");
      }

      if (
        backup.v !== undefined &&
        (!Number.isInteger(backup.v) || backup.v > 4 || backup.v < 1)
      ) {
        throw new Error("Versão do backup não suportada");
      }

      var valid = dependencies.lists.every(function (collection) {
        // Versão 4 ou superior exige todas as coleções.
        if (backup.v >= 4 && backup[collection] === undefined) {
          return false;
        }

        // Versões antigas podem não possuir algumas coleções.
        if (backup[collection] === undefined) {
          return true;
        }

        if (!Array.isArray(backup[collection])) {
          return false;
        }

        return backup[collection].every(function (record) {
          return isValidRecord(collection, record);
        });
      });

      if (!valid) {
        throw new Error("Dados incompletos ou inválidos");
      }

      return backup;
    }

    function importText(text) {
      try {
        var backup = validateBackup(JSON.parse(text));
        if (!dependencies.stateStore.replaceState(backup)) {
          dependencies.render();
          dependencies.toast("Não foi possível salvar os dados importados.");
          return false;
        }

        dependencies.render();
        dependencies.toast("dados importados");
        return true;
      } catch (error) {
        console.error("Erro ao importar backup:", error);
        dependencies.toast("arquivo inválido");
        return false;
      }
    }

    function handleFileChange(event) {
      var input = event.target;
      if (!input || input.id !== "imp" || !input.files || !input.files[0]) {
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        importText(reader.result);
      };
      reader.onerror = function () {
        console.error("Erro ao importar backup:", reader.error);
        dependencies.toast("arquivo inválido");
      };

      try {
        reader.readAsText(input.files[0]);
      } catch (error) {
        console.error("Erro ao importar backup:", error);
        dependencies.toast("arquivo inválido");
      }
    }

    function exportBackup(state) {
      var date = dependencies.today();
      var backup = JSON.parse(JSON.stringify(state));
      backup.lastBackup = date;

      var blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      var link = document.createElement("a");
      var url = URL.createObjectURL(blob);

      link.href = url;
      link.download = "painel-estudos-backup-" + date + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1500);

      state.lastBackup = date;
      return "backup exportado";
    }

    return Object.freeze({
      exportBackup: exportBackup,
      handleFileChange: handleFileChange,
      importText: importText,
      validateBackup: validateBackup,
    });
  }

  window.DesvelarBackupController = Object.freeze({ create: create });
})();
