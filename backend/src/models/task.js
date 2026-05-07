const mongoose = require("mongoose");

const statusValues = ["todo", "in_progress", "blocked", "done"];
const priorityValues = ["low", "medium", "high"];

const taskSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, minlength: 2, maxlength: 120 },
    description: { type: String, default: null, maxlength: 1000 },
    status: { type: String, enum: statusValues, default: "todo" },
    priority: { type: String, enum: priorityValues, default: "medium" },
    due_date: { type: Date, default: null },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

taskSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    if (ret.due_date) {
      const date = ret.due_date instanceof Date ? ret.due_date : new Date(ret.due_date);
      if (!Number.isNaN(date.valueOf())) {
        ret.due_date = date.toISOString().slice(0, 10);
      }
    }
    return ret;
  },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = { Task, statusValues, priorityValues };
