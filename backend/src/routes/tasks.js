const express = require("express");
const { z } = require("zod");
const { Task, ProjectMember } = require("../models");
const { requireAuth, getProjectMembership } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");
const { isValidObjectId } = require("../utils/ids");

const router = express.Router();

const statusValues = ["todo", "in_progress", "blocked", "done"];
const priorityValues = ["low", "medium", "high"];
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "must be a valid ObjectId");

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
  assignedTo: objectIdSchema.optional().nullable(),
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
  assignedTo: objectIdSchema.optional().nullable(),
});

const commentCreateSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00.000Z`);
};

router.get(
  "/projects/:projectId/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const membership = await getProjectMembership(projectId, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const tasks = await Task.find({ project_id: projectId }).sort({ created_at: -1 });

    res.json({ data: tasks });
  })
);

router.post(
  "/projects/:projectId/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const payload = taskCreateSchema.parse(req.body);

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

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
      if (!isValidObjectId(payload.assignedTo)) {
        return res.status(400).json({ error: "Invalid assignee id" });
      }

      const assignedMember = await ProjectMember.findOne({
        project_id: projectId,
        user_id: payload.assignedTo,
      });

      if (!assignedMember) {
        return res.status(400).json({ error: "Assignee is not a project member" });
      }
    }

    const task = await Task.create({
      project_id: projectId,
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status || "todo",
      priority: payload.priority || "medium",
      due_date: toDateOrNull(payload.dueDate),
      assigned_to: payload.assignedTo ?? null,
      created_by: req.user.id,
      updated_at: new Date(),
    });

    res.status(201).json({ data: task });
  })
);

router.patch(
  "/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = taskUpdateSchema.parse(req.body);

    if (!isValidObjectId(taskId)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const membership = await getProjectMembership(task.project_id, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (membership.role !== "admin") {
      if (task.assigned_to?.toString() !== req.user.id) {
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
      if (!isValidObjectId(payload.assignedTo)) {
        return res.status(400).json({ error: "Invalid assignee id" });
      }

      const assignedMember = await ProjectMember.findOne({
        project_id: task.project_id,
        user_id: payload.assignedTo,
      });

      if (!assignedMember) {
        return res.status(400).json({ error: "Assignee is not a project member" });
      }
    }

    const updatePayload = {
      updated_at: new Date(),
    };

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) {
      updatePayload.description = payload.description;
    }
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.priority !== undefined) updatePayload.priority = payload.priority;
    if (payload.dueDate !== undefined) {
      updatePayload.due_date = payload.dueDate
        ? toDateOrNull(payload.dueDate)
        : null;
    }
    if (payload.assignedTo !== undefined) {
      updatePayload.assigned_to = payload.assignedTo ?? null;
    }

    const updated = await Task.findByIdAndUpdate(taskId, updatePayload, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ data: updated });
  })
);

router.post(
  "/tasks/:taskId/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = commentCreateSchema.parse(req.body);

    if (!isValidObjectId(taskId)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await Task.findById(taskId).select("id project_id");
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const membership = await getProjectMembership(task.project_id, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const commentPayload = {
      author_id: req.user.id,
      author_name: req.user.name,
      author_avatar: req.user.avatar_url || null,
      message: payload.message,
      created_at: new Date(),
    };

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        $push: { comments: commentPayload },
        updated_at: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(201).json({ data: updated });
  })
);

router.delete(
  "/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    if (!isValidObjectId(taskId)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await Task.findById(taskId).select("id project_id");
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const membership = await getProjectMembership(task.project_id, req.user.id);
    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Task.findByIdAndDelete(taskId);

    res.status(204).send();
  })
);

module.exports = { tasksRouter: router };
