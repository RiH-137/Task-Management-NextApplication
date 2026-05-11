const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },
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
    if (ret.password_hash) {
      delete ret.password_hash;
    }
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = { User };
