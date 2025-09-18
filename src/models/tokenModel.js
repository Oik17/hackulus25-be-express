import pool from "../utils/db.js";
import Joi from "joi";

const tokenSchema = Joi.string().min(10).required();

export async function blacklistToken(token) {
  const { error, value } = tokenSchema.validate(token);
  if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  const res = await pool.query(
    `INSERT INTO token_blacklist (token) VALUES ($1) RETURNING *`,
    [value]
  );
  return res.rows[0];
}

export async function isTokenBlacklisted(token) {
  const { error, value } = tokenSchema.validate(token);
  if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  const res = await pool.query(
    `SELECT 1 FROM token_blacklist WHERE token = $1 LIMIT 1`,
    [value]
  );
  return res.rowCount > 0;
}
