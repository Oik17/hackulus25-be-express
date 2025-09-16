import express from "express";
import { adminRegister, adminLogin, userSignup, userLogin, logout } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/admin/register", adminRegister);
router.post("/admin/login", adminLogin);

router.post("/user/signup", userSignup);
router.post("/user/login", userLogin);

router.post("/logout", verifyToken, logout);

export default router;
