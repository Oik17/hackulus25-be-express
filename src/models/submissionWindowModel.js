import pool from "../utils/db.js";
import Joi from "joi";

export const windowSchema = Joi.object({
    name: Joi.string().min(1).required(),
    open: Joi.boolean().optional(),
    start_at: Joi.date().iso().allow(null).optional(),
    end_at: Joi.date().iso().allow(null).optional()
});

export async function getWindowByName(name) {
    const { error } = Joi.string().min(1).required().validate(name);
    if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

    const res = await pool.query(
        `SELECT * FROM submission_windows WHERE name=$1 LIMIT 1`,
        [name]
    );
    return res.rows[0] || null;
}

export async function listWindows() {
    const res = await pool.query(
        `SELECT * FROM submission_windows ORDER BY window_id`
    );
    return res.rows;
}

export async function upsertWindow(data) {
    const { error, value } = windowSchema.validate(data, { abortEarly: false });
    if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

    const { name, open = false, start_at = null, end_at = null } = value;

    const existing = await getWindowByName(name);
    if (existing) {
        const res = await pool.query(
            `UPDATE submission_windows 
             SET open=$1, start_at=$2, end_at=$3, updated_at=now() 
             WHERE name=$4 RETURNING *`,
            [open, start_at, end_at, name]
        );
        return res.rows[0];
    } else {
        const res = await pool.query(
            `INSERT INTO submission_windows (name, open, start_at, end_at) 
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [name, open, start_at, end_at]
        );
        return res.rows[0];
    }
}
