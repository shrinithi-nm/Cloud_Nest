const pool = require("../config/db");

const getStudentExams = async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await pool.query(
            `
            SELECT
                e.id,
                e.workspace_id,
                e.student_id,
                e.subject_id,
                s.code AS subject_code,
                s.name AS subject_name,
                e.name,
                e.exam_date,
                e.duration_minutes,
                e.syllabus,
                e.created_at,
                e.updated_at
            FROM exams e
            JOIN subjects s
                ON s.workspace_id = e.workspace_id
                AND s.id = e.subject_id
            WHERE e.id = $1
                AND e.workspace_id = $2
            ORDER BY e.exam_date ASC
            `,
            [studentId]
        );

        res.json({
            status: "success",
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error(
            "Error fetching student exams:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to fetch exams"
        });
    }
};

const getExamById = async (req, res) => {
    try {
        const { examId } = req.params;

        const result = await pool.query(
            `
            SELECT
                e.id,
                e.workspace_id,
                e.student_id,
                e.subject_id,
                s.code AS subject_code,
                s.name AS subject_name,
                e.name,
                e.exam_date,
                e.duration_minutes,
                e.syllabus,
                e.created_at,
                e.updated_at
            FROM exams e
            JOIN subjects s
                ON s.workspace_id = e.workspace_id
                AND s.id = e.subject_id
            WHERE e.id = $1
            `,
            [examId, req.user.workspace_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Exam not found"
            });
        }

        res.json({
            status: "success",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Error fetching exam:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to fetch exam"
        });
    }
};

const createExam = async (req, res) => {
    try {
        const {
            studentId,
            subjectId,
            name,
            examDate,
            durationMinutes,
            syllabus
        } = req.body;

        const workspaceId = req.user.workspace_id;

        if (
            !studentId ||
            !subjectId ||
            !name ||
            !examDate
        ) {
            return res.status(400).json({
                status: "error",
                message: "studentId, subjectId, name and examDate are required"
            });
        }

        // Verify student belongs to admin's workspace
        const studentResult = await pool.query(
            `
            SELECT id
            FROM students
            WHERE id = $1
              AND workspace_id = $2
            `,
            [studentId, workspaceId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "Student does not belong to your workspace"
            });
        }

        // Verify subject belongs to same workspace
        const subjectResult = await pool.query(
            `
            SELECT id
            FROM subjects
            WHERE id = $1
              AND workspace_id = $2
            `,
            [subjectId, workspaceId]
        );

        if (subjectResult.rows.length === 0) {
            return res.status(403).json({
                status: "error",
                message: "Subject does not belong to your workspace"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO exams (
                workspace_id,
                student_id,
                subject_id,
                name,
                exam_date,
                duration_minutes,
                syllabus
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [
                workspaceId,
                studentId,
                subjectId,
                name,
                examDate,
                durationMinutes || null,
                syllabus || null
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Exam created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Error creating exam:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to create exam"
        });
    }
};

module.exports = {
    getStudentExams,
    getExamById,
    createExam
};