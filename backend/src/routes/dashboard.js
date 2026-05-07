const express = require("express");
const { supabase } = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, status, due_date")
      .eq("assigned_to", req.user.id);

    if (error) {
      throw error;
    }

    const statusCounts = {
      todo: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
    };

    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0;

    (tasks || []).forEach((task) => {
      if (task.status in statusCounts) {
        statusCounts[task.status] += 1;
      }
      if (task.due_date && task.due_date < today && task.status !== "done") {
        overdue += 1;
      }
    });

    res.json({
      data: {
        total: tasks?.length || 0,
        status: statusCounts,
        overdue,
      },
    });
  })
);

module.exports = { dashboardRouter: router };
