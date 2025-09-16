import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { findAdminByEmail, createAdmin } from "../models/adminModel.js";
import { findUserByEmail, createUser } from "../models/userModel.js";
import { blacklistToken } from "../models/tokenModel.js";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
}

// admin reg
export async function adminRegister(req, res) {
  try {
    const { name, email, password, role, panel_id } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const existing = await findAdminByEmail(email);
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await createAdmin({ name, email, password_hash: hash, role, panel_id });
    return res.status(201).json({ message: "Admin created", admin: { admin_id: admin.admin_id, email: admin.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// admin login
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const admin = await findAdminByEmail(email);
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const matched = await bcrypt.compare(password, admin.password_hash);
    if (!matched) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken({ id: admin.admin_id, email: admin.email, role: admin.role });
    return res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// IMP - add pwd hash functionality here, and in schema
export async function userSignup(req, res) {
  try {
    const { name, email, team_id, is_leader, extra_info } = req.body;
    if (!email || !name) return res.status(400).json({ message: "Name and email required" });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const user = await createUser({ name, email, team_id: team_id || null, is_leader: !!is_leader, extra_info: extra_info || null });
    return res.status(201).json({ message: "User created", user: { user_id: user.user_id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// toekn blacklist
export async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];

    await blacklistToken(token);
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
