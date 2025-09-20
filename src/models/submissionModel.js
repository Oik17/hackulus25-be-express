import pool from "../utils/db.js";
import Joi from "joi";

export const submissionSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  submitted_by: Joi.number().integer().optional().allow(null),
  type: Joi.string().valid("review1", "review2", "final").required(),
  title: Joi.string().allow("", null).optional(),
  description: Joi.string().allow("", null).optional(),
  links: Joi.object()
    .pattern(Joi.string(), Joi.string().uri().allow("", null))
    .optional()
    .allow(null),
  status: Joi.string()
    .valid("submitted", "pending", "approved", "rejected")
    .optional(),
});

export async function createSubmission(submissionData) {
  const { error, value } = submissionSchema.validate(submissionData, {
    abortEarly: false,
  });
  if (error) {
    throw new Error(
      `Validation error: ${error.details.map((d) => d.message).join(", ")}`
    );
  }

  const {
    team_id,
    submitted_by = null,
    type,
    title = null,
    description = null,
    links = null,
    status = "submitted",
  } = value;

  const res = await pool.query(
    `INSERT INTO submissions (team_id, submitted_by, type, title, description, links, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [team_id, submitted_by, type, title, description, links, status]
  );
  return res.rows[0];
}

export async function updateSubmission(submission_id, submissionData) {
  const { error, value } = submissionSchema.validate(submissionData, {
    abortEarly: false,
  });
  if (error) {
    throw new Error(
      `Validation error: ${error.details.map((d) => d.message).join(", ")}`
    );
  }

  const { title, description, links, status } = value;

  const res = await pool.query(
    `UPDATE submissions 
     SET 
       title = $1, 
       description = $2, 
       links = $3, 
       status = $4, 
       updated_at = now()
     WHERE submission_id = $5 RETURNING *`,
    [title, description, links, status || "submitted", submission_id]
  );
  return res.rows[0];
}

export async function getSubmissionsByTeam(team_id) {
  const teamIdSchema = Joi.number().integer().required();
  const { error } = teamIdSchema.validate(team_id);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }

  const res = await pool.query(
    `SELECT * FROM submissions WHERE team_id=$1 ORDER BY created_at DESC`,
    [team_id]
  );
  return res.rows;
}

export async function getSubmissionById(submission_id) {
  const idSchema = Joi.number().integer().required();
  const { error } = idSchema.validate(submission_id);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }

  const res = await pool.query(
    `SELECT * FROM submissions WHERE submission_id=$1`,
    [submission_id]
  );
  return res.rows[0];
}
