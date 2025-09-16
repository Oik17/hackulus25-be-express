import express from "express";
import { adminRegister, adminLogin, userSignup, logout } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// admin reg (IMP - verifyToken this endpoint or run migration seeder)
router.post("/admin/register", adminRegister);

router.post("/admin/login", adminLogin);

// user signup (IMP - pwd hash add)
router.post("/user/signup", userSignup);

// blacklist token
router.post("/logout", verifyToken, logout);

export default router;
