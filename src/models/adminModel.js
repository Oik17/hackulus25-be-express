import pool from "../utils/db.js";

export async function findAdminByEmail(email) {
  const res = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
  return res.rows[0];
}

export async function findAdminById(admin_id) {
  const res = await pool.query("SELECT * FROM admins WHERE admin_id = $1", [admin_id]);
  return res.rows[0];
}

export async function createAdmin({ name, email, password_hash, role = "judge", panel_id = null }) {
  const res = await pool.query(
    `INSERT INTO admins (name, email, password_hash, role, panel_id) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, email, password_hash, role, panel_id]
  );
  return res.rows[0];
}
