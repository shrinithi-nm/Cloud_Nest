const express = require("express");

const {
    getStudentAnalytics
} = require("../controllers/analyticsController");

const router = express.Router();

router.get(
    "/student/:studentId",
    getStudentAnalytics
);

module.exports = router;