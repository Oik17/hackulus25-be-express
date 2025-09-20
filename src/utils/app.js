import "../../instrument.js";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import adminRoutes from "../routes/admin.js";
import authRoutes from "../routes/auth.js";
import userRoutes from "../routes/users.js";
import * as Sentry from "@sentry/node";
import { query } from "./db.js";

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
  tracesSampleRate: 1.0,
});

export const app = express();

app.use(helmet());
app.use(compression());

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// uploads folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadPath = path.join(__dirname, "..", "..", uploadDir);

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`Created uploads folder at: ${uploadPath}`);
}

app.use("/uploads", express.static(uploadPath));

// root
app.get("/", (_req, res) => {
  res.json({ message: "hackulus backend running" });
});


// test sentry
app.get("/debug-sentry", function mainHandler(_req, _res) {
  throw new Error("My first Sentry error!");
});

// routes
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// cron github actions
app.get("/run-job", async (_req, res) => {
  try {
    console.log("GitHub Actions triggered this job");

    await query("SELECT 1");

    res.status(200).json({ success: true, message: "Executed" });
  } catch (err) {
    console.error("Job failed:", err);
    res.status(500).json({ success: false, message: "Failed" });
  }
});

// sentry error handler
app.use(Sentry.expressErrorHandler());

// custom error handler
app.use(function onError(err, _req, res, _next) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

export default app;
