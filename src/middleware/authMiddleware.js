import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../utils/db.js";
import Joi from "joi";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// schema for auth header
const authHeaderSchema = Joi.string()
  .pattern(/^Bearer\s+\S+$/)
  .required()
  .messages({
    "string.pattern.base": "Authorization header must be in format: Bearer <token>",
    "any.required": "Authorization header is required",
  });

// schema for team_id validation
const teamIdSchema = Joi.number()
  .integer()
  .positive()
  .required()
  .messages({
    "number.base": "team_id must be a number",
    "number.integer": "team_id must be an integer",
    "number.positive": "team_id must be positive",
    "any.required": "team_id is required",
  });

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;

  const { error } = authHeaderSchema.validate(header);
  if (error) {
    return res.status(401).json({ error: error.details[0].message });
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

/*
  Check if currently authed admin can access a team.
  - superadmin: always allowed
  - judge/admin: only if team.panel_id === admin.panel_id
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

    const { error } = teamIdSchema.validate(teamId);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

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
