// src/routes/auth.js
import express from "express";
import { adminRegister, adminLogin, userSignup, logout } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin registration (use with care — in production verifyToken this endpoint or run migration seeder)
router.post("/admin/register", adminRegister);

// Admin login
router.post("/admin/login", adminLogin);

// User signup (no password by default)
router.post("/user/signup", userSignup);

// Logout (blacklist token)
router.post("/logout", verifyToken, logout);

export default router;
