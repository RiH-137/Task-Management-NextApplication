const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
const envCandidates = [
  path.resolve(process.cwd(), envFile),
  path.resolve(__dirname, "..", envFile),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(process.cwd(), "frontend", envFile),
  path.resolve(__dirname, "..", "..", "frontend", envFile),
  path.resolve(process.cwd(), "frontend", ".env"),
  path.resolve(__dirname, "..", "..", "frontend", ".env"),
];

const loadedEnvPaths = new Set();
envCandidates.forEach((candidate) => {
  if (fs.existsSync(candidate) && !loadedEnvPaths.has(candidate)) {
    dotenv.config({ path: candidate, override: false });
    loadedEnvPaths.add(candidate);
  }
});

if (loadedEnvPaths.size === 0) {
  dotenv.config();
}

if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { clerkMiddleware } = require("@clerk/express");
const { apiRouter } = require("./routes");
const { connectToDatabase } = require("./db/mongo");

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const defaultPort = Number(process.env.PORT) || 4000;
const maxPortRetries = 5;

const startServer = async (port, retriesLeft) => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`API listening on ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, trying ${nextPort}...`);
      server.close(() => {
        startServer(nextPort, retriesLeft - 1);
      });
      return;
    }

    console.error("Failed to start server", error);
    process.exit(1);
  });
};

startServer(defaultPort, maxPortRetries);
