(function () {
  "use strict";

  function create(dependencies) {
    var required = ["getUser", "flush", "toast", "confirm", "reload"];
    if (
      !dependencies ||
      required.some(function (key) {
        return typeof dependencies[key] !== "function";
      }) ||
      !dependencies.auth ||
      typeof dependencies.auth.signInWithPassword !== "function" ||
      typeof dependencies.auth.signOut !== "function"
    ) {
      throw new Error("As dependências da conta do DESVELAR não foram informadas.");
    }

    var signingOut = false;

    async function verifyPassword(password) {
      var user = dependencies.getUser();
      if (!password || !user || !user.email) return false;

      var result = await dependencies.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (result.error) {
        if (
          result.error.status === 400 ||
          result.error.code === "invalid_credentials"
        ) {
          return false;
        }
        throw result.error;
      }

      return Boolean(
        result.data &&
          result.data.user &&
          result.data.user.id === user.id,
      );
    }

    async function signOut() {
      if (signingOut) return false;
      signingOut = true;

      try {
        var saveResult = await dependencies.flush();
        if (!saveResult.saved) {
          dependencies.toast("Não foi possível salvar neste navegador. Você continua conectado.");
          return false;
        }

        if (
          !saveResult.synced &&
          !dependencies.confirm(
            "Não foi possível sincronizar agora. Seu progresso está salvo neste navegador e tentará sincronizar na próxima entrada. Sair mesmo assim?",
          )
        ) {
          return false;
        }

        var result = await dependencies.auth.signOut();
        if (result.error) throw result.error;

        dependencies.reload();
        return true;
      } finally {
        signingOut = false;
      }
    }

    return Object.freeze({
      verifyPassword: verifyPassword,
      signOut: signOut,
    });
  }

  window.DesvelarAccountController = Object.freeze({ create: create });
})();


