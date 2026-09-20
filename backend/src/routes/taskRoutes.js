const express = require("express");

const {
    generateTasksFromRoadmap,
    getStudentTasks,
    updateTask,
    getAdaptiveTasks,
    optimizeMyDay
} = require("../controllers/taskController");

const authenticate = require("../middleware/authMiddleware");
const authorizeStudentAccess = require("../middleware/studentAccessMiddleware");

const router = express.Router();

// Generate tasks from roadmap
router.post(
    "/generate/roadmap/:roadmapId",
    authenticate,
    generateTasksFromRoadmap
);

// View student's tasks
router.get(
    "/student/:studentId",
    authenticate,
    authorizeStudentAccess,
    getStudentTasks
);

// Update task
router.patch(
    "/:taskId",
    authenticate,
    updateTask
);

// Adaptive task engine
router.get(
    "/adaptive/student/:studentId",
    authenticate,
    authorizeStudentAccess,
    getAdaptiveTasks
);

// Optimize my day
router.get(
    "/optimize/student/:studentId",
    authenticate,
    authorizeStudentAccess,
    optimizeMyDay
);

module.exports = router;