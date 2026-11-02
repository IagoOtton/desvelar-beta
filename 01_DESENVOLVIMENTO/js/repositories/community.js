(function () {
  "use strict";

  function getClient() {
    if (!window.desvelarSupabase) {
      throw new Error("A comunidade não está disponível no momento.");
    }
    return window.desvelarSupabase;
  }

  function rows(result) {
    return result && Array.isArray(result.data) ? result.data : [];
  }

  async function loadPage(userId) {
    var client = getClient();
    var initial = await Promise.all([
      client
        .from("reader_profiles")
        .select("user_id, display_name, bio")
        .eq("user_id", userId)
        .maybeSingle(),
      client
        .from("community_posts")
        .select(
          "id, author_id, body, book_title, book_author, created_at, reader_profiles(display_name), community_post_comments(id, author_id, body, created_at, reader_profiles(display_name)), community_post_reactions(user_id)",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("reader_group_members")
        .select("role, joined_at, reader_groups(id, name, description, invite_code, created_by)")
        .eq("user_id", userId),
    ]);

    var profileResult = initial[0];
    var postResult = initial[1];
    var memberResult = initial[2];
    var groups = rows(memberResult)
      .map(function (membership) {
        if (!membership.reader_groups) return null;
        var group = membership.reader_groups;
        group.role = membership.role;
        group.joined_at = membership.joined_at;
        return group;
      })
      .filter(Boolean);
    var groupIds = groups.map(function (group) { return group.id; });
    var cycles = [];
    var candidates = [];
    var nominations = [];
    var progress = [];
    var cycleError = null;
    var relatedError = null;

    if (groupIds.length) {
      var cycleResult = await client
        .from("reader_group_cycles")
        .select("id, group_id, cycle_month, status, selected_title, selected_author, selected_isbn, opened_by, selected_by, selected_at")
        .in("group_id", groupIds)
        .order("cycle_month", { ascending: false });
      cycleError = cycleResult.error || null;
      cycles = rows(cycleResult);

      var cycleIds = cycles.map(function (cycle) { return cycle.id; });
      if (cycleIds.length) {
        var related = await Promise.all([
          client
            .from("reader_group_book_candidates")
            .select("id, cycle_id, title, author, isbn, nominated_at")
            .in("cycle_id", cycleIds)
            .order("nominated_at", { ascending: true }),
          client
            .from("reader_group_nominations")
            .select("candidate_id, cycle_id, user_id, created_at")
            .in("cycle_id", cycleIds),
          client
            .from("reader_group_progress_updates")
            .select("id, cycle_id, user_id, percent_complete, pages_read, total_pages, note, created_at")
            .in("cycle_id", cycleIds)
            .order("created_at", { ascending: false }),
        ]);
        candidates = rows(related[0]);
        nominations = rows(related[1]);
        progress = rows(related[2]);
        relatedError = related[0].error || related[1].error || related[2].error || null;
        if (progress.length) {
          var progressUserIds = Array.from(new Set(progress.map(function (entry) {
            return entry.user_id;
          })));
          var progressProfilesResult = await client
            .from("reader_profiles")
            .select("user_id, display_name")
            .in("user_id", progressUserIds);
          relatedError = relatedError || progressProfilesResult.error || null;
          var profileNames = Object.create(null);
          rows(progressProfilesResult).forEach(function (profile) {
            profileNames[profile.user_id] = profile.display_name;
          });
          progress.forEach(function (entry) {
            entry.reader_profiles = {
              display_name: profileNames[entry.user_id] || "Leitor",
            };
          });
        }
      }
    }

    return {
      profile: profileResult.data || null,
      posts: rows(postResult),
      groups: groups,
      cycles: cycles,
      candidates: candidates,
      nominations: nominations,
      progress: progress,
      errors: {
        profile: profileResult.error || null,
        posts: postResult.error || null,
        groups: memberResult.error || null,
        cycles: cycleError,
        related: relatedError,
      },
    };
  }

  function saveProfile(userId, values) {
    return getClient()
      .from("reader_profiles")
      .upsert({
        user_id: userId,
        display_name: String(values.displayName || "").trim(),
        bio: String(values.bio || "").trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  }

  function createPost(userId, values) {
    return getClient().from("community_posts").insert({
      author_id: userId,
      body: String(values.body || "").trim(),
      book_title: String(values.bookTitle || "").trim() || null,
      book_author: String(values.bookAuthor || "").trim() || null,
    });
  }

  function addComment(userId, postId, body) {
    return getClient().from("community_post_comments").insert({
      post_id: postId,
      author_id: userId,
      body: String(body || "").trim(),
    });
  }

  function toggleReaction(userId, postId, alreadyReacted) {
    var query = getClient().from("community_post_reactions");
    if (alreadyReacted) {
      return query.delete().eq("post_id", postId).eq("user_id", userId);
    }
    return query.insert({ post_id: postId, user_id: userId });
  }

  function reportPost(userId, postId, values) {
    return getClient().from("community_post_reports").insert({
      post_id: postId,
      reporter_id: userId,
      reason: values.reason,
      details: String(values.details || "").trim(),
    });
  }

  function createGroup(values) {
    return getClient().rpc("create_reader_group", {
      p_name: String(values.name || "").trim(),
      p_description: String(values.description || "").trim(),
    });
  }

  function joinGroup(inviteCode) {
    return getClient().rpc("join_reader_group", {
      p_invite_code: String(inviteCode || "").trim().toUpperCase(),
    });
  }

  function openCycle(values) {
    return getClient().rpc("open_reader_cycle", {
      p_group_id: values.groupId,
      p_cycle_month: values.month + "-01",
      p_book_title: String(values.title || "").trim() || null,
      p_book_author: String(values.author || "").trim(),
      p_book_isbn: String(values.isbn || "").trim() || null,
    });
  }

  function nominateBook(values) {
    return getClient().rpc("nominate_reader_book", {
      p_cycle_id: values.cycleId,
      p_title: String(values.title || "").trim(),
      p_author: String(values.author || "").trim(),
      p_isbn: String(values.isbn || "").trim() || null,
    });
  }

  function drawBook(cycleId) {
    return getClient().rpc("draw_reader_book", { p_cycle_id: cycleId });
  }

  function addProgress(userId, values) {
    return getClient().from("reader_group_progress_updates").insert({
      cycle_id: values.cycleId,
      user_id: userId,
      percent_complete: values.percent === "" ? null : Number(values.percent),
      pages_read: values.pages === "" ? null : Number(values.pages),
      total_pages: values.totalPages === "" ? null : Number(values.totalPages),
      note: String(values.note || "").trim(),
    });
  }

  window.DesvelarCommunityRepository = Object.freeze({
    loadPage: loadPage,
    saveProfile: saveProfile,
    createPost: createPost,
    addComment: addComment,
    toggleReaction: toggleReaction,
    reportPost: reportPost,
    createGroup: createGroup,
    joinGroup: joinGroup,
    openCycle: openCycle,
    nominateBook: nominateBook,
    drawBook: drawBook,
    addProgress: addProgress,
  });
})();
