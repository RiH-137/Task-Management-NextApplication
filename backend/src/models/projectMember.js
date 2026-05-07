const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joined_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

projectMemberSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    return ret;
  },
});

const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);

module.exports = { ProjectMember };
