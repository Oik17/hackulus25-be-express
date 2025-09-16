import pool from "../utils/db.js";

export async function getWindowByName(name) {
    const res = await pool.query(`SELECT * FROM submission_windows WHERE name=$1 LIMIT 1`, [name]);
    return res.rows[0] || null;
}

export async function listWindows() {
    const res = await pool.query(`SELECT * FROM submission_windows ORDER BY id`);
    return res.rows;
}

export async function upsertWindow({ name, open = false, start_at = null, end_at = null }) {
    const existing = await getWindowByName(name);
    if (existing) {
        const res = await pool.query(
            `UPDATE submission_windows SET open=$1, start_at=$2, end_at=$3, updated_at=now() WHERE name=$4 RETURNING *`,
            [open, start_at, end_at, name]
        );
        return res.rows[0];
    } else {
        const res = await pool.query(
            `INSERT INTO submission_windows (name, open, start_at, end_at) VALUES ($1,$2,$3,$4) RETURNING *`,
            [name, open, start_at, end_at]
        );
        return res.rows[0];
    }
}
