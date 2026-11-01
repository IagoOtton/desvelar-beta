(function () {
  "use strict";

  function create(dependencies) {
    if (
      !dependencies ||
      typeof dependencies.getUserId !== "function" ||
      typeof dependencies.toast !== "function" ||
      typeof dependencies.render !== "function" ||
      !dependencies.repository
    ) {
      throw new Error("As dependências das ações da comunidade não foram informadas.");
    }

    var repository = dependencies.repository;

    function values(form) {
      var output = {};
      new FormData(form).forEach(function (value, key) {
        output[key] = typeof value === "string" ? value.trim() : value;
      });
      return output;
    }

    function busy(form, label) {
      var buttons = [].slice.call(form.querySelectorAll('button[type="submit"]'));
      var originals = buttons.map(function (button) {
        return { button: button, text: button.textContent, disabled: button.disabled };
      });
      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");
      originals.forEach(function (item) {
        item.button.disabled = true;
        item.button.textContent = label || "Salvando…";
      });
      return function () {
        if (!form.isConnected) return;
        delete form.dataset.submitting;
        form.removeAttribute("aria-busy");
        originals.forEach(function (item) {
          item.button.disabled = item.disabled;
          item.button.textContent = item.text;
        });
      };
    }

    function messageFor(error, fallback) {
      var message = error && error.message ? String(error.message) : "";
      if (/duplicate key|already exists|unique constraint/i.test(message)) {
        return "Essa ação já foi registrada.";
      }
      return message ? fallback + " " + message : fallback;
    }

    async function submit(event) {
      var form = event.target.closest("form[data-community-form]");
      if (!form) return false;

      event.preventDefault();
      if (form.dataset.submitting === "true") return true;

      var kind = form.dataset.communityForm;
      var data = values(form);
      var userId = dependencies.getUserId();
      var finishBusy = busy(form, kind === "post" ? "Publicando…" : "Salvando…");
      var result;

      try {
        if (kind === "profile") {
          result = await repository.saveProfile(userId, {
            displayName: data.display_name,
            bio: data.bio,
          });
        } else if (kind === "post") {
          result = await repository.createPost(userId, {
            body: data.body,
            bookTitle: data.book_title,
            bookAuthor: data.book_author,
          });
        } else if (kind === "comment") {
          result = await repository.addComment(userId, form.dataset.postId, data.body);
        } else if (kind === "report") {
          result = await repository.reportPost(userId, form.dataset.postId, data);
        } else if (kind === "create-group") {
          result = await repository.createGroup(data);
        } else if (kind === "join-group") {
          result = await repository.joinGroup(data.invite_code);
        } else if (kind === "open-cycle") {
          result = await repository.openCycle({
            groupId: form.dataset.groupId,
            month: data.month,
            title: data.title,
            author: data.author,
            isbn: data.isbn,
          });
        } else if (kind === "nominate") {
          result = await repository.nominateBook({
            cycleId: form.dataset.cycleId,
            title: data.title,
            author: data.author,
            isbn: data.isbn,
          });
        } else if (kind === "progress") {
          if (data.percent === "" && (data.pages === "" || data.total_pages === "")) {
            dependencies.toast("Informe um percentual ou as páginas lidas e o total do livro.");
            return true;
          }
          if (data.pages !== "" && data.total_pages === "") {
            dependencies.toast("Informe o total de páginas do livro.");
            return true;
          }
          if (data.pages !== "" && Number(data.pages) > Number(data.total_pages)) {
            dependencies.toast("As páginas lidas não podem passar do total do livro.");
            return true;
          }
          result = await repository.addProgress(userId, {
            cycleId: form.dataset.cycleId,
            percent: data.percent,
            pages: data.pages,
            totalPages: data.total_pages,
            note: data.note,
          });
        } else {
          return false;
        }

        if (result && result.error) {
          console.error("Erro ao salvar na comunidade:", result.error);
          dependencies.toast(messageFor(result.error, "Não foi possível concluir. Verifique os dados e tente novamente."));
          return true;
        }

        var messages = {
          profile: "Perfil salvo.",
          post: "Publicação compartilhada.",
          comment: "Comentário adicionado.",
          report: "Denúncia enviada. Obrigado por ajudar a manter a comunidade segura.",
          "create-group": "Grupo de leitura criado. Compartilhe o código de convite.",
          "join-group": "Você entrou no grupo de leitura.",
          "open-cycle": "Ciclo de leitura aberto.",
          nominate: "Livro indicado.",
          progress: "Progresso compartilhado.",
        };
        dependencies.toast(messages[kind] || "Alteração salva.");
        dependencies.render();
        return true;
      } catch (error) {
        console.error("Erro ao salvar na comunidade:", error);
        dependencies.toast(messageFor(error, "Não foi possível concluir. Verifique sua conexão e tente novamente."));
        return true;
      } finally {
        finishBusy();
      }
    }

    async function handleClick(event) {
      var button = event.target.closest("[data-community-action]");
      if (!button) return false;

      var action = button.dataset.communityAction;
      if (action !== "reaction" && action !== "draw") return false;
      event.preventDefault();

      if (button.disabled) return true;
      if (action === "draw" && !window.confirm("Sortear agora o livro do próximo ciclo? O sorteio será registrado e não poderá ser repetido.")) {
        return true;
      }

      button.disabled = true;
      try {
        var result = action === "reaction"
          ? await repository.toggleReaction(
              dependencies.getUserId(),
              button.dataset.postId,
              button.dataset.reacted === "true",
            )
          : await repository.drawBook(button.dataset.cycleId);
        if (result && result.error) {
          console.error("Erro ao processar ação da comunidade:", result.error);
          dependencies.toast(messageFor(result.error, "Não foi possível concluir esta ação."));
          button.disabled = false;
          return true;
        }

        if (action === "reaction") {
          dependencies.render();
        } else {
          dependencies.toast("Sorteio concluído. O livro escolhido já aparece no grupo.");
          dependencies.render();
        }
        return true;
      } catch (error) {
        console.error("Erro ao processar ação da comunidade:", error);
        dependencies.toast(messageFor(error, "Não foi possível concluir. Tente novamente."));
        button.disabled = false;
        return true;
      }
    }

    return Object.freeze({ submit: submit, handleClick: handleClick });
  }

  window.DesvelarCommunityController = Object.freeze({ create: create });
})();
