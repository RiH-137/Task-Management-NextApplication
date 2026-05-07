const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    clerk_id: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    name: { type: String, required: true },
    avatar_url: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

userSchema.set("toJSON", {
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

const User = mongoose.model("User", userSchema);

module.exports = { User };
