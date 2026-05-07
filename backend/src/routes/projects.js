const express = require("express");
const { z } = require("zod");
const { clerkClient } = require("@clerk/express");
const { Project, ProjectMember, Task } = require("../models");
const {
  ensureUserFromClerkUser,
  requireAuth,
  requireProjectRole,
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");
const { isValidObjectId } = require("../utils/ids");

const router = express.Router();

const createProjectSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
});

const addMemberSchema = z
  .object({
    clerkUserId: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(["admin", "member"]).optional(),
  })
  .refine((values) => values.clerkUserId || values.email, {
    message: "clerkUserId or email is required",
  });

const updateMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

const formatMember = (member) => {
  const user = member.user_id;
  const userPayload = user && typeof user.toJSON === "function" ? user.toJSON() : user;

  return {
    id: member.id,
    role: member.role,
    joined_at: member.joined_at,
    user: userPayload || null,
  };
};

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const memberships = await ProjectMember.find({ user_id: req.user.id })
      .populate("project_id", "name description created_at updated_at")
      .sort({ joined_at: 1 });

    const projects = memberships
      .map((membership) => {
        if (!membership.project_id) {
          return null;
        }
        const project =
          typeof membership.project_id.toJSON === "function"
            ? membership.project_id.toJSON()
            : membership.project_id;
        return {
          ...project,
          role: membership.role,
        };
      })
      .filter(Boolean);

    res.json({ data: projects });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = createProjectSchema.parse(req.body);

    const project = await Project.create({
      name: payload.name,
      description: payload.description ?? null,
      created_by: req.user.id,
      updated_at: new Date(),
    });

    await ProjectMember.create({
      project_id: project.id,
      user_id: req.user.id,
      role: "admin",
    });

    res.status(201).json({ data: { ...project.toJSON(), role: "admin" } });
  })
);

router.get(
  "/:projectId",
  requireAuth,
  requireProjectRole(),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const members = await ProjectMember.find({ project_id: projectId })
      .populate("user_id", "name email avatar_url clerk_id")
      .sort({ joined_at: 1 });

    res.json({
      data: {
        project: project.toJSON(),
        members: members.map(formatMember),
      },
    });
  })
);

router.patch(
  "/:projectId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = updateProjectSchema.parse(req.body);
    const { projectId } = req.params;

    const updatePayload = {
      updated_at: new Date(),
    };

    if (payload.name !== undefined) {
      updatePayload.name = payload.name;
    }

    if (payload.description !== undefined) {
      updatePayload.description = payload.description ?? null;
    }

    const project = await Project.findByIdAndUpdate(projectId, updatePayload, {
      new: true,
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ data: project });
  })
);

router.delete(
  "/:projectId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    await Project.findByIdAndDelete(projectId);
    await Promise.all([
      ProjectMember.deleteMany({ project_id: projectId }),
      Task.deleteMany({ project_id: projectId }),
    ]);

    res.status(204).send();
  })
);

router.get(
  "/:projectId/members",
  requireAuth,
  requireProjectRole(),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const members = await ProjectMember.find({ project_id: projectId })
      .populate("user_id", "name email avatar_url clerk_id")
      .sort({ joined_at: 1 });

    res.json({ data: members.map(formatMember) });
  })
);

router.post(
  "/:projectId/members",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const payload = addMemberSchema.parse(req.body);

    let clerkUser = null;

    if (payload.clerkUserId) {
      clerkUser = await clerkClient.users.getUser(payload.clerkUserId);
    } else if (payload.email) {
      const result = await clerkClient.users.getUserList({
        emailAddress: [payload.email],
      });
      clerkUser = result.data[0] || null;
    }

    if (!clerkUser) {
      return res.status(404).json({ error: "No Clerk user found" });
    }

    const user = await ensureUserFromClerkUser(clerkUser);

    const existing = await ProjectMember.findOne({
      project_id: projectId,
      user_id: user.id,
    });

    if (existing) {
      return res.status(409).json({ error: "User is already a member" });
    }

    const member = await ProjectMember.create({
      project_id: projectId,
      user_id: user.id,
      role: payload.role || "member",
    });

    await member.populate("user_id", "name email avatar_url clerk_id");

    res.status(201).json({ data: formatMember(member) });
  })
);

router.patch(
  "/:projectId/members/:memberId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { projectId, memberId } = req.params;
    const payload = updateMemberSchema.parse(req.body);

    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const member = await ProjectMember.findOneAndUpdate(
      { _id: memberId, project_id: projectId },
      { role: payload.role },
      { new: true }
    ).populate("user_id", "name email avatar_url clerk_id");

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({ data: formatMember(member) });
  })
);

router.delete(
  "/:projectId/members/:memberId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { projectId, memberId } = req.params;

    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    await ProjectMember.findOneAndDelete({ _id: memberId, project_id: projectId });

    res.status(204).send();
  })
);

module.exports = { projectsRouter: router };
