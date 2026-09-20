const express = require("express");

const {
    getStudentExams,
    getExamById,
    createExam
} = require("../controllers/examController");

const authenticate = require("../middleware/authMiddleware");
const authorizeStudentAccess = require("../middleware/studentAccessMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Student/Admin → view student's exams
router.get(
    "/student/:studentId",
    authenticate,
    authorizeStudentAccess,
    getStudentExams
);

// Authenticated users → view exam
router.get(
    "/:examId",
    authenticate,
    getExamById
);

// Admin only → create exam
router.post(
    "/",
    authenticate,
    requireRole("admin"),
    createExam
);

module.exports = router;