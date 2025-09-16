import { findUserById } from "../models/userModel.js";

export async function ensureUserExists(req, res, next) {
    const payload = req.user;
    if (!payload) return res.status(401).json({ error: "Unauthenticated" });

    const userId = payload.user_id || payload.id || payload.uid;
    if (!userId) return res.status(400).json({ error: "user id missing in token" });

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "user not found" });

    req.currentUser = user;
    return next();
}

export function requireTeamLeader(req, res, next) {
    const user = req.currentUser;
    if (!user) return res.status(401).json({ error: "Unauthenticated" });
    if (!user.is_leader) return res.status(403).json({ error: "Forbidden - leader only" });
    return next();
}
