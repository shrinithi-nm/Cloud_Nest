const express = require("express");

const { getStudentMarks } = require("../controllers/marksController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/student/:studentId",
    authenticate,
    getStudentMarks
);

module.exports = router;