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

  var FEED_PAGE_SIZE = 20;
  var COMMENT_PREVIEW_SIZE = 3;
  var COMMENT_PAGE_SIZE = 10;
  var feedCache = null;
  var pageCache = null;
  var activeUserId = null;
  var expandedCycles = Object.create(null);
  var cycleDetailsById = Object.create(null);
  var cycleDetailErrors = Object.create(null);

  function compareCreatedAtAscending(left, right) {
    var dateComparison = String(left.created_at).localeCompare(String(right.created_at));
    return dateComparison || String(left.id).localeCompare(String(right.id));
  }

  function cursorFilter(cursor) {
    var createdAt = String(cursor && cursor.created_at || "");
    var id = String(cursor && cursor.id || "");
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      throw new Error("Não foi possível continuar a paginação da comunidade.");
    }
    return "created_at.lt." + createdAt + ",and(created_at.eq." + createdAt + ",id.lt." + id + ")";
  }

  function applyPostStats(posts, stats) {
    var statsByPost = Object.create(null);
    rows(stats).forEach(function (entry) {
      statsByPost[entry.post_id] = entry;
    });
    posts.forEach(function (post) {
      post.community_post_comments = Array.isArray(post.community_post_comments)
        ? post.community_post_comments.slice().sort(compareCreatedAtAscending)
        : [];
      var postStats = statsByPost[post.id];
      post.comment_count = postStats ? Number(postStats.comment_count) : post.community_post_comments.length;
      post.reaction_count = postStats ? Number(postStats.reaction_count) : 0;
      post.reacted_by_user = Boolean(postStats && postStats.reacted_by_user);
    });
  }

  async function readPostPage(client, cursor, pageSize) {
    var query = client
      .from("community_posts")
      .select(
        "id, author_id, body, book_title, book_author, created_at, reader_profiles(display_name), community_post_comments(id, author_id, body, created_at, reader_profiles(display_name))",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .order("created_at", {
        ascending: false,
        referencedTable: "community_post_comments",
      })
      .limit(COMMENT_PREVIEW_SIZE, { referencedTable: "community_post_comments" })
      .limit(pageSize + 1);

    if (cursor) query = query.or(cursorFilter(cursor));

    var postResult = await query;
    if (postResult.error) {
      return { posts: [], hasMore: false, cursor: cursor || null, error: postResult.error, statsError: null };
    }

    var fetchedPosts = rows(postResult);
    var hasMore = fetchedPosts.length > pageSize;
    var posts = fetchedPosts.slice(0, pageSize);
    var statsResult = posts.length
      ? await client.rpc("get_community_post_stats", {
          p_post_ids: posts.map(function (post) { return post.id; }),
        })
      : { data: [], error: null };
    applyPostStats(posts, statsResult.data);

    return {
      posts: posts,
      hasMore: hasMore,
      cursor: posts.length
        ? { created_at: posts[posts.length - 1].created_at, id: posts[posts.length - 1].id }
        : cursor || null,
      error: null,
      statsError: statsResult.error || null,
    };
  }

  function emptyFeedCache(userId, result) {
    return {
      userId: userId,
      posts: result.posts,
      hasMore: result.hasMore,
      cursor: result.cursor,
      postsError: result.error,
      statsError: result.statsError,
    };
  }

  async function ensureFeed(client, userId) {
    if (feedCache && feedCache.userId === userId) {
      return feedCache;
    }
    var result = await readPostPage(client, null, FEED_PAGE_SIZE);
    feedCache = emptyFeedCache(userId, result);
    return feedCache;
  }

  function dashboardData(result) {
    var cycles = [];
    rows(result).forEach(function (row) {
      var cycle = {
        id: row.id,
        group_id: row.group_id,
        cycle_month: row.cycle_month,
        status: row.status,
        selected_title: row.selected_title,
        selected_author: row.selected_author,
        selected_isbn: row.selected_isbn,
        opened_by: row.opened_by,
        selected_by: row.selected_by,
        selected_at: row.selected_at,
        candidate_count: Number(row.candidate_count || 0),
        progress_count: Number(row.progress_count || 0),
        total_cycle_count: Number(row.total_cycle_count || 0),
      };
      cycles.push(cycle);
    });
    return { cycles: cycles };
  }

  function detailData(result) {
    var row = rows(result)[0];
    if (!row) return null;
    return {
      candidates: Array.isArray(row.candidates) ? row.candidates : [],
      progress: Array.isArray(row.progress) ? row.progress : [],
      progress_count: Number(row.progress_count || 0),
    };
  }

  async function readCycleDetails(client, cycleId) {
    try {
      var result = await client.rpc("get_reader_group_cycle_details", {
        p_cycle_id: cycleId,
      });
      if (result.error) return { error: result.error };
      var details = detailData(result);
      if (!details) return { error: new Error("Os detalhes deste ciclo não estão disponíveis.") };
      cycleDetailsById[cycleId] = details;
      delete cycleDetailErrors[cycleId];
      return { data: details, error: null };
    } catch (error) {
      return { error: error };
    }
  }

  async function loadExpandedCycleDetails(client, cycles) {
    var expanded = cycles.filter(function (cycle) {
      return expandedCycles[cycle.id] && !cycleDetailsById[cycle.id];
    });
    await Promise.all(expanded.map(async function (cycle) {
      var result = await readCycleDetails(client, cycle.id);
      if (result.error) cycleDetailErrors[cycle.id] = result.error;
    }));
  }

  function pageData(userId, currentFeed, cachedPage) {
    return {
      profile: cachedPage.profile,
      posts: currentFeed.posts,
      hasMorePosts: currentFeed.hasMore,
      groups: cachedPage.groups,
      cycles: cachedPage.cycles,
      cycleDetails: cycleDetailsById,
      cycleDetailErrors: cycleDetailErrors,
      errors: {
        profile: cachedPage.errors.profile,
        posts: currentFeed.postsError || null,
        postStats: currentFeed.statsError || null,
        groups: cachedPage.errors.groups,
        cycles: cachedPage.errors.cycles,
        related: null,
      },
    };
  }

  async function loadPage(userId) {
    var client = getClient();
    if (activeUserId !== userId) {
      activeUserId = userId;
      feedCache = null;
      pageCache = null;
      expandedCycles = Object.create(null);
      cycleDetailsById = Object.create(null);
      cycleDetailErrors = Object.create(null);
    }
    var feedPromise = ensureFeed(client, userId);
    if (pageCache && pageCache.userId === userId) {
      return pageData(userId, await feedPromise, pageCache);
    }

    var initial = await Promise.all([
      client
        .from("reader_profiles")
        .select("user_id, display_name, bio")
        .eq("user_id", userId)
        .maybeSingle(),
      feedPromise,
      client
        .from("reader_group_members")
        .select("role, joined_at, reader_groups(id, name, description, invite_code, created_by)")
        .eq("user_id", userId),
    ]);

    var profileResult = initial[0];
    var currentFeed = initial[1];
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
    var dashboardResult = { data: [], error: null };
    if (groupIds.length) {
      dashboardResult = await client.rpc("get_reader_group_cycle_summaries", {
        p_group_ids: groupIds,
        p_cycles_per_group: 6,
      });
    }
    var dashboard = dashboardData(dashboardResult);
    if (!dashboardResult.error) {
      await loadExpandedCycleDetails(client, dashboard.cycles);
    }
    var cachedPage = {
      userId: userId,
      profile: profileResult.data || null,
      groups: groups,
      cycles: dashboard.cycles,
      errors: {
        profile: profileResult.error || null,
        groups: memberResult.error || null,
        cycles: dashboardResult.error || null,
      },
    };
    if (!cachedPage.errors.profile && !cachedPage.errors.groups && !cachedPage.errors.cycles) {
      pageCache = cachedPage;
    }
    return pageData(userId, currentFeed, cachedPage);
  }

  async function loadCycleDetails(userId, cycleId) {
    if (!pageCache || pageCache.userId !== userId) await loadPage(userId);
    var cycleExists = pageCache && pageCache.cycles.some(function (cycle) {
      return cycle.id === cycleId;
    });
    if (!cycleExists) return { error: new Error("Este ciclo não está disponível no grupo.") };
    expandedCycles[cycleId] = true;
    if (cycleDetailsById[cycleId]) return { data: cycleDetailsById[cycleId], error: null };
    var result = await readCycleDetails(getClient(), cycleId);
    if (result.error) cycleDetailErrors[cycleId] = result.error;
    return result;
  }

  async function loadMorePosts(userId) {
    var client = getClient();
    var currentFeed = await ensureFeed(client, userId);
    if (currentFeed.postsError) return { error: currentFeed.postsError };
    if (!currentFeed.hasMore || !currentFeed.cursor) return { data: false, error: null };

    var result = await readPostPage(client, currentFeed.cursor, FEED_PAGE_SIZE);
    if (result.error) return { error: result.error };
    currentFeed.posts = currentFeed.posts.concat(result.posts);
    currentFeed.hasMore = result.hasMore;
    currentFeed.cursor = result.cursor;
    currentFeed.statsError = result.statsError || currentFeed.statsError;
    return { data: true, error: null };
  }

  async function loadOlderComments(userId, postId) {
    var client = getClient();
    var currentFeed = await ensureFeed(client, userId);
    var post = currentFeed.posts.find(function (item) { return item.id === postId; });
    if (!post) return { error: new Error("Esta publicação não está carregada.") };

    var comments = post.community_post_comments || [];
    var remaining = Math.max(0, Number(post.comment_count || 0) - comments.length);
    if (!remaining || !comments.length) return { data: false, error: null };

    var oldest = comments[0];
    var query = client
      .from("community_post_comments")
      .select("id, post_id, author_id, body, created_at, reader_profiles(display_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.min(COMMENT_PAGE_SIZE, remaining));
    query = query.or(cursorFilter(oldest));
    var result = await query;
    if (result.error) return { error: result.error };

    var older = rows(result).sort(function (left, right) {
      return -compareCreatedAtAscending(left, right);
    });
    older.reverse();
    post.community_post_comments = older.concat(comments);
    return { data: older.length > 0, error: null };
  }

  async function refreshPost(userId, postId) {
    var client = getClient();
    var currentFeed = await ensureFeed(client, userId);
    var index = currentFeed.posts.findIndex(function (item) { return item.id === postId; });
    if (index < 0) return { error: new Error("Esta publicação não está carregada.") };

    var result = await client
      .from("community_posts")
      .select(
        "id, author_id, body, book_title, book_author, created_at, reader_profiles(display_name), community_post_comments(id, post_id, author_id, body, created_at, reader_profiles(display_name))",
      )
      .eq("id", postId)
      .order("created_at", {
        ascending: false,
        referencedTable: "community_post_comments",
      })
      .limit(COMMENT_PREVIEW_SIZE, { referencedTable: "community_post_comments" })
      .maybeSingle();
    if (result.error || !result.data) return { error: result.error || new Error("A publicação não foi encontrada.") };

    var statsResult = await client.rpc("get_community_post_stats", { p_post_ids: [postId] });
    if (statsResult.error) return { error: statsResult.error };

    var refreshed = result.data;
    applyPostStats([refreshed], statsResult.data);
    var previousComments = currentFeed.posts[index].community_post_comments || [];
    var mergedComments = Object.create(null);
    previousComments.concat(refreshed.community_post_comments).forEach(function (comment) {
      mergedComments[comment.id] = comment;
    });
    refreshed.community_post_comments = Object.keys(mergedComments)
      .map(function (id) { return mergedComments[id]; })
      .sort(compareCreatedAtAscending);
    currentFeed.posts[index] = refreshed;
    return { data: refreshed, error: null };
  }

  function invalidateFeed() {
    feedCache = null;
  }

  function invalidatePage() {
    pageCache = null;
    cycleDetailsById = Object.create(null);
    cycleDetailErrors = Object.create(null);
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
    loadMorePosts: loadMorePosts,
    loadOlderComments: loadOlderComments,
    loadCycleDetails: loadCycleDetails,
    refreshPost: refreshPost,
    invalidateFeed: invalidateFeed,
    invalidatePage: invalidatePage,
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
