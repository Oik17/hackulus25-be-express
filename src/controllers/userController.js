import path from "path";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import Redis from "ioredis";
import {
  getSubmissionsByTeam,
  createSubmission,
  getSubmissionById,
  updateSubmission,
} from "../models/submissionModel.js";
import { getWindowByName } from "../models/submissionWindowModel.js";
import db from "../utils/db.js";

const redis = new Redis(process.env.REDIS_URL);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadsPath = path.join(process.cwd(), uploadDir);
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsPath),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${ts}_${Math.random().toString(36).slice(2, 5)}_${safe}`); // Shortened hash to 5 chars
  },
});
const upload = multer({ storage });

function isWindowOpenSync(win) {
  if (!win) return false;
  if (win.open) return true;
  const now = new Date();
  if (win.start_at && win.end_at) {
    return now >= new Date(win.start_at) && now <= new Date(win.end_at);
  }
  return false;
}

// Joi schemas for submissions
const submissionBodySchema = Joi.object({
  type: Joi.string().valid("review1", "review2", "final").required(),
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional().allow(null, ""),
  link_url: Joi.string().uri().optional().allow(null, ""), // For idea form's presentation link
  github_link: Joi.string().uri().optional().allow(null, ""),
  figma_link: Joi.string().uri().optional().allow(null, ""),
  presentation_link: Joi.string().uri().optional().allow(null, ""), // For project form
}).unknown(true);

export const getUsersHome = async (req, res) => {
  try {
    const user = req.currentUser;
    if (!user) return res.status(401).json({ error: "Unauthenticated" });
    const cacheKey = `user_home:${user.user_id}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const teamRow = user.team_id
      ? (
          await db.query(
            "SELECT t.*, tr.name as track_name, tr.problem_statement FROM teams t LEFT JOIN tracks tr ON t.track_id=tr.track_id WHERE t.team_id=$1",
            [user.team_id]
          )
        ).rows[0]
      : null;

    const members = user.team_id
      ? (
          await db.query(
            "SELECT user_id, name, email, is_leader, extra_info FROM users WHERE team_id=$1 ORDER BY user_id",
            [user.team_id]
          )
        ).rows
      : [];

    const review1Window = await getWindowByName("review1");
    const review2Window = await getWindowByName("review2");
    const finalWindow = await getWindowByName("final");
    const phaseResult = await db.query(
      "SELECT current_phase FROM event_status WHERE id=1"
    );
    const currentPhase =
      phaseResult.rows[0]?.current_phase || "Participants reach";

    const responseData = {
      user,
      team: teamRow,
      members,
      windows: {
        review1: isWindowOpenSync(review1Window),
        review2: isWindowOpenSync(review2Window),
        final: isWindowOpenSync(finalWindow),
      },
      currentPhase,
    };
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
    res.json(responseData);
  } catch (err) {
    console.error("getUsersHome err", err);
    res.status(500).json({ error: "server error" });
  }
};

export const listMySubmissions = async (req, res) => {
  try {
    const user = req.currentUser;
    if (!user || !user.team_id) return res.json({ submissions: [] });
    const subs = await getSubmissionsByTeam(user.team_id);

    // get original filename from url
    const submissionsWithOriginalName = subs.map((submission) => ({
      ...submission,
      original_filename: submission.file_url
        ? submission.file_url.split("_").slice(2).join("_")
        : null,
    }));

    res.json({ submissions: submissionsWithOriginalName });
  } catch (err) {
    console.error("listMySubmissions err", err);
    res.status(500).json({ error: "server error" });
  }
};

export const submitReview = [
  upload.single("file"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      if (!user || !user.team_id)
        return res.status(400).json({ error: "user must belong to a team" });
      if (!user.is_leader)
        return res.status(403).json({ error: "leader only" });

      // validate body
      const { error } = submissionBodySchema.validate(
        { ...req.body, type: req.body.type },
        { abortEarly: false, allowUnknown: true }
      );
      if (error)
        return res
          .status(400)
          .json({ error: error.details.map((d) => d.message).join(", ") });

      const { type } = req.body;
      if (!["review1", "review2"].includes(type))
        return res.status(400).json({ error: "invalid review type" });

      const window = await getWindowByName(type);
      if (!isWindowOpenSync(window))
        return res
          .status(403)
          .json({ error: `${type} submissions are closed` });

      let file_url = null;
      if (req.file) {
        file_url = `/uploads/${req.file.filename}`;
      }

      const links = {};
      if (req.body.link_url) links.presentation = req.body.link_url;
      if (req.file) links.file = `/uploads/${req.file.filename}`;

      const created = await createSubmission({
        team_id: user.team_id,
        submitted_by: user.user_id,
        type: req.body.type,
        title: req.body.title || `${req.body.type} submission`,
        description: req.body.description || null,
        links: links, // Pass the links object
        status: "submitted",
      });
      res.status(201).json({ submission: created });
    } catch (err) {
      console.error("submitReview err", err);
      res.status(500).json({ error: "server error" });
    }
  },
];

