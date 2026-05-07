const express = require("express");
const { projectsRouter } = require("./projects");
const { tasksRouter } = require("./tasks");
const { dashboardRouter } = require("./dashboard");
const { usersRouter } = require("./users");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/projects", projectsRouter);
router.use("/", tasksRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", usersRouter);

module.exports = { apiRouter: router };
