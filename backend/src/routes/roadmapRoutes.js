const express = require("express");

const {
    generateRoadmap,
    getStudentRoadmaps,
    getRoadmapById
} = require("../controllers/roadmapController");

const authenticate = require("../middleware/authMiddleware");
const authorizeStudentAccess = require("../middleware/studentAccessMiddleware");

const router = express.Router();

// Generate roadmap for an exam
router.post(
    "/generate/:examId",
    authenticate,
    generateRoadmap
);

// View student's roadmaps
router.get(
    "/student/:studentId",
    authenticate,
    authorizeStudentAccess,
    getStudentRoadmaps
);

// View specific roadmap
router.get(
    "/:roadmapId",
    authenticate,
    getRoadmapById
);

module.exports = router;