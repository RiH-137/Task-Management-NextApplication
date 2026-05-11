const express = require("express");
const mongoose = require("mongoose");
const { Task, User } = require("../models");
const { requireAuth, getProjectMembership } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");
const { isValidObjectId } = require("../utils/ids");

const router = express.Router();

const normalizeStatus = (value) => (value === "blocked" ? "in_progress" : value);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;

    let membership = null;
    let isAdmin = false;
    const taskQuery = {};

    if (projectId) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ error: "Invalid project id" });
      }

      membership = await getProjectMembership(projectId, req.user.id);
      if (!membership) {
        return res.status(403).json({ error: "Forbidden" });
      }

      isAdmin = membership.role === "admin";
      taskQuery.project_id = projectId;

      if (!isAdmin) {
        taskQuery.assigned_to = req.user.id;
      }
    } else {
      taskQuery.assigned_to = req.user.id;
    }

    const tasks = await Task.find(taskQuery).select(
      "status due_date assigned_to"
    );

    const statusCounts = {
      todo: 0,
      in_progress: 0,
      done: 0,
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    let overdue = 0;

    tasks.forEach((task) => {
      const status = normalizeStatus(task.status);
      if (status in statusCounts) {
        statusCounts[status] += 1;
      }

      if (task.due_date) {
        const dueKey = task.due_date.toISOString().slice(0, 10);
        if (dueKey < todayKey && status !== "done") {
          overdue += 1;
        }
      }
    });

    let tasksPerUser = [];

    if (projectId) {
      if (isAdmin) {
        const counts = await Task.aggregate([
          {
            $match: {
              project_id: new mongoose.Types.ObjectId(projectId),
              assigned_to: { $ne: null },
            },
          },
          {
            $group: {
              _id: "$assigned_to",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]);

        const userIds = counts.map((row) => row._id).filter(Boolean);
        const users = userIds.length
          ? await User.find({ _id: { $in: userIds } }).select(
              "name email avatar_url"
            )
          : [];

        const userLookup = new Map(
          users.map((user) => [user.id, user.toJSON()])
        );

        tasksPerUser = counts
          .map((row) => {
            const userId = row._id?.toString();
            return {
              user: userLookup.get(userId) || { id: userId },
              total: row.total,
            };
          })
          .filter((entry) => entry.user && entry.user.id);
      } else {
        const userPayload =
          req.user && typeof req.user.toJSON === "function"
            ? req.user.toJSON()
            : req.user;
        tasksPerUser = tasks.length > 0 ? [{ user: userPayload, total: tasks.length }] : [];
      }
    }

    res.json({
      data: {
        total: tasks.length,
        status: statusCounts,
        overdue,
        tasks_per_user: tasksPerUser,
      },
    });
  })
);

module.exports = { dashboardRouter: router };
