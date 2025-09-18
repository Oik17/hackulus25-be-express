import pool from "../utils/db.js";
import Joi from "joi";

// joi schema 
export const adminSchema = Joi.object({
  name: Joi.string().allow('', null).optional(),
  email: Joi.string().email().required(),
  password_hash: Joi.string().min(60).required(), // bcrypt hash length check
  role: Joi.string().valid("judge", "admin", "superadmin").optional(),
  panel_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).optional()
});

export async function findAdminByEmail(email) {
  const res = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
  return res.rows[0];
}

export async function findAdminById(admin_id) {
  const res = await pool.query("SELECT * FROM admins WHERE admin_id = $1", [admin_id]);
  return res.rows[0];
}

export async function createAdmin(adminData) {
  const { error, value } = adminSchema.validate(adminData, { abortEarly: false });
  if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

  const { name, email, password_hash, role = "judge", panel_id = null } = value;

  const res = await pool.query(
    `INSERT INTO admins (name, email, password_hash, role, panel_id) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, email, password_hash, role, panel_id]
  );
  return res.rows[0];
}
