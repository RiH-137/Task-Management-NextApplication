const express = require("express");
const { Task } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ assigned_to: req.user.id }).select(
      "status due_date"
    );

    const statusCounts = {
      todo: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    let overdue = 0;

    tasks.forEach((task) => {
      if (task.status in statusCounts) {
        statusCounts[task.status] += 1;
      }

      if (task.due_date) {
        const dueKey = task.due_date.toISOString().slice(0, 10);
        if (dueKey < todayKey && task.status !== "done") {
          overdue += 1;
        }
      }
    });

    res.json({
      data: {
        total: tasks.length,
        status: statusCounts,
        overdue,
      },
    });
  })
);

module.exports = { dashboardRouter: router };
