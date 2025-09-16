import db from "../utils/db.js";
import * as scheduler from "../utils/scheduler.js";

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
    const { team_id, panel_id } = req.body;
    if (!team_id || !panel_id) {
      return res.status(400).json({ error: "team_id and panel_id required" });
    }

    const r = await db.query(
      "UPDATE teams SET panel_id=$1 WHERE team_id=$2 RETURNING *",
      [panel_id, team_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "team not found" });

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
    if (!panels.length) return res.status(400).json({ error: "no panels defined" });

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
    const q = `SELECT * FROM teams ${where} ORDER BY created_at DESC`;
    const r = await db.query(q, params);
    const teams = r.rows;

    const out = [];
    for (const t of teams) {
      const members = await getMembers(t.team_id);
      out.push({ ...t, members });
    }

    res.json({ teams: out });
  } catch (err) {
    console.error("listTeams err", err);
    res.status(500).json({ error: "server error" });
  }
};

// GET /admin/team/:id
export const getTeamDetail = async (req, res) => {
  try {
    const teamId = req.params.id;
    const team = (
      await db.query("SELECT * FROM teams WHERE team_id=$1", [teamId])
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
        return res.status(403).json({ error: "forbidden - submission not in your panel" });
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
