(function () {
  "use strict";
  function create(dependencies) {
    var required = [
      "getState",
      "getSize",
      "getWipeArm",
      "head",
      "esc",
      "fmtD",
    ];
    if (!dependencies || required.some(function (key) {
      return typeof dependencies[key] !== "function";
    })) {
      throw new Error("As dependências da tela Sistema não foram informadas.");
    }
    function systemPage() {
      var state = dependencies.getState();
      var size = dependencies.getSize();
      return (
        dependencies.head(
          "Sistema",
          "Seus dados ficam salvos neste navegador. Faça backup de vez em quando.",
        ) +
        '<div class="grid"><div class="card"><h2>Perfil</h2><form class="row" data-form="profile"><label class="f grow">Seu nome<input id="p-name" class="grow" name="name" maxlength="30" value="' +
        dependencies.esc(state.name) +
        '" required></label>' +
        '<label class="f">Meta semanal (h)<input id="p-goal" type="number" name="h" min="1" max="100" value="' +
        dependencies.esc(state.goalH) +
        '" required></label><button class="btn pri" type="submit">Salvar</button></form>' +
        '<div class="rowflex" style="margin-top:14px"><span class="m">Aparência</span><button class="btn sm" data-a="theme">Alternar claro/escuro</button></div></div>' +
        '<div class="card"><h2>Backup</h2><p class="m" style="margin-top:0">Último backup: ' +
        (state.lastBackup ? dependencies.fmtD(state.lastBackup) : "nunca") +
        ". Seus dados ocupam cerca de " +
        Math.max(1, Math.round(size / 1024)) +
        " KB.</p>" +
        '<div class="rowflex"><button class="btn pri" data-a="export">Exportar dados</button><label class="btn" for="imp" style="cursor:pointer">Importar arquivo</label><input id="imp" type="file" accept=".json,application/json" hidden></div></div></div>' +
        '<div class="card"><h2>Limpeza</h2><div class="rowflex"><button class="btn" data-a="clear-demo">Apagar só os exemplos</button><button class="btn dng" data-a="wipe">' +
        (dependencies.getWipeArm() ? "Clique de novo para apagar TUDO" : "Apagar tudo") +
        "</button></div></div>"
      );
    }

    return Object.freeze({
      systemPage: systemPage,
    });
  }
  window.DesvelarSystemViews = Object.freeze({ create: create });
})();
