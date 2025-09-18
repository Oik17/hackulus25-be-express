import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Joi from "joi";

import adminRoutes from "../routes/admin.js";
import authRoutes from "../routes/auth.js";
import userRoutes from "../routes/users.js"; // added user routes

dotenv.config();

const app = express();

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

// helper Joi middleware
export function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });
    next();
  };
}

// root
app.get("/", (req, res) => {
  res.json({ message: "hackulus backend running" });
});

// routes
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

export default app;
