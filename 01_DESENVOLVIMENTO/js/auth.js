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
        <input id="auth-password" type="password" required minlength="6"
          autocomplete="current-password">

        <div class="auth-actions">
          <button id="auth-submit" class="btn pri" type="submit">Entrar</button>
          <button id="auth-toggle" class="btn sm" type="button">Criar uma conta</button>
        </div>
      </form>

      <p id="auth-message" role="status"></p>
      <p class="auth-note">Cada pessoa deve criar sua própria conta. Estudos, tarefas, hábitos, metas e finanças ficam salvos neste navegador e não sincronizam entre dispositivos. Grupos e feedback usam a nuvem. Evite registrar dados pessoais ou financeiros sensíveis.</p>
    </section>
  `;

  var isSignUp = false;
  var form = document.getElementById("auth-form");
  var message = document.getElementById("auth-message");
  var title = document.getElementById("auth-title");
  var submit = document.getElementById("auth-submit");
  var toggle = document.getElementById("auth-toggle");
  var appStarted = false;

  form.hidden = true;
  toggle.hidden = true;
  message.textContent = "Verificando sessão…";

  function startApp(user) {
    if (!user || appStarted) return;
    appStarted = true;
    window.desvelarUser = user;
    message.textContent = "Abrindo o DESVELAR…";

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

  function showLogin(errorMessage) {
    form.hidden = false;
    toggle.hidden = false;
    message.textContent = errorMessage || "";
  }

  toggle.addEventListener("click", function () {
    isSignUp = !isSignUp;
    title.textContent = isSignUp ? "Criar conta" : "Entrar";
    submit.textContent = isSignUp ? "Cadastrar" : "Entrar";
    toggle.textContent = isSignUp ? "Já tenho uma conta" : "Criar uma conta";
    message.textContent = "";
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (appStarted) return;

    submit.disabled = true;
    toggle.disabled = true;
    message.textContent = "Aguarde…";

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
        message.textContent = result.error.message;
      } else if (isSignUp) {
        message.textContent =
          "Cadastro enviado. Confira seu e-mail para confirmar a conta.";
      } else {
        startApp(result.data.user);
      }
    } catch (error) {
      message.textContent =
        error && error.message
          ? error.message
          : "Não foi possível autenticar. Tente novamente.";
    } finally {
      submit.disabled = false;
      toggle.disabled = false;
    }
  });

  window.desvelarSupabase.auth
    .getSession()
    .then(function (result) {
      if (result.error) throw result.error;

      var session = result.data && result.data.session;
      if (session && session.user) startApp(session.user);
      else showLogin();
    })
    .catch(function (error) {
      console.error("Erro ao recuperar sessão:", error);
      showLogin("Não foi possível recuperar a sessão. Entre novamente.");
    });
})();
