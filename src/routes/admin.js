import { Router } from "express";
import * as adminCtrl from "../controllers/adminController.js";
import * as auth from "../middleware/authMiddleware.js";
import Joi from "joi";

const router = Router();

router.use(auth.verifyToken);
router.use(auth.requireAdmin);

// GET routes
router.get("/panels", adminCtrl.listPanels);
router.get("/panel/:id/teams", adminCtrl.getPanelTeams);
router.get("/teams", adminCtrl.listTeams);
router.get("/team/:id", adminCtrl.getTeamDetail);
router.get("/submissions", adminCtrl.listSubmissions);
router.get("/submission/:id", adminCtrl.getSubmissionDetail);

// assign panel manually, requires a JSON input with panel_id and team_id
router.post("/panel/assign", auth.requireSuperAdmin, async (req, res, next) => {
  const schema = Joi.object({
    panel_id: Joi.alternatives()
      .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
      .required(),
    team_id: Joi.alternatives()
      .try(Joi.number().integer(), Joi.string().pattern(/^\d+$/))
      .required(),
  });
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error)
    return res
      .status(400)
      .json({ message: error.details.map((d) => d.message).join(", ") });
  return adminCtrl.assignPanelManual(req, res, next);
});

// auto panel assign
router.post(
  "/assign-panels",
  auth.requireSuperAdmin,
  adminCtrl.runAutoPanelAssignment
);

// set team status
router.post(
  "/team/:id/status",
  auth.requireSuperAdmin,
  adminCtrl.setTeamStatus
);

// add team member
router.post(
  "/team/:id/member",
  auth.requireSuperAdmin,
  async (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      is_leader: Joi.boolean().optional(),
      extra_info: Joi.any().optional(),
    });
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    return adminCtrl.addTeamMember(req, res, next);
  }
);

// add review to submission
router.post("/submission/:id/review", async (req, res, next) => {
  const schema = Joi.object({
    review: Joi.string().min(1).required(),
    score: Joi.number().min(0).max(100).optional(),
  });
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error)
    return res
      .status(400)
      .json({ message: error.details.map((d) => d.message).join(", ") });
  return adminCtrl.addReviewToSubmission(req, res, next);
});

// submission windows (superadmin)
router.get(
  "/submission-windows",
  auth.requireSuperAdmin,
  adminCtrl.listSubmissionWindows
);

router.post(
  "/submission-window",
  auth.requireSuperAdmin,
  async (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().required(),
      open: Joi.boolean().optional(),
      start_at: Joi.date().optional().allow(null),
      end_at: Joi.date().optional().allow(null),
    });
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error)
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    return adminCtrl.upsertSubmissionWindow(req, res, next);
  }
);

router.post(
  "/timeline/phase",
  auth.requireSuperAdmin,
  adminCtrl.setHackathonPhase
);

export default router;
