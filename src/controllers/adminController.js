import db from "../utils/db.js";
import * as scheduler from "../utils/scheduler.js";
import {
  listWindows,
  upsertWindow,
  getWindowByName,
} from "../models/submissionWindowModel.js";
import Joi from "joi";

async function getMembers(team_id) {
  const r = await db.query(
    "SELECT user_id AS member_id, name, email, is_leader, extra_info, created_at FROM users WHERE team_id=$1 ORDER BY user_id",
    [team_id]
  );
  return r.rows;
}

// GET /admin/panels
export const listPanels = async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM panels ORDER BY panel_id");
    res.json({ panels: r.rows });
  } catch (err) {
    console.error("listPanels err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/panel/:id/teams
export const getPanelTeams = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const panelId = req.params.id;
    const teams = (
      await db.query(
        "SELECT * FROM teams WHERE panel_id=$1 ORDER BY created_at DESC",
        [panelId]
      )
    ).rows;
    res.json({ teams });
  } catch (err) {
    console.error("getPanelTeams err", err);
    res.status(500).json({ error: "server error" });
  }
};

// POST /admin/panel/assign (superadmin only)
export const assignPanelManual = async (req, res) => {
  try {
    const bodySchema = Joi.object({
      team_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
      panel_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const { error: bodyErr } = bodySchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (bodyErr)
      return res
        .status(400)
        .json({ error: bodyErr.details.map((d) => d.message).join(", ") });

    const { team_id, panel_id } = req.body;
    if (!team_id || !panel_id) {
      return res.status(400).json({ error: "team_id and panel_id required" });
    }

    const r = await db.query(
      "UPDATE teams SET panel_id=$1 WHERE team_id=$2 RETURNING *",
      [panel_id, team_id]
    );
    if (!r.rows.length)
      return res.status(404).json({ error: "team not found" });

    res.json({ ok: true, team: r.rows[0] });
  } catch (err) {
    console.error("assignPanelManual err", err);
    res.status(500).json({ error: "server error" });
  }
};

// POST /admin/assign-panels
export const runAutoPanelAssignment = async (req, res) => {
  try {
    const panelsRes = await db.query(
      "SELECT panel_id, name, track_id FROM panels ORDER BY panel_id"
    );
    const panels = panelsRes.rows;
    if (!panels.length)
      return res.status(400).json({ error: "no panels defined" });

    const teamsRes = await db.query(
      "SELECT team_id, track_id FROM teams ORDER BY created_at ASC"
    );
    const teams = teamsRes.rows;

    const assignments = scheduler.assignPanelsToTeams(panels, teams);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      for (const { team_id, panel_id } of assignments) {
        await client.query("UPDATE teams SET panel_id=$1 WHERE team_id=$2", [
          panel_id,
          team_id,
        ]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    res.json({ assigned: assignments.length, assignments });
  } catch (err) {
    console.error("runAutoPanelAssignment err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/teams
export const listTeams = async (req, res) => {
  try {
    const querySchema = Joi.object({
      track_id: Joi.string().pattern(/^\d+$/).optional(),
      panel_id: Joi.string().pattern(/^\d+$/).optional(),
      status: Joi.string().optional(),
    });
    const { error: queryErr } = querySchema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (queryErr)
      return res
        .status(400)
        .json({ error: queryErr.details.map((d) => d.message).join(", ") });

    const { track_id, panel_id, status } = req.query;
    const conditions = [];
    const params = [];
    if (track_id) {
      params.push(track_id);
      conditions.push(`track_id = $${params.length}`);
    }
    if (panel_id) {
      params.push(panel_id);
      conditions.push(`panel_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const q = `
     SELECT 
       t.*, 
       tr.name as track_name,
       (SELECT json_agg(u) FROM 
         (SELECT user_id, name, email, is_leader FROM users WHERE team_id = t.team_id) u
       ) as members
     FROM teams t
     LEFT JOIN tracks tr ON t.track_id = tr.track_id
     ${where} 
     ORDER BY t.created_at DESC
   `;
    const r = await db.query(q, params);
    res.json({ teams: r.rows });

    res.json({ teams: out });
  } catch (err) {
    console.error("listTeams err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/team/:id
export const getTeamDetail = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const teamId = req.params.id;
    const team = (
      await db.query(
        `SELECT t.*, tr.name as track_name 
        FROM teams t
        LEFT JOIN tracks tr ON t.track_id = tr.track_id
        WHERE t.team_id=$1`,
        [teamId]
      )
    ).rows[0];
    if (!team) return res.status(404).json({ error: "team not found" });

    const members = await getMembers(teamId);
    const submissions = (
      await db.query(
        "SELECT * FROM submissions WHERE team_id=$1 ORDER BY created_at DESC",
        [teamId]
      )
    ).rows;

    res.json({ team, members, submissions });
  } catch (err) {
    console.error("getTeamDetail err", err);
    res.status(500).json({ error: "server error" });
  }
};

// POST /admin/team/:id/status
export const setTeamStatus = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const bodySchema = Joi.object({
      status: Joi.string()
        .valid("accepted", "rejected", "pending", "shortlisted")
        .required(),
    });

    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const { error: bodyErr } = bodySchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (bodyErr)
      return res
        .status(400)
        .json({ error: bodyErr.details.map((d) => d.message).join(", ") });

    const teamId = req.params.id;
    const { status } = req.body;
    if (!["accepted", "rejected", "pending", "shortlisted"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }
    await db.query(
      "UPDATE teams SET status=$1, updated_at=now() WHERE team_id=$2",
      [status, teamId]
    );
    res.json({ ok: true, status });
  } catch (err) {
    console.error("setTeamStatus err", err);
    res.status(500).json({ error: "server error" });
  }
};

// POST /admin/team/:id/member
export const addTeamMember = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const bodySchema = Joi.object({
      name: Joi.string().min(1).required(),
      email: Joi.string()
        .email()
        .pattern(/^[^@]+@(vitstudent\.ac\.in|vit\.ac\.in)$/)
        .required(),
      is_leader: Joi.boolean().optional(),
      extra_info: Joi.any().optional(),
    });

    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const { error: bodyErr } = bodySchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (bodyErr)
      return res
        .status(400)
        .json({ error: bodyErr.details.map((d) => d.message).join(", ") });

    const teamId = req.params.id;
    const { name, email, is_leader, extra_info } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: "name & email required" });

    const r = await db.query(
      "INSERT INTO users (name, email, team_id, is_leader, extra_info) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [
        name,
        email,
        teamId,
        !!is_leader,
        extra_info ? JSON.stringify(extra_info) : null,
      ]
    );
    res.json({ member: r.rows[0] });
  } catch (err) {
    console.error("addTeamMember err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/submissions
export const listSubmissions = async (req, res) => {
  try {
    const querySchema = Joi.object({
      type: Joi.string().optional(),
      team_id: Joi.string().pattern(/^\d+$/).optional(),
      panel_id: Joi.string().pattern(/^\d+$/).optional(),
      status: Joi.string().optional(),
    });
    const { error: queryErr } = querySchema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (queryErr)
      return res
        .status(400)
        .json({ error: queryErr.details.map((d) => d.message).join(", ") });

    const { type, team_id, panel_id, status } = req.query;
    const conditions = [];
    const params = [];

    if (type) {
      params.push(type);
      conditions.push(`s.type = $${params.length}`);
    }
    if (team_id) {
      params.push(team_id);
      conditions.push(`s.team_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (panel_id) {
      params.push(panel_id);
      conditions.push(
        `s.team_id IN (SELECT team_id FROM teams WHERE panel_id = $${params.length})`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const q = `
      SELECT s.*, t.team_name, t.track_id, t.panel_id
      FROM submissions s
      JOIN teams t ON s.team_id=t.team_id
      ${where}
      ORDER BY s.created_at DESC
    `;
    const r = await db.query(q, params);
    res.json({ submissions: r.rows });
  } catch (err) {
    console.error("listSubmissions err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/submission/:id
export const getSubmissionDetail = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const id = req.params.id;
    const sub = (
      await db.query(
        "SELECT s.*, t.team_name, t.panel_id FROM submissions s JOIN teams t ON s.team_id=t.team_id WHERE s.submission_id=$1",
        [id]
      )
    ).rows[0];
    if (!sub) return res.status(404).json({ error: "submission not found" });

    const reviews = (
      await db.query(
        "SELECT r.*, a.name as judge_name FROM reviews r LEFT JOIN admins a ON r.judge_id=a.admin_id WHERE r.submission_id=$1 ORDER BY r.created_at",
        [id]
      )
    ).rows;
    res.json({ submission: sub, reviews });
  } catch (err) {
    console.error("getSubmissionDetail err", err);
    res.status(500).json({ error: "server error" });
  }
};

// POST /admin/submission/:id/review
export const addReviewToSubmission = async (req, res) => {
  try {
    const paramsSchema = Joi.object({
      id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
        .required(),
    });
    const bodySchema = Joi.object({
      score: Joi.number().min(0).max(100).optional().allow(null),
      comments: Joi.string().allow("", null).optional(),
      set_team_status: Joi.string()
        .valid("accepted", "rejected", "pending", "shortlisted")
        .optional(),
    });

    const { error: paramsErr } = paramsSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (paramsErr)
      return res
        .status(400)
        .json({ error: paramsErr.details.map((d) => d.message).join(", ") });

    const { error: bodyErr } = bodySchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (bodyErr)
      return res
        .status(400)
        .json({ error: bodyErr.details.map((d) => d.message).join(", ") });

    const submission_id = req.params.id;
    const { score, comments, set_team_status } = req.body;
    const user = req.user;

    const subRow = (
      await db.query(
        "SELECT s.*, t.panel_id, t.team_id FROM submissions s JOIN teams t ON s.team_id=t.team_id WHERE s.submission_id=$1",
        [submission_id]
      )
    ).rows[0];
    if (!subRow) return res.status(404).json({ error: "submission not found" });

    if (user.role !== "superadmin") {
      if (!user.panel_id)
        return res.status(403).json({ error: "admin token missing panel_id" });
      if (user.panel_id !== subRow.panel_id)
        return res
          .status(403)
          .json({ error: "forbidden - submission not in your panel" });
    }

    await db.query(
      "INSERT INTO reviews (submission_id, judge_id, score, comments) VALUES ($1,$2,$3,$4)",
      [submission_id, user.admin_id, score || null, comments || null]
    );

    if (set_team_status && user.role === "superadmin") {
      await db.query("UPDATE teams SET status=$1 WHERE team_id=$2", [
        set_team_status,
        subRow.team_id,
      ]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("addReviewToSubmission err", err);
    res.status(500).json({ error: "server error" });
  }
};

export const listSubmissionWindows = async (req, res) => {
  try {
    const rows = await listWindows();
    res.json({ windows: rows });
  } catch (err) {
    console.error("listSubmissionWindows err", err);
    res.status(500).json({ error: "server error" });
  }
};

export const upsertSubmissionWindow = async (req, res) => {
  try {
    const bodySchema = Joi.object({
      name: Joi.string().valid("review1", "review2", "final").required(),
      open: Joi.boolean().optional(),
      start_at: Joi.date().iso().allow(null).optional(),
      end_at: Joi.date().iso().allow(null).optional(),
    });
    const { error: bodyErr } = bodySchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (bodyErr)
      return res
        .status(400)
        .json({ error: bodyErr.details.map((d) => d.message).join(", ") });

    const { name, open, start_at, end_at } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const allowed = ["review1", "review2", "final"];
    if (!allowed.includes(name))
      return res.status(400).json({ error: "invalid name" });
    const row = await upsertWindow({
      name,
      open: !!open,
      start_at: start_at || null,
      end_at: end_at || null,
    });
    res.json({ window: row });
  } catch (err) {
    console.error("upsertSubmissionWindow err", err);
    res.status(500).json({ error: "server error" });
  }
};

export const setHackathonPhase = async (req, res) => {
  try {
    const bodySchema = Joi.object({
      phase: Joi.string().min(1).required(),
    });
    const { error } = bodySchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: error.details.map((d) => d.message).join(", ") });

    const { phase } = req.body;

    const result = await db.query(
      "UPDATE event_status SET current_phase=$1 WHERE id=1 RETURNING *",
      [phase]
    );

    res.json({ ok: true, phase: result.rows[0].current_phase });
  } catch (err) {
    console.error("setHackathonPhase err", err);
    res.status(500).json({ error: "server error" });
  }
};
