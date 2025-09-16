import pool from "../utils/db.js";

export async function createSubmission({ team_id, submitted_by = null, type, title = null, description = null, link_url = null, file_url = null, status = "submitted" }) {
    const res = await pool.query(
        `INSERT INTO submissions (team_id, submitted_by, type, title, description, link_url, file_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [team_id, submitted_by, type, title, description, link_url, file_url, status]
    );
    return res.rows[0];
}

export async function getSubmissionsByTeam(team_id) {
    const res = await pool.query(
        `SELECT * FROM submissions WHERE team_id=$1 ORDER BY created_at DESC`,
        [team_id]
    );
    return res.rows;
}

export async function getSubmissionById(submission_id) {
    const res = await pool.query(
        `SELECT * FROM submissions WHERE submission_id=$1`,
        [submission_id]
    );
    return res.rows[0];
}
