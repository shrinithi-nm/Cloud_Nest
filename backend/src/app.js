const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const marksRoutes = require("./routes/marksRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const fatRoutes = require("./routes/fatRoutes");
const examRoutes = require("./routes/examRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/marks", marksRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/fat", fatRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/roadmaps", roadmapRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);


app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "CloudNest Backend"
    });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "ok",
            database: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            status: "error",
            database: "not connected"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`CloudNest backend running on port ${PORT}`);
});