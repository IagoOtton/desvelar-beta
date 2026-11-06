(function () {
  "use strict";

  var AREAS = [
    "estudo",
    "foco",
    "temas",
    "erros",
    "desempenho",
  ];

  function create(client) {
    if (!client || typeof client.rpc !== "function") {
      throw new Error("O serviço de métricas do site não está disponível.");
    }

    var consentEnabled = false;
    var lastArea = "";
    var lastAreaAt = 0;
    var lastPresenceAt = 0;
    var areaCooldownMs = 5 * 60 * 1000;
    var presenceCooldownMs = 60 * 1000;

    function getConsent() {
      return client.rpc("get_my_usage_analytics_consent_v2").then(function (result) {
        if (result.error) return { enabled: false, error: result.error };
        consentEnabled = result.data === true;
        return { enabled: consentEnabled, error: null };
      }).catch(function (error) {
        return { enabled: false, error: error };
      });
    }

    function getPendingConsentPrompt() {
      return client.rpc("get_my_usage_analytics_consent_prompt_v2").then(function (result) {
        if (result.error) return { pending: false, error: result.error };
        return { pending: result.data === true, error: null };
      }).catch(function (error) {
        return { pending: false, error: error };
      });
    }

    function setConsent(enabled) {
      if (typeof enabled !== "boolean") {
        return Promise.resolve({ ok: false, error: new Error("Escolha inválida.") });
      }

      return client.rpc("set_my_usage_analytics_consent_v2", {
        p_enabled: enabled,
      }).then(function (result) {
        if (result.error || result.data !== true) {
          return { ok: false, error: result.error || new Error("Não foi possível salvar sua escolha.") };
        }
        consentEnabled = enabled;
        lastArea = "";
        lastAreaAt = 0;
        lastPresenceAt = 0;
        return { ok: true, error: null };
      }).catch(function (error) {
        return { ok: false, error: error };
      });
    }

    function send(area) {
      return Promise.resolve()
        .then(function () {
          return client.rpc("record_my_site_usage", { p_area: area || null });
        })
        .catch(function () {
          return null;
        });
    }

    function recordArea(area, force) {
      var normalized = AREAS.indexOf(area) === -1 ? "" : area;
      if (!consentEnabled || !normalized) return Promise.resolve(null);

      var now = Date.now();
      if (!force && normalized === lastArea && now - lastAreaAt < areaCooldownMs) {
        return Promise.resolve(null);
      }

      lastArea = normalized;
      lastAreaAt = now;
      lastPresenceAt = now;
      return send(normalized);
    }

    function recordPresence() {
      if (!consentEnabled) return Promise.resolve(null);
      var now = Date.now();
      if (now - lastPresenceAt < presenceCooldownMs) return Promise.resolve(null);
      lastPresenceAt = now;
      return send(null);
    }

    function recordFirstStudyRecord() {
      function sendFirstRecord() {
        return Promise.resolve()
          .then(function () {
            return client.rpc("record_my_first_study_record");
          })
          .catch(function () {
            return null;
          });
      }

      if (consentEnabled) return sendFirstRecord();
      return getConsent().then(function (consent) {
        if (!consent.enabled) return null;
        return sendFirstRecord();
      }).catch(function () {
        return null;
      });
    }

    function initialize(area) {
      return getConsent().then(function (consent) {
        if (consent.enabled) return recordArea(area, true).then(function () { return consent; });
        return consent;
      });
    }

    function isAdmin() {
      return client.rpc("is_site_usage_admin").then(function (result) {
        return !result.error && result.data === true;
      }).catch(function () {
        return false;
      });
    }

    function getDashboard() {
      return isAdmin().then(function (admin) {
        if (!admin) return null;
        return client.rpc("get_site_usage_metrics").then(function (result) {
          if (result.error || !result.data || typeof result.data !== "object") return null;
          return result.data;
        }).catch(function () {
          return null;
        });
      });
    }

    return Object.freeze({
      getConsent: getConsent,
      getPendingConsentPrompt: getPendingConsentPrompt,
      setConsent: setConsent,
      initialize: initialize,
      recordArea: recordArea,
      recordPresence: recordPresence,
      recordFirstStudyRecord: recordFirstStudyRecord,
      isAdmin: isAdmin,
      getDashboard: getDashboard,
    });
  }

  window.DesvelarUsageAnalytics = Object.freeze({ create: create });
})();
