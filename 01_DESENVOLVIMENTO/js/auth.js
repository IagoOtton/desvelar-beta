(function () {
  "use strict";

  var authScript = document.currentScript;
  var appScriptSrc = authScript && authScript.getAttribute("data-app-src");
  var root = document.getElementById("auth-root");
  if (!root) return;

  var shell = document.querySelector(".shell");
  var bottom = document.querySelector(".bottom");
  if (shell) shell.style.display = "none";
  if (bottom) bottom.style.display = "none";

  root.innerHTML = `
    <section class="auth-panel" aria-labelledby="auth-heading">
      <header class="auth-brand">
        <span class="auth-brand__mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <path d="M5 20c4-7 9-10.5 15-10.5S31 13 35 20c-4 7-9 10.5-15 10.5S9 27 5 20Z" />
            <circle cx="20" cy="20" r="5.5" />
            <circle class="auth-brand__glint" cx="22" cy="18" r="1.5" />
          </svg>
        </span>
        <span class="auth-brand__name">DESVELAR</span>
        <span class="auth-brand__badge">BETA</span>
      </header>

      <div class="auth-intro">
        <p class="auth-kicker">UM PASSO DE CADA VEZ</p>
        <h1 id="auth-heading">Seu espaço para avançar.</h1>
        <p class="auth-lead">Estudos, atividade física, leitura e finanças — ferramentas pessoais e comunidades para avançar no seu ritmo.</p>
      </div>

      <div class="auth-form-wrap">
        <h2 id="auth-title">Entrar</h2>
        <p id="auth-mode-hint" class="auth-mode-hint">Acesse sua conta para continuar.</p>

        <form id="auth-form" aria-labelledby="auth-title">
          <div class="auth-field">
            <label for="auth-email">E-mail</label>
            <input id="auth-email" type="email" required autocomplete="email"
              inputmode="email" autocapitalize="none" spellcheck="false"
              aria-describedby="auth-message">
          </div>

          <div id="auth-email-confirm-wrap" class="auth-field" hidden>
            <label for="auth-email-confirm">Confirme seu e-mail</label>
            <input id="auth-email-confirm" type="email" autocomplete="off"
              inputmode="email" autocapitalize="none" spellcheck="false"
              aria-describedby="auth-message">
          </div>

          <div class="auth-field">
            <label for="auth-password">Senha</label>
            <div class="password-field">
              <input id="auth-password" type="password" required minlength="6"
                autocomplete="current-password" aria-describedby="auth-message">
              <button class="password-toggle" type="button" data-password-toggle="auth-password"
                aria-label="Mostrar senha" aria-controls="auth-password" aria-pressed="false">Mostrar</button>
            </div>
            <small id="auth-password-hint" class="auth-field-hint" hidden>Use pelo menos 8 caracteres.</small>
          </div>

          <div class="auth-actions">
            <button id="auth-submit" class="btn pri" type="submit">Entrar</button>
            <button id="auth-toggle" class="btn sm" type="button">Criar uma conta</button>
          </div>
        </form>

        <button id="auth-resend-confirm" class="btn sm auth-secondary-action" type="button" hidden>
          Reenviar e-mail de confirmação
        </button>
        <button id="auth-forgot" class="btn sm auth-secondary-action" type="button" hidden>Esqueci minha senha</button>

        <form id="reset-request-form" hidden aria-labelledby="auth-title">
          <div class="auth-field">
            <label for="reset-email">E-mail da sua conta</label>
            <input id="reset-email" type="email" required autocomplete="email"
              inputmode="email" autocapitalize="none" spellcheck="false"
              aria-describedby="auth-message">
          </div>
          <div class="auth-actions">
            <button class="btn pri" type="submit">Enviar link de redefinição</button>
            <button id="reset-back" class="btn sm" type="button">Voltar</button>
          </div>
        </form>

        <form id="password-recovery-form" hidden aria-labelledby="auth-title">
          <div class="auth-field">
            <label for="new-password">Nova senha</label>
            <div class="password-field">
              <input id="new-password" type="password" required minlength="8"
                autocomplete="new-password" aria-describedby="auth-message new-password-hint">
              <button class="password-toggle" type="button" data-password-toggle="new-password"
                aria-label="Mostrar senha" aria-controls="new-password" aria-pressed="false">Mostrar</button>
            </div>
            <small id="new-password-hint" class="auth-field-hint">Use pelo menos 8 caracteres.</small>
          </div>
          <div class="auth-field">
            <label for="confirm-password">Confirme a nova senha</label>
            <div class="password-field">
              <input id="confirm-password" type="password" required minlength="8"
                autocomplete="new-password" aria-describedby="auth-message">
              <button class="password-toggle" type="button" data-password-toggle="confirm-password"
                aria-label="Mostrar senha" aria-controls="confirm-password" aria-pressed="false">Mostrar</button>
            </div>
          </div>
          <button id="password-recovery-submit" class="btn pri" type="submit">Salvar nova senha</button>
        </form>
      </div>

      <p id="auth-message" role="status" aria-live="polite"></p>
      <p class="auth-note">Sua conta mantém seus dados sincronizados entre dispositivos. Evite registrar informações pessoais ou financeiras sensíveis.</p>
      <p class="auth-privacy-link"><a href="./privacidade.html">Leia o aviso de privacidade</a></p>
    </section>
  `;

  var MIN_PASSWORD_LENGTH = 8;
  var isSignUp = false;
  var form = document.getElementById("auth-form");
  var message = document.getElementById("auth-message");
  var loginPassword = document.getElementById("auth-password");
  var title = document.getElementById("auth-title");
  var modeHint = document.getElementById("auth-mode-hint");
  var emailConfirmWrap = document.getElementById("auth-email-confirm-wrap");
  var emailConfirm = document.getElementById("auth-email-confirm");
  var passwordHint = document.getElementById("auth-password-hint");
  var submit = document.getElementById("auth-submit");
  var toggle = document.getElementById("auth-toggle");
  var resendConfirmation = document.getElementById("auth-resend-confirm");
  var forgot = document.getElementById("auth-forgot");
  var resetRequestForm = document.getElementById("reset-request-form");
  var resetBack = document.getElementById("reset-back");
  var passwordRecoveryForm = document.getElementById("password-recovery-form");
  var passwordRecoverySubmit = document.getElementById("password-recovery-submit");
  var appStarted = false;
  var authRequestInFlight = false;
  var recoveryFlow = isRecoveryRedirect();
  var recoveryVerified = false;

  form.hidden = true;
  toggle.hidden = true;
  message.textContent = recoveryFlow
    ? "Validando o link de redefinição…"
    : "Verificando sessão…";

  function isRecoveryRedirect() {
    var hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    var query = new URLSearchParams(window.location.search);
    return hash.get("type") === "recovery" || query.get("type") === "recovery";
  }

  function hasRecoverySession(session) {
    if (!session || !session.user) return false;
    if (recoveryVerified) return true;

    var hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    var recoveryAccessToken = hash.get("access_token");
    return Boolean(recoveryAccessToken && session.access_token === recoveryAccessToken);
  }

  function setAuthMode(mode, text) {
    form.hidden = mode !== "login" && mode !== "signup";
    resetRequestForm.hidden = mode !== "reset";
    passwordRecoveryForm.hidden = mode !== "recovery";
    resendConfirmation.hidden = true;
    var signupMode = mode === "signup";
    emailConfirmWrap.hidden = !signupMode;
    emailConfirm.required = signupMode;
    loginPassword.minLength = signupMode ? MIN_PASSWORD_LENGTH : 6;
    loginPassword.autocomplete = signupMode ? "new-password" : "current-password";
    loginPassword.setAttribute(
      "aria-describedby",
      signupMode ? "auth-message auth-password-hint" : "auth-message",
    );
    passwordHint.hidden = !signupMode;
    toggle.hidden = mode !== "login" && mode !== "signup";
    forgot.hidden = mode !== "login";
    title.textContent =
      mode === "signup"
        ? "Criar sua conta"
        : mode === "reset"
          ? "Recuperar senha"
          : mode === "recovery"
            ? "Definir nova senha"
            : "Entrar";
    modeHint.textContent =
      mode === "signup"
        ? "Crie seu acesso para começar a organizar sua rotina."
        : mode === "reset"
          ? "Enviaremos um link para você criar uma nova senha."
          : mode === "recovery"
            ? "Escolha uma senha nova para sua conta."
            : "Acesse sua conta para continuar.";
    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
    emailConfirm.removeAttribute("aria-invalid");
    setAuthMessage(text || "", "info");
  }

  function setAuthMessage(text, type) {
    message.textContent = text;
    message.classList.toggle("auth-message--error", type === "error");
    message.setAttribute("role", type === "error" ? "alert" : "status");
    message.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  }

  function isInvalidCredentials(error) {
    if (!error) return false;
    return (
      error.code === "invalid_credentials" ||
      /invalid login credentials/i.test(error.message || "")
    );
  }

  function isEmailNotConfirmed(error) {
    return Boolean(
      error &&
        (error.code === "email_not_confirmed" ||
          /email not confirmed/i.test(error.message || "")),
    );
  }

  function safeAuthError(error, fallback) {
    if (
      error &&
      [
        "over_email_send_rate_limit",
        "over_request_rate_limit",
        "request_rate_limit_exceeded",
      ].includes(error.code)
    ) {
      return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
    }
    if (
      error &&
      ["weak_password", "password_too_short"].includes(error.code)
    ) {
      return "Use uma senha com pelo menos 8 caracteres.";
    }
    return fallback;
  }

  function authRedirectUrl() {
    return window.location.origin + window.location.pathname;
  }

  function cleanRecoveryUrl() {
    window.history.replaceState(null, document.title, window.location.pathname);
  }

  function startApp(user) {
    if (!user || appStarted || recoveryFlow) return;
    appStarted = true;
    window.desvelarUser = user;
    message.textContent = "Carregando seus dados…";
    var appSource = appScriptSrc || "./js/app.js";

    if (appScriptSrc) {
      var appPreload = document.createElement("link");
      appPreload.rel = "preload";
      appPreload.as = "script";
      appPreload.href = appScriptSrc;
      document.head.appendChild(appPreload);
    }

    function openApp() {
      var appScript = document.createElement("script");
      appScript.src = appSource;
      appScript.onload = function () {
        root.style.display = "none";
        if (shell) shell.style.display = "";
        if (bottom) bottom.style.display = "";
      };
      appScript.onerror = function () {
        appStarted = false;
        message.textContent = "Não foi possível carregar o app. Tente novamente.";
        form.hidden = false;
        toggle.hidden = false;
      };
      document.body.appendChild(appScript);
    }

    try {
      window.desvelarCloudData = window.DesvelarCloudDataRepository.create({
        client: window.desvelarSupabase,
        userId: user.id,
        mergeForSync: window.DesvelarDataModel.mergeForSync,
      });
    } catch (error) {
      console.error("Erro ao preparar a sincronização:", error);
      window.desvelarCloudBootstrap = {
        data: null,
        revision: 0,
        updatedAt: null,
        error: error,
      };
      openApp();
      return;
    }

    window.desvelarCloudData
      .load()
      .then(function (snapshot) {
        window.desvelarCloudBootstrap = snapshot;
        openApp();
      })
      .catch(function (error) {
        console.error("Erro ao carregar dados da nuvem:", error);
        window.desvelarCloudBootstrap = {
          data: null,
          revision: 0,
          updatedAt: null,
          error: error,
        };
        openApp();
      });
  }

  function showLogin(errorMessage) {
    recoveryFlow = false;
    isSignUp = false;
    submit.textContent = "Entrar";
    toggle.textContent = "Criar uma conta";
    setAuthMode("login", errorMessage);
  }

  toggle.addEventListener("click", function () {
    isSignUp = !isSignUp;
    submit.textContent = isSignUp ? "Cadastrar" : "Entrar";
    toggle.textContent = isSignUp ? "Já tenho uma conta" : "Criar uma conta";
    setAuthMode(isSignUp ? "signup" : "login");
  });

  resendConfirmation.addEventListener("click", async function () {
    var emailInput = document.getElementById("auth-email");
    var email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid) {
      setAuthMessage(
        "Digite o mesmo e-mail usado no cadastro para reenviar a confirmação.",
        "error",
      );
      emailInput.focus();
      return;
    }

    resendConfirmation.disabled = true;
    setAuthMessage("Enviando…", "info");

    try {
      var result = await window.desvelarSupabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: authRedirectUrl(),
        },
      });

      if (result.error) {
        setAuthMessage(
          safeAuthError(
            result.error,
            "Não foi possível reenviar agora. Aguarde um pouco e tente novamente.",
          ),
          "error",
        );
      } else {
        setAuthMessage(
          "Se houver um cadastro pendente para esse e-mail, enviaremos uma nova confirmação. Confira a caixa de entrada, spam e quarentena.",
          "info",
        );
      }
    } catch (error) {
      setAuthMessage(
        "Não foi possível reenviar agora. Aguarde um pouco e tente novamente.",
        "error",
      );
    } finally {
      resendConfirmation.disabled = false;
    }
  });

  form.addEventListener("input", function (event) {
    if (
      event.target.id !== "auth-email" &&
      event.target.id !== "auth-email-confirm" &&
      event.target.id !== "auth-password"
    ) {
      return;
    }
    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
    emailConfirm.removeAttribute("aria-invalid");
    if (event.target.id === "auth-email") {
      resendConfirmation.hidden = true;
    }
    setAuthMessage("", "info");
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-password-toggle]");
    if (!button) return;

    var input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;

    var visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
    button.setAttribute("aria-pressed", String(visible));
  });

  forgot.addEventListener("click", function () {
    var loginEmail = document.getElementById("auth-email").value.trim();
    document.getElementById("reset-email").value = loginEmail;
    setAuthMode("reset", "Informe o e-mail da sua conta para receber o link.");
  });

  resetBack.addEventListener("click", function () {
    showLogin();
  });

  resetRequestForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var resetSubmit = resetRequestForm.querySelector('button[type="submit"]');
    var email = document.getElementById("reset-email").value.trim();

    resetSubmit.disabled = true;
    setAuthMessage("Enviando…", "info");

    try {
      var result = await window.desvelarSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl(),
      });

      if (result.error) {
        setAuthMessage(
          safeAuthError(
            result.error,
            "Não foi possível solicitar o link agora. Tente novamente mais tarde.",
          ),
          "error",
        );
      } else {
        setAuthMessage(
          "Se houver uma conta com esse e-mail, enviaremos um link. Confira a caixa de entrada e spam.",
          "info",
        );
      }
    } catch (error) {
      setAuthMessage(
        "Não foi possível solicitar o link agora. Tente novamente mais tarde.",
        "error",
      );
    } finally {
      resetSubmit.disabled = false;
    }
  });

  passwordRecoveryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var newPassword = document.getElementById("new-password").value;
    var confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      setAuthMessage("As senhas não coincidem.", "error");
      return;
    }

    passwordRecoverySubmit.disabled = true;
    setAuthMessage("Atualizando sua senha…", "info");

    try {
      var result = await window.desvelarSupabase.auth.updateUser({
        password: newPassword,
      });

      if (result.error) {
        setAuthMessage(
          safeAuthError(
            result.error,
            "Não foi possível atualizar a senha. Solicite um novo link e tente outra vez.",
          ),
          "error",
        );
      } else {
        recoveryFlow = false;
        cleanRecoveryUrl();
        startApp(result.data.user);
      }
    } catch (error) {
      setAuthMessage(
        "Não foi possível atualizar a senha. Solicite um novo link e tente outra vez.",
        "error",
      );
    } finally {
      passwordRecoverySubmit.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (appStarted || authRequestInFlight) return;

    var signingUp = isSignUp;
    var email = document.getElementById("auth-email").value.trim();
    var password = loginPassword.value;
    if (
      signingUp &&
      email.toLowerCase() !== emailConfirm.value.trim().toLowerCase()
    ) {
      emailConfirm.setAttribute("aria-invalid", "true");
      setAuthMessage("Os e-mails não coincidem. Confira os dois campos.", "error");
      emailConfirm.focus();
      return;
    }

    authRequestInFlight = true;
    submit.disabled = true;
    toggle.disabled = true;
    var authInputs = Array.from(form.querySelectorAll("input"));
    authInputs.forEach(function (input) {
      input.disabled = true;
    });
    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
    emailConfirm.removeAttribute("aria-invalid");
    setAuthMessage("Aguarde…", "info");

    try {
      var result = signingUp
        ? await window.desvelarSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo: authRedirectUrl(),
            },
          })
        : await window.desvelarSupabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

      if (result.error) {
        if (!signingUp && isInvalidCredentials(result.error)) {
          loginPassword.value = "";
          loginPassword.setAttribute("aria-invalid", "true");
          form.classList.add("auth-form--error");
          setAuthMessage(
            "E-mail ou senha incorretos. Confira os dados e tente novamente.",
            "error",
          );
          loginPassword.focus();
        } else if (!signingUp && isEmailNotConfirmed(result.error)) {
          resendConfirmation.hidden = false;
          setAuthMessage(
            "Este e-mail ainda não foi confirmado. Confira a caixa de entrada, spam e quarentena ou reenvie a confirmação.",
            "error",
          );
        } else if (
          result.error.code === "weak_password" ||
          result.error.code === "password_too_short"
        ) {
          setAuthMessage(
            "A senha não atende aos requisitos atuais. Use pelo menos 8 caracteres ou recupere sua senha.",
            "error",
          );
        } else {
          setAuthMessage(
            safeAuthError(
              result.error,
              signingUp
                ? "Não foi possível concluir o cadastro. Confira os dados e tente novamente."
                : "Não foi possível entrar agora. Confira os dados e tente novamente.",
            ),
            "error",
          );
        }
      } else if (signingUp) {
        resendConfirmation.hidden = false;
        setAuthMessage(
          "Se o cadastro puder ser concluído, enviaremos uma confirmação. Se já houver uma conta, entre ou recupere a senha.",
          "info",
        );
      } else {
        startApp(result.data.user);
      }
    } catch (error) {
      setAuthMessage(
        signingUp
          ? "Não foi possível concluir o cadastro agora. Tente novamente mais tarde."
          : "Não foi possível entrar agora. Tente novamente mais tarde.",
        "error",
      );
    } finally {
      authRequestInFlight = false;
      authInputs.forEach(function (input) {
        input.disabled = false;
      });
      submit.disabled = false;
      toggle.disabled = false;
    }
  });

  window.desvelarSupabase.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") {
      recoveryFlow = true;
      recoveryVerified = Boolean(session && session.user);
      if (session && session.user) {
        setAuthMode("recovery", "Link validado. Defina uma nova senha para sua conta.");
      } else {
        setAuthMode("reset", "Não foi possível validar o link. Solicite um novo.");
      }
    }
  });

  window.desvelarSupabase.auth
    .getSession()
    .then(function (result) {
      if (result.error) throw result.error;

      var session = result.data && result.data.session;
      if (recoveryFlow) {
        if (hasRecoverySession(session)) {
          setAuthMode("recovery", "Link validado. Defina uma nova senha para sua conta.");
        } else {
          setAuthMode("reset", "O link expirou ou não é válido. Solicite um novo para continuar.");
        }
      } else if (session && session.user) {
        startApp(session.user);
      } else {
        showLogin();
      }
    })
    .catch(function (error) {
      console.error("Erro ao recuperar sessão:", error);
      if (recoveryFlow) {
        setAuthMode("reset", "Não foi possível validar o link. Solicite um novo para continuar.");
      } else {
        showLogin("Não foi possível recuperar a sessão. Entre novamente.");
      }
    });
})();

