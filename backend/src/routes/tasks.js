const express = require("express");
const { z } = require("zod");
const { supabase } = require("../db/supabase");
const { requireAuth, getProjectMembership } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

const statusValues = ["todo", "in_progress", "blocked", "done"];
const priorityValues = ["low", "medium", "high"];

const taskCreateSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD")
    .optional()
    .nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(statusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD")
    .optional()
    .nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

router.get(
  "/projects/:projectId/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const membership = await getProjectMembership(projectId, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ data: tasks });
  })
);

router.post(
  "/projects/:projectId/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const payload = taskCreateSchema.parse(req.body);

    const membership = await getProjectMembership(projectId, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      membership.role !== "admin" &&
      payload.assignedTo &&
      payload.assignedTo !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "Members can only assign tasks to themselves" });
    }

    if (payload.assignedTo) {
      const { data: assignedMember, error: assignedError } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", payload.assignedTo)
        .maybeSingle();

      if (assignedError) {
        throw assignedError;
      }

      if (!assignedMember) {
        return res.status(400).json({ error: "Assignee is not a project member" });
      }
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status || "todo",
        priority: payload.priority || "medium",
        due_date: payload.dueDate ?? null,
        assigned_to: payload.assignedTo ?? null,
        created_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ data: task });
  })
);

router.patch(
  "/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = taskUpdateSchema.parse(req.body);

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      throw taskError;
    }

    const membership = await getProjectMembership(task.project_id, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (membership.role !== "admin") {
      if (task.assigned_to !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Members can only update their own tasks" });
      }

      const allowedFields = ["status"];
      const requestedFields = Object.keys(payload);
      const invalidFields = requestedFields.filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        return res.status(403).json({
          error: "Members can only update task status",
        });
      }
    }

    if (payload.assignedTo) {
      const { data: assignedMember, error: assignedError } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", task.project_id)
        .eq("user_id", payload.assignedTo)
        .maybeSingle();

      if (assignedError) {
        throw assignedError;
      }

      if (!assignedMember) {
        return res.status(400).json({ error: "Assignee is not a project member" });
      }
    }

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) {
      updatePayload.description = payload.description;
    }
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.priority !== undefined) updatePayload.priority = payload.priority;
    if (payload.dueDate !== undefined) updatePayload.due_date = payload.dueDate;
    if (payload.assignedTo !== undefined) {
      updatePayload.assigned_to = payload.assignedTo;
    }

    const { data: updated, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.json({ data: updated });
  })
);

router.delete(
  "/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .single();

    if (taskError) {
      throw taskError;
    }

    const membership = await getProjectMembership(task.project_id, req.user.id);
    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);

module.exports = { tasksRouter: router };
