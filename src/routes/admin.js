import { Router } from "express";
import * as adminCtrl from "../controllers/adminController.js";
import * as auth from "../middleware/authMiddleware.js";
const router = Router();


router.use(auth.verifyToken);
router.use(auth.requireAdmin);

router.get('/panels', adminCtrl.listPanels);
router.get('/panel/:id/teams', adminCtrl.getPanelTeams);

router.post('/panel/assign', auth.requireSuperAdmin, adminCtrl.assignPanelManual);
router.post('/assign-panels', auth.requireSuperAdmin, adminCtrl.runAutoPanelAssignment);

router.get('/teams', adminCtrl.listTeams);
router.get('/team/:id', adminCtrl.getTeamDetail);

router.post('/team/:id/status', auth.requireSuperAdmin, adminCtrl.setTeamStatus);
router.post('/team/:id/member', auth.requireSuperAdmin, adminCtrl.addTeamMember);

router.get('/submissions', adminCtrl.listSubmissions);
router.get('/submission/:id', adminCtrl.getSubmissionDetail);
router.post('/submission/:id/review', adminCtrl.addReviewToSubmission);

export default router;