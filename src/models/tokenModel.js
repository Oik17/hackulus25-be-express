// src/models/tokenModel.js
import pool from "../utils/db.js";

export async function blacklistToken(token) {
  const res = await pool.query(
    `INSERT INTO token_blacklist (token) VALUES ($1) RETURNING *`,
    [token]
  );
  return res.rows[0];
}

export async function isTokenBlacklisted(token) {
  const res = await pool.query(
    `SELECT 1 FROM token_blacklist WHERE token = $1 LIMIT 1`,
    [token]
  );
  return res.rowCount > 0;
}
