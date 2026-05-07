const { clerkClient } = require("@clerk/express");
const { supabase } = require("../db/supabase");

const buildUserPayload = (clerkUser) => {
  const email = clerkUser.primaryEmailAddress?.emailAddress || null;
  const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);
  const name = nameParts.join(" ").trim();
  const fallbackName = clerkUser.username || (email ? email.split("@")[0] : "User");

  return {
    clerk_id: clerkUser.id,
    email,
    name: name || fallbackName,
    avatar_url: clerkUser.imageUrl || null,
  };
};

const ensureUserFromClerkUser = async (clerkUser) => {
  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUser.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  const payload = buildUserPayload(clerkUser);
  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert(payload)
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
};

const ensureUserByClerkId = async (clerkUserId) => {
  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  return ensureUserFromClerkUser(clerkUser);
};

const requireAuth = async (req, res, next) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await ensureUserByClerkId(req.auth.userId);
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const getProjectMembership = async (projectId, userId) => {
  const { data, error } = await supabase
    .from("project_members")
    .select("id, role, project_id, user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const requireProjectRole = (allowedRoles = ["admin", "member"]) => async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: "Project id required" });
  }

  try {
    const membership = await getProjectMembership(projectId, req.user.id);

    if (!membership || !allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.membership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  buildUserPayload,
  ensureUserByClerkId,
  ensureUserFromClerkUser,
  getProjectMembership,
  requireAuth,
  requireProjectRole,
};
