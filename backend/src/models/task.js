const mongoose = require("mongoose");

const statusValues = ["todo", "in_progress", "done"];
const priorityValues = ["low", "medium", "high"];

const commentSchema = new mongoose.Schema(
  {
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    author_name: { type: String, required: true, maxlength: 120 },
    author_avatar: { type: String, default: null },
    message: { type: String, required: true, maxlength: 500 },
    created_at: { type: Date, default: Date.now },
  },
  {
    _id: true,
  }
);

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
    comments: { type: [commentSchema], default: [] },
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
    if (ret.status === "blocked") {
      ret.status = "in_progress";
    }
    if (ret.due_date) {
      const date = ret.due_date instanceof Date ? ret.due_date : new Date(ret.due_date);
      if (!Number.isNaN(date.valueOf())) {
        ret.due_date = date.toISOString().slice(0, 10);
      }
    }
    if (Array.isArray(ret.comments)) {
      ret.comments = ret.comments.map((comment) => {
        const next = { ...comment };
        if (comment._id) {
          next.id = comment._id.toString();
          delete next._id;
        }
        if (comment.created_at) {
          const created =
            comment.created_at instanceof Date
              ? comment.created_at
              : new Date(comment.created_at);
          if (!Number.isNaN(created.valueOf())) {
            next.created_at = created.toISOString();
          }
        }
        return next;
      });
    }
    return ret;
  },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = { Task, statusValues, priorityValues };
