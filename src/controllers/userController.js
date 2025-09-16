import path from "path";
import fs from "fs";
import multer from "multer";
import { getSubmissionsByTeam, createSubmission } from "../models/submissionModel.js";
import { getWindowByName } from "../models/submissionWindowModel.js";
import db from "../utils/db.js";

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadsPath = path.join(process.cwd(), uploadDir);
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsPath),
    filename: (req, file, cb) => {
        const ts = Date.now();
        const safe = file.originalname.replace(/\s+/g, "_");
        cb(null, `${ts}_${Math.random().toString(36).slice(2, 5)}_${safe}`); // Shortened hash to 5 chars
    }
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

export const getUsersHome = async (req, res) => {
    try {
        const user = req.currentUser;
        if (!user) return res.status(401).json({ error: "Unauthenticated" });

        const teamRow = user.team_id
            ? (await db.query(
                "SELECT t.*, tr.name as track_name, tr.problem_statement FROM teams t LEFT JOIN tracks tr ON t.track_id=tr.track_id WHERE t.team_id=$1",
                [user.team_id]
            )).rows[0]
            : null;

        const members = user.team_id
            ? (await db.query(
                "SELECT user_id, name, email, is_leader, extra_info FROM users WHERE team_id=$1 ORDER BY user_id",
                [user.team_id]
            )).rows
            : [];

        const review1Window = await getWindowByName("review1");
        const review2Window = await getWindowByName("review2");
        const finalWindow = await getWindowByName("final");

        res.json({
            user,
            team: teamRow,
            members,
            windows: {
                review1: isWindowOpenSync(review1Window),
                review2: isWindowOpenSync(review2Window),
                final: isWindowOpenSync(finalWindow)
            }
        });
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
        const submissionsWithOriginalName = subs.map(submission => ({
            ...submission,
            original_filename: submission.file_url.split('_').slice(2).join('_')
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
            if (!user || !user.team_id) return res.status(400).json({ error: "user must belong to a team" });
            if (!user.is_leader) return res.status(403).json({ error: "leader only" });

            const { type } = req.body;
            if (!["review1", "review2"].includes(type)) return res.status(400).json({ error: "invalid review type" });

            const window = await getWindowByName(type);
            if (!isWindowOpenSync(window)) return res.status(403).json({ error: `${type} submissions are closed` });

            const link_url = req.body.link_url || null;
            const title = req.body.title || `${type} submission`;
            const description = req.body.description || null;
            let file_url = null;
            if (req.file) {
                file_url = `/uploads/${req.file.filename}`;
            }

            const created = await createSubmission({
                team_id: user.team_id,
                submitted_by: user.user_id,
                type,
                title,
                description,
                link_url,
                file_url,
                status: "submitted"
            });

            res.status(201).json({ submission: created });
        } catch (err) {
            console.error("submitReview err", err);
            res.status(500).json({ error: "server error" });
        }
    }
];

export const submitFinal = [
    upload.single("file"),
    async (req, res) => {
        try {
            const user = req.currentUser;
            if (!user || !user.team_id) return res.status(400).json({ error: "user must belong to a team" });
            if (!user.is_leader) return res.status(403).json({ error: "leader only" });

            const window = await getWindowByName("final");
            if (!isWindowOpenSync(window)) return res.status(403).json({ error: "final submissions are closed" });

            const link_url = req.body.link_url || null;
            const title = req.body.title || "final submission";
            const description = req.body.description || null;
            let file_url = null;
            if (req.file) file_url = `/uploads/${req.file.filename}`;

            const created = await createSubmission({
                team_id: user.team_id,
                submitted_by: user.user_id,
                type: "final",
                title,
                description,
                link_url,
                file_url,
                status: "submitted"
            });

            res.status(201).json({ submission: created });
        } catch (err) {
            console.error("submitFinal err", err);
            res.status(500).json({ error: "server error" });
        }
    }
];
