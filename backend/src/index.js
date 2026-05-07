const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
const envCandidates = [
  path.resolve(process.cwd(), envFile),
  path.resolve(__dirname, "..", envFile),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "..", ".env"),
];

const resolvedEnvPath = envCandidates.find((candidate) => fs.existsSync(candidate));

if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath });
} else {
  dotenv.config();
}

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { clerkMiddleware } = require("@clerk/express");
const { apiRouter } = require("./routes");

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
