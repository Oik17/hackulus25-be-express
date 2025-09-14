const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

router.use(auth.verifyToken);
router.use(auth.requireAdmin);

router.get('/panels', adminCtrl.listPanels);
router.get('/panel/:id/teams', adminCtrl.getPanelTeams);

// superadmin only
router.post('/panel/assign', auth.requireSuperAdmin, adminCtrl.assignPanelManual);
router.post('/assign-panels', auth.requireSuperAdmin, adminCtrl.runAutoPanelAssignment);

// team
router.get('/teams', adminCtrl.listTeams);
router.get('/team/:id', adminCtrl.getTeamDetail);

// superadmin only
router.post('/team/:id/status', auth.requireSuperAdmin, adminCtrl.setTeamStatus);
router.post('/team/:id/member', auth.requireSuperAdmin, adminCtrl.addTeamMember);

// submit
router.get('/submissions', adminCtrl.listSubmissions);
router.get('/submission/:id', adminCtrl.getSubmissionDetail);
router.post('/submission/:id/review', adminCtrl.addReviewToSubmission);

module.exports = router;
