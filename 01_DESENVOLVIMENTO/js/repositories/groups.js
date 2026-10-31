(function () {
  "use strict";

  function getClient() {
    if (!window.desvelarSupabase) {
      throw new Error("O serviço de grupos não está disponível.");
    }

    return window.desvelarSupabase;
  }

  async function loadHomeGoals(userId, limit) {
    var client = getClient();
    var maxGoals = Number.isInteger(limit) && limit > 0 ? limit : 4;
    var results = await Promise.all([
      client
        .from("group_members")
        .select("groups(id, name)")
        .eq("user_id", userId),
      client
        .from("shared_goals")
        .select("id, group_id, title, description, completed, created_at")
        .order("created_at", { ascending: false })
        .limit(maxGoals),
    ]);

    return {
      groups: results[0].data || [],
      goals: results[1].data || [],
      error: results[0].error || results[1].error || null,
    };
  }

  async function loadGroupsPage(userId) {
    var client = getClient();
    var groupsResult = await client
      .from("group_members")
      .select("groups(id, name, invite_code)")
      .eq("user_id", userId);

    if (groupsResult.error) {
      return { error: groupsResult.error, groups: [], goals: [], goalsError: null };
    }

    var goalsResult = await client
      .from("shared_goals")
      .select("id, group_id, title, description, created_at, completed")
      .order("created_at", { ascending: false });

    return {
      error: null,
      groups: (groupsResult.data || [])
        .map(function (item) {
          return item.groups;
        })
        .filter(Boolean),
      goals: goalsResult.data || [],
      goalsError: goalsResult.error || null,
    };
  }

  function createGroup(name) {
    return getClient().rpc("create_group_with_owner", {
      p_name: String(name || "").trim(),
    });
  }

  function joinGroup(inviteCode) {
    return getClient().rpc("join_group_by_invite", {
      p_invite_code: String(inviteCode || "").trim(),
    });
  }

  function createSharedGoal(goal) {
    return getClient()
      .from("shared_goals")
      .insert({
        group_id: goal.groupId,
        title: String(goal.title || "").trim(),
        description: String(goal.description || "").trim(),
        created_by: goal.userId,
      });
  }

  window.DesvelarGroupRepository = Object.freeze({
    loadHomeGoals: loadHomeGoals,
    loadGroupsPage: loadGroupsPage,
    createGroup: createGroup,
    joinGroup: joinGroup,
    createSharedGoal: createSharedGoal,
  });
})();
