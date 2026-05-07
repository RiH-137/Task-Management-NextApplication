const express = require("express");
const { z } = require("zod");
const { clerkClient } = require("@clerk/express");
const { supabase } = require("../db/supabase");
const {
  ensureUserFromClerkUser,
  requireAuth,
  requireProjectRole,
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");

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

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from("project_members")
      .select("role, project:projects (id, name, description, created_at, updated_at)")
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    const projects = (data || [])
      .map((item) => ({
        ...item.project,
        role: item.role,
      }))
      .filter((project) => Boolean(project?.id));

    res.json({ data: projects });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = createProjectSchema.parse(req.body);
    const now = new Date().toISOString();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        created_by: req.user.id,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const { error: memberError } = await supabase.from("project_members").insert({
      project_id: project.id,
      user_id: req.user.id,
      role: "admin",
    });

    if (memberError) {
      throw memberError;
    }

    res.status(201).json({ data: { ...project, role: "admin" } });
  })
);

router.get(
  "/:projectId",
  requireAuth,
  requireProjectRole(),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) {
      throw projectError;
    }

    const { data: members, error: memberError } = await supabase
      .from("project_members")
      .select("id, role, joined_at, user:users (id, name, email, avatar_url, clerk_id)")
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (memberError) {
      throw memberError;
    }

    res.json({ data: { project, members } });
  })
);

router.patch(
  "/:projectId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = updateProjectSchema.parse(req.body);
    const { projectId } = req.params;

    const { data: project, error } = await supabase
      .from("projects")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select("*")
      .single();

    if (error) {
      throw error;
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

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);

router.get(
  "/:projectId/members",
  requireAuth,
  requireProjectRole(),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const { data: members, error } = await supabase
      .from("project_members")
      .select("id, role, joined_at, user:users (id, name, email, avatar_url, clerk_id)")
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ data: members });
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

    const { data: existing, error: existingError } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return res.status(409).json({ error: "User is already a member" });
    }

    const { data: member, error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: payload.role || "member",
      })
      .select("id, role, joined_at, user:users (id, name, email, avatar_url, clerk_id)")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ data: member });
  })
);

router.patch(
  "/:projectId/members/:memberId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const payload = updateMemberSchema.parse(req.body);

    const { data: member, error } = await supabase
      .from("project_members")
      .update({ role: payload.role })
      .eq("id", memberId)
      .select("id, role, joined_at, user:users (id, name, email, avatar_url, clerk_id)")
      .single();

    if (error) {
      throw error;
    }

    res.json({ data: member });
  })
);

router.delete(
  "/:projectId/members/:memberId",
  requireAuth,
  requireProjectRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);

module.exports = { projectsRouter: router };
