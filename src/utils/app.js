// src/utils/app.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import adminRoutes from "../routes/admin.js";
import authRoutes from "../routes/auth.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle uploads folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadPath = path.join(__dirname, "..", "..", uploadDir);

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`Created uploads folder at: ${uploadPath}`);
}

app.use("/uploads", express.static(uploadPath));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "hackulus backend running" });
});

app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);


export default app;
