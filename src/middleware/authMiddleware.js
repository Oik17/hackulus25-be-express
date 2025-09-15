// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../utils/db.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid auth header" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // includes user_id or admin_id and role
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const role = req.user.role;
  if (!role || !["judge", "superadmin", "admin"].includes(role)) {
    return res.status(403).json({ error: "Forbidden - admin only" });
  }
  return next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const role = req.user.role;
  if (role !== "superadmin") {
    return res.status(403).json({ error: "Forbidden - superadmin only" });
  }
  return next();
}

/**
 * Check if currently authed admin can access a team.
 * - Superadmin: always allowed
 * - Judge/Admin: only if team.panel_id === admin.panel_id
 */
export async function adminCanAccessTeam(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (req.user.role === "superadmin") return next();

    const adminPanelId = req.user.panel_id;
    if (!adminPanelId)
      return res
        .status(403)
        .json({ error: "Admin token missing panel_id" });

    const teamId = req.params.id || req.body.team_id || req.query.team_id;
    if (!teamId) return res.status(400).json({ error: "team id required" });

    const result = await db.query(
      "SELECT panel_id FROM teams WHERE team_id=$1",
      [teamId]
    );
    const teamRow = result.rows[0];

    if (!teamRow) return res.status(404).json({ error: "team not found" });

    if (teamRow.panel_id === null) {
      return res
        .status(403)
        .json({ error: "Team not yet assigned to panel" });
    }

    if (teamRow.panel_id !== adminPanelId) {
      return res.status(403).json({ error: "Forbidden - not your panel" });
    }

    return next();
  } catch (err) {
    console.error("adminCanAccessTeam error", err);
    return res.status(500).json({ error: "server error" });
  }
}
