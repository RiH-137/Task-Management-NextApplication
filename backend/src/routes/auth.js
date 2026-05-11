const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { signUserToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const toUserPayload = (user) => {
  const payload = user && typeof user.toJSON === "function" ? user.toJSON() : user;

  if (payload && payload.password_hash) {
    delete payload.password_hash;
  }

  return payload;
};

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: payload.email });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await User.create({
      name: payload.name.trim(),
      email: payload.email,
      password_hash: passwordHash,
    });

    const token = signUserToken(user);

    return res.status(201).json({
      data: {
        token,
        user: toUserPayload(user),
      },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(payload.password, user.password_hash || "");
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signUserToken(user);

    return res.json({
      data: {
        token,
        user: toUserPayload(user),
      },
    });
  })
);

module.exports = { authRouter: router };
