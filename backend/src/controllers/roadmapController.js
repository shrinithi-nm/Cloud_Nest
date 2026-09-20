const pool = require("../config/db");


// ============================================================
// GENERATE ROADMAP
// ============================================================

const generateRoadmap = async (req, res) => {
    const client = await pool.connect();

    try {
        const { examId } = req.params;

        // Get exam
        const examResult = await client.query(
            `
            SELECT
                e.id,
                e.workspace_id,
                e.student_id,
                e.subject_id,
                e.name,
                e.exam_date,
                e.syllabus
            FROM exams e
            WHERE e.id = $1
                AND e.workspace_id = $2
            `,
            [examId, req.user.workspace_id]
        );

        if (examResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Exam not found"
            });
        }

        const exam = examResult.rows[0];

        // Prevent duplicate roadmap
        const existingRoadmap = await client.query(
            `
            SELECT id
            FROM roadmaps
            WHERE workspace_id = $1
              AND exam_id = $2
            `,
            [exam.workspace_id, exam.id]
        );

        if (existingRoadmap.rows.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "Roadmap already exists for this exam",
                roadmapId: existingRoadmap.rows[0].id
            });
        }

        // Convert syllabus into topics
        let topics = [];

        if (exam.syllabus) {
            topics = exam.syllabus
                .split(",")
                .map(topic => topic.trim())
                .filter(topic => topic.length > 0);
        }

        // Fallback topics
        if (topics.length === 0) {
            topics = [
                "Core Concepts",
                "Important Problems",
                "Advanced Topics",
                "Revision",
                "Mock Test"
            ];
        }

        await client.query("BEGIN");

        // Calculate start date
        const examDate = new Date(exam.exam_date);

        const startDate = new Date(examDate);
        startDate.setDate(
            startDate.getDate() - topics.length
        );

        // Create roadmap
        const roadmapResult = await client.query(
            `
            INSERT INTO roadmaps (
                workspace_id,
                student_id,
                exam_id,
                title,
                start_date,
                end_date,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [
                exam.workspace_id,
                exam.student_id,
                exam.id,
                `${exam.name} - Study Roadmap`,
                startDate,
                examDate,
                "ACTIVE"
            ]
        );

        const roadmap = roadmapResult.rows[0];

        // Create roadmap items
        for (let i = 0; i < topics.length; i++) {

            const scheduledDate = new Date(startDate);

            scheduledDate.setDate(
                scheduledDate.getDate() + i
            );

            await client.query(
                `
                INSERT INTO roadmap_items (
                    workspace_id,
                    roadmap_id,
                    title,
                    description,
                    scheduled_date,
                    estimated_minutes,
                    sequence_number,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                    exam.workspace_id,
                    roadmap.id,
                    topics[i],
                    `Study ${topics[i]} for ${exam.name}`,
                    scheduledDate,
                    i === topics.length - 1 ? 90 : 60,
                    i + 1,
                    "PENDING"
                ]
            );
        }

        await client.query("COMMIT");

        // Fetch generated items
        const itemsResult = await pool.query(
            `
            SELECT
                id,
                workspace_id,
                roadmap_id,
                title,
                description,
                scheduled_date,
                estimated_minutes,
                sequence_number,
                status,
                created_at
            FROM roadmap_items
            WHERE workspace_id = $1
              AND roadmap_id = $2
            ORDER BY sequence_number
            `,
            [exam.workspace_id, roadmap.id]
        );

        res.status(201).json({
            status: "success",
            message: "Study roadmap generated successfully",
            data: {
                roadmap,
                items: itemsResult.rows
            }
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Error generating roadmap:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to generate roadmap"
        });

    } finally {
        client.release();
    }
};


// ============================================================
// GET STUDENT ROADMAPS
// ============================================================

const getStudentRoadmaps = async (req, res) => {

    try {

        const { studentId } = req.params;

        const result = await pool.query(
            `
            SELECT
                r.id,
                r.workspace_id,
                r.student_id,
                r.exam_id,
                r.title,
                r.start_date,
                r.end_date,
                r.status,
                e.name AS exam_name,
                e.exam_date
            FROM roadmaps r
            JOIN exams e
                ON e.workspace_id = r.workspace_id
                AND e.id = r.exam_id
            WHERE r.student_id = $1
                AND r.workspace_id = $2
            ORDER BY r.start_date DESC
            `,
            [studentId, req.user.workspace_id]
        );

        res.json({
            status: "success",
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error(
            "Error fetching student roadmaps:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to fetch roadmaps"
        });
    }
};


// ============================================================
// GET ROADMAP BY ID
// ============================================================

const getRoadmapById = async (req, res) => {

    try {

        const { roadmapId } = req.params;

        // Get roadmap
        const roadmapResult = await pool.query(
            `
            SELECT
                r.id,
                r.workspace_id,
                r.student_id,
                r.exam_id,
                r.title,
                r.start_date,
                r.end_date,
                r.status,
                e.name AS exam_name,
                e.exam_date
            FROM roadmaps r
            JOIN exams e
                ON e.workspace_id = r.workspace_id
                AND e.id = r.exam_id
            WHERE r.id = $1
                AND r.workspace_id = $2
            `,
            [roadmapId, req.user.workspace_id]
        );

        if (roadmapResult.rows.length === 0) {

            return res.status(404).json({
                status: "error",
                message: "Roadmap not found"
            });

        }

        const roadmap = roadmapResult.rows[0];

        // Get roadmap items
        const itemsResult = await pool.query(
            `
            SELECT
                id,
                workspace_id,
                roadmap_id,
                title,
                description,
                scheduled_date,
                estimated_minutes,
                sequence_number,
                status,
                created_at
            FROM roadmap_items
            WHERE workspace_id = $1
              AND roadmap_id = $2
            ORDER BY sequence_number
            `,
            [
                roadmap.workspace_id,
                roadmap.id
            ]
        );

        res.json({
            status: "success",
            data: {
                roadmap,
                items: itemsResult.rows
            }
        });

    } catch (error) {

        console.error(
            "ERROR FETCHING ROADMAP:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to fetch roadmap"
        });
    }
};


module.exports = {
    generateRoadmap,
    getStudentRoadmaps,
    getRoadmapById
};