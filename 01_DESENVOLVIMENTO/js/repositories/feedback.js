(function () {
  "use strict";

  var CATEGORIES = ["usability", "bug", "idea", "other"];

  function submit(feedback) {
    if (!window.desvelarSupabase) {
      return Promise.resolve({
        data: null,
        error: new Error("O serviço de feedback não está disponível."),
      });
    }

    var category = String((feedback && feedback.category) || "");
    var message = String((feedback && feedback.message) || "").trim();

    if (CATEGORIES.indexOf(category) === -1) {
      return Promise.resolve({
        data: null,
        error: new Error("Escolha um tipo de feedback válido."),
      });
    }

    if (message.length < 10 || message.length > 1500) {
      return Promise.resolve({
        data: null,
        error: new Error("A mensagem precisa ter entre 10 e 1500 caracteres."),
      });
    }

    return window.desvelarSupabase
      .from("app_feedback")
      .insert({ category: category, message: message });
  }

  function listForAdmin() {
    if (!window.desvelarSupabase) {
      return Promise.resolve({
        data: null,
        error: new Error("O serviço de feedback não está disponível."),
      });
    }

    return window.desvelarSupabase.rpc("get_admin_app_feedback");
  }

  window.DesvelarFeedbackRepository = Object.freeze({
    submit: submit,
    listForAdmin: listForAdmin,
  });
})();
