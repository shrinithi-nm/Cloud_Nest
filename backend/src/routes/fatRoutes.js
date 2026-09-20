const express = require("express");

const {
    calculateFatTarget,
    calculateWhatIfFat
} = require("../controllers/fatController");

const authenticate = require("../middleware/authMiddleware");
const authorizeStudentAccess = require("../middleware/studentAccessMiddleware");

const router = express.Router();

router.get(
    "/student/:studentId/subject/:subjectId",
    authenticate,
    authorizeStudentAccess,
    calculateFatTarget
);

router.get(
    "/what-if/student/:studentId/subject/:subjectId",
    authenticate,
    authorizeStudentAccess,
    calculateWhatIfFat
);

module.exports = router;