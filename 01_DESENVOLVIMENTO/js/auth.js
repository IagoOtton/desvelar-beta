(function () {
  "use strict";

  var root = document.getElementById("auth-root");
  if (!root) return;

  var shell = document.querySelector(".shell");
  var bottom = document.querySelector(".bottom");
  if (shell) shell.style.display = "none";
  if (bottom) bottom.style.display = "none";

  root.innerHTML = `
    <section class="auth-panel">
      <p class="auth-kicker">Beta entre amigos</p>
      <h1>DESVELAR</h1>
      <p class="auth-lead">Estudos, hábitos e metas em um só lugar.</p>
      <h2 id="auth-title">Entrar</h2>

      <form id="auth-form">
        <label for="auth-email">E-mail</label>
        <input id="auth-email" type="email" required autocomplete="email">

        <label for="auth-password">Senha</label>
        <div class="password-field">
          <input id="auth-password" type="password" required minlength="6"
            autocomplete="current-password" aria-describedby="auth-message">
          <button class="password-toggle" type="button" data-password-toggle="auth-password"
            aria-label="Mostrar senha" aria-controls="auth-password" aria-pressed="false">Mostrar</button>
        </div>

        <div class="auth-actions">
          <button id="auth-submit" class="btn pri" type="submit">Entrar</button>
          <button id="auth-toggle" class="btn sm" type="button">Criar uma conta</button>
        </div>
      </form>

      <button id="auth-forgot" class="btn sm" type="button" hidden>Esqueci minha senha</button>

      <form id="reset-request-form" hidden>
        <label for="reset-email">E-mail da sua conta</label>
        <input id="reset-email" type="email" required autocomplete="email">
        <div class="auth-actions">
          <button class="btn pri" type="submit">Enviar link de redefinição</button>
          <button id="reset-back" class="btn sm" type="button">Voltar</button>
        </div>
      </form>

      <form id="password-recovery-form" hidden>
        <label for="new-password">Nova senha</label>
        <div class="password-field">
          <input id="new-password" type="password" required minlength="6"
            autocomplete="new-password">
          <button class="password-toggle" type="button" data-password-toggle="new-password"
            aria-label="Mostrar senha" aria-controls="new-password" aria-pressed="false">Mostrar</button>
        </div>
        <label for="confirm-password">Confirme a nova senha</label>
        <div class="password-field">
          <input id="confirm-password" type="password" required minlength="6"
            autocomplete="new-password">
          <button class="password-toggle" type="button" data-password-toggle="confirm-password"
            aria-label="Mostrar senha" aria-controls="confirm-password" aria-pressed="false">Mostrar</button>
        </div>
        <button id="password-recovery-submit" class="btn pri" type="submit">Salvar nova senha</button>
      </form>

      <p id="auth-message" role="status"></p>
      <p class="auth-note">Cada pessoa deve usar sua própria conta. Estudos, tarefas, hábitos, metas e finanças ficam associados à conta e sincronizam entre navegadores e dispositivos. Evite registrar dados pessoais ou financeiros sensíveis.</p>
    </section>
  `;

  var isSignUp = false;
  var form = document.getElementById("auth-form");
  var message = document.getElementById("auth-message");
  var loginPassword = document.getElementById("auth-password");
  var title = document.getElementById("auth-title");
  var submit = document.getElementById("auth-submit");
  var toggle = document.getElementById("auth-toggle");
  var forgot = document.getElementById("auth-forgot");
  var resetRequestForm = document.getElementById("reset-request-form");
  var resetBack = document.getElementById("reset-back");
  var passwordRecoveryForm = document.getElementById("password-recovery-form");
  var passwordRecoverySubmit = document.getElementById("password-recovery-submit");
  var appStarted = false;
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
    toggle.hidden = mode !== "login" && mode !== "signup";
    forgot.hidden = mode !== "login";
    title.textContent =
      mode === "signup"
        ? "Criar conta"
        : mode === "reset"
          ? "Recuperar senha"
          : mode === "recovery"
            ? "Definir nova senha"
            : "Entrar";
    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
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

  function cleanRecoveryUrl() {
    window.history.replaceState(null, document.title, window.location.pathname);
  }

  function startApp(user) {
    if (!user || appStarted || recoveryFlow) return;
    appStarted = true;
    window.desvelarUser = user;
    message.textContent = "Carregando seus dados…";

    function openApp() {
      var appScript = document.createElement("script");
      appScript.src = "./js/app.js";
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

  form.addEventListener("input", function (event) {
    if (event.target.id !== "auth-email" && event.target.id !== "auth-password") {
      return;
    }
    if (!form.classList.contains("auth-form--error")) return;

    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
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
    message.textContent = "Enviando…";

    try {
      var result = await window.desvelarSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });

      if (result.error) {
        message.textContent = result.error.message;
      } else {
        message.textContent =
          "Se houver uma conta com esse e-mail, enviaremos um link. Confira sua caixa de entrada e spam.";
      }
    } catch (error) {
      message.textContent =
        error && error.message
          ? error.message
          : "Não foi possível enviar o link. Tente novamente.";
    } finally {
      resetSubmit.disabled = false;
    }
  });

  passwordRecoveryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var newPassword = document.getElementById("new-password").value;
    var confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      message.textContent = "As senhas não coincidem.";
      return;
    }

    passwordRecoverySubmit.disabled = true;
    message.textContent = "Atualizando sua senha…";

    try {
      var result = await window.desvelarSupabase.auth.updateUser({
        password: newPassword,
      });

      if (result.error) {
        message.textContent = result.error.message;
      } else {
        recoveryFlow = false;
        cleanRecoveryUrl();
        startApp(result.data.user);
      }
    } catch (error) {
      message.textContent =
        error && error.message
          ? error.message
          : "Não foi possível atualizar a senha. Tente novamente.";
    } finally {
      passwordRecoverySubmit.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (appStarted) return;

    submit.disabled = true;
    toggle.disabled = true;
    form.classList.remove("auth-form--error");
    loginPassword.removeAttribute("aria-invalid");
    setAuthMessage("Aguarde…", "info");

    var email = document.getElementById("auth-email").value.trim();
    var password = document.getElementById("auth-password").value;

    try {
      var result = isSignUp
        ? await window.desvelarSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo: window.location.href,
            },
          })
        : await window.desvelarSupabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

      if (result.error) {
        if (!isSignUp && isInvalidCredentials(result.error)) {
          loginPassword.value = "";
          loginPassword.setAttribute("aria-invalid", "true");
          form.classList.add("auth-form--error");
          setAuthMessage(
            "E-mail ou senha incorretos. Confira os dados e tente novamente.",
            "error",
          );
          loginPassword.focus();
        } else {
          setAuthMessage(result.error.message, "error");
        }
      } else if (isSignUp) {
        message.textContent =
          "Cadastro enviado. Confira seu e-mail para confirmar a conta.";
      } else {
        startApp(result.data.user);
      }
    } catch (error) {
      setAuthMessage(
        error && error.message
          ? error.message
          : "Não foi possível autenticar. Tente novamente.",
        "error",
      );
    } finally {
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