export const submitFinal = [
  upload.single("file"),
  async (req, res) => {
    try {
      const user = req.currentUser;
      if (!user || !user.team_id)
        return res.status(400).json({ error: "user must belong to a team" });
      if (!user.is_leader)
        return res.status(403).json({ error: "leader only" });

      // validate body
      const { error } = submissionBodySchema.validate(
        { ...req.body, type: "final" },
        { abortEarly: false, allowUnknown: true }
      );
      if (error)
        return res
          .status(400)
          .json({ error: error.details.map((d) => d.message).join(", ") });

      const window = await getWindowByName("final");
      if (!isWindowOpenSync(window))
        return res.status(403).json({ error: "final submissions are closed" });

      let file_url = null;
      if (req.file) file_url = `/uploads/${req.file.filename}`;

      const links = {};

      const { title, description, presentation_link, github_link, figma_link } =
        req.body;
      if (presentation_link) links.presentation_link = presentation_link;
      if (github_link) links.github_link = github_link;
      if (figma_link) links.figma_link = figma_link;
      if (req.file) links.file = `/uploads/${req.file.filename}`;

      const created = await createSubmission({
        team_id: user.team_id,
        submitted_by: user.user_id,
        type: "final",
        title: title || "final submission",
        description: description || null,
        links: links, // Pass the links object
        status: "submitted",
      });
      res.status(201).json({ submission: created });
    } catch (err) {
      console.error("submitFinal err", err);
      res.status(500).json({ error: "server error" });
    }
  },
];

export const modifySubmission = [
  upload.single("file"), // Keep multer middleware to handle potential file uploads
  async (req, res) => {
    try {
      const user = req.currentUser;
      const submission_id = req.params.id;

      if (!user || !user.team_id) {
        return res.status(400).json({ error: "User must belong to a team" });
      }
      if (!user.is_leader) {
        return res
          .status(403)
          .json({ error: "Only the team leader can modify submissions" });
      }

      // Verify this submission belongs to the user's team
      const existingSubmission = await getSubmissionById(submission_id);
      if (!existingSubmission || existingSubmission.team_id !== user.team_id) {
        return res.status(404).json({
          error:
            "Submission not found or you do not have permission to edit it.",
        });
      }

      // Validate body
      const { error } = submissionBodySchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
      });
      if (error)
        return res
          .status(400)
          .json({ error: error.details.map((d) => d.message).join(", ") });

      let file_url = existingSubmission.file_url; // Default to old file
      if (req.file) {
        file_url = `/uploads/${req.file.filename}`; // Update if a new file is uploaded
      }

      const links = { ...existingSubmission.links };
      if (req.body.presentation_link)
        links.presentation = req.body.presentation_link; // Use correct key
      if (req.body.github_link) links.github = req.body.github_link; // Use correct key
      if (req.body.figma_link) links.figma = req.body.figma_link; // Use correct key
      if (req.file) links.file = `/uploads/${req.file.filename}`;

      const updated = await updateSubmission(req.params.id, {
        team_id: user.team_id,
        type: existingSubmission.type,
        title: req.body.title || existingSubmission.title,
        description: req.body.description || existingSubmission.description,
        links: links, // Pass the updated links object
      });

      res.status(200).json({ submission: updated });
    } catch (err) {
      console.error("modifySubmission err", err);
      res.status(500).json({ error: "Server error" });
    }
  },
];

export const updateTeamProblemStatement = async (req, res) => {
  try {
    const user = req.currentUser;
    const { problem_statement } = req.body;

    if (!user || !user.team_id) {
      return res.status(400).json({ error: "User must be in a team." });
    }
    if (!user.is_leader) {
      return res.status(403).json({
        error: "Only the team leader can change the problem statement.",
      });
    }
    if (!problem_statement || typeof problem_statement !== "string") {
      return res
        .status(400)
        .json({ error: "A valid problem_statement string is required." });
    }

    await db.query(
      "UPDATE teams SET problem_statement = $1 WHERE team_id = $2",
      [problem_statement, user.team_id]
    );

    res.json({
      success: true,
      message: "Problem statement updated successfully.",
    });
  } catch (err) {
    console.error("updateTeamProblemStatement err", err);
    res
      .status(500)
      .json({ error: "Server error while updating problem statement." });
  }
};
