import pool from "../utils/db.js";
import Joi from "joi";

export const submissionSchema = Joi.object({
    team_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).required(),
    submitted_by: Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).optional().allow(null),
    type: Joi.string().valid("review1", "review2", "final").required(),
    title: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    link_url: Joi.string().uri().allow('', null).optional(),
    file_url: Joi.string().allow('', null).optional(),
    status: Joi.string().valid("submitted", "pending", "approved", "rejected").optional()
});

export async function createSubmission(submissionData) {
    const { error, value } = submissionSchema.validate(submissionData, { abortEarly: false });
    if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

    const { team_id, submitted_by = null, type, title = null, description = null, link_url = null, file_url = null, status = "submitted" } = value;

    const res = await pool.query(
        `INSERT INTO submissions (team_id, submitted_by, type, title, description, link_url, file_url, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [team_id, submitted_by, type, title, description, link_url, file_url, status]
    );
    return res.rows[0];
}

export async function getSubmissionsByTeam(team_id) {
    const teamIdSchema = Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).required();
    const { error } = teamIdSchema.validate(team_id);
    if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

    const res = await pool.query(
        `SELECT * FROM submissions WHERE team_id=$1 ORDER BY created_at DESC`,
        [team_id]
    );
    return res.rows;
}

export async function getSubmissionById(submission_id) {
    const idSchema = Joi.alternatives().try(Joi.number().integer(), Joi.string().pattern(/^\d+$/)).required();
    const { error } = idSchema.validate(submission_id);
    if (error) throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);

    const res = await pool.query(
        `SELECT * FROM submissions WHERE submission_id=$1`,
        [submission_id]
    );
    return res.rows[0];
}
