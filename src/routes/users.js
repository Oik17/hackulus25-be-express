import { Router } from "express";
import Joi from "joi";
import { verifyToken } from "../middleware/authMiddleware.js";
import { ensureUserExists, requireTeamLeader } from "../middleware/userMiddleware.js";
import * as userCtrl from "../controllers/userController.js";

const router = Router();

router.use(verifyToken);
router.use(ensureUserExists);

// GET routes
router.get("/home", userCtrl.getUsersHome);
router.get("/submissions", userCtrl.listMySubmissions);

// POST /submission/review
router.post("/submission/review", requireTeamLeader, async (req, res, next) => {
    const schema = Joi.object({
        type: Joi.string().valid("review1", "review2").required(),
        title: Joi.string().allow(null, ""),
        description: Joi.string().allow(null, ""),
        link_url: Joi.string().uri().allow(null, "")
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return userCtrl.submitReview[1](req, res, next); // call inner handler of multer array
});

// POST /submission/final
router.post("/submission/final", requireTeamLeader, async (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().allow(null, ""),
        description: Joi.string().allow(null, ""),
        link_url: Joi.string().uri().allow(null, "")
    });

    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) return res.status(400).json({ message: error.details.map(d => d.message).join(", ") });

    return userCtrl.submitFinal[1](req, res, next); // call inner handler of multer array
});

export default router;
