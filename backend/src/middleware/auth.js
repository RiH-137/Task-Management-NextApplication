const { clerkClient } = require("@clerk/express");
const { User, ProjectMember } = require("../models");
const { isValidObjectId } = require("../utils/ids");

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
  const existing = await User.findOne({ clerk_id: clerkUser.id });

  if (existing) {
    return existing;
  }

  const payload = buildUserPayload(clerkUser);
  const created = await User.create(payload);
  return created;
};

const ensureUserByClerkId = async (clerkUserId) => {
  const existing = await User.findOne({ clerk_id: clerkUserId });

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
  if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
    return null;
  }

  const membership = await ProjectMember.findOne({
    project_id: projectId,
    user_id: userId,
  });

  return membership || null;
};

const requireProjectRole = (allowedRoles = ["admin", "member"]) => async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: "Project id required" });
  }

  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid project id" });
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
