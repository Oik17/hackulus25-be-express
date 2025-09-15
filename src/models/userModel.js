// src/models/userModel.js
import pool from "../utils/db.js";

export async function findUserByEmail(email) {
  const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return res.rows[0];
}

export async function findUserById(user_id) {
  const res = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
  return res.rows[0];
}

export async function createUser({ name, email, team_id = null, is_leader = false, extra_info = null }) {
  const res = await pool.query(
    `INSERT INTO users (name, email, team_id, is_leader, extra_info)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, email, team_id, is_leader, extra_info]
  );
  return res.rows[0];
}
