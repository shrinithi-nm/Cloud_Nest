const pool = require("../config/db");

const getStudentMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { user_id, workspace_id, role } = req.user;

        // Student can access only their own marks
        if (role === "student") {
            const studentCheck = await pool.query(
                `
                SELECT id
                FROM students
                WHERE id = $1
                  AND user_id = $2
                  AND workspace_id = $3
                `,
                [studentId, user_id, workspace_id]
            );

            if (studentCheck.rows.length === 0) {
                return res.status(403).json({
                    status: "error",
                    message: "You can only access your own marks"
                });
            }
        }

        // Admin can access students only within their workspace
        if (role === "admin") {
            const studentCheck = await pool.query(
                `
                SELECT id
                FROM students
                WHERE id = $1
                  AND workspace_id = $2
                `,
                [studentId, workspace_id]
            );

            if (studentCheck.rows.length === 0) {
                return res.status(403).json({
                    status: "error",
                    message: "Student does not belong to your workspace"
                });
            }
        }

        const result = await pool.query(
            `
            SELECT
                m.id,
                m.student_id,
                m.subject_id,
                s.code AS subject_code,
                s.name AS subject_name,
                m.assessment_type,
                m.marks_obtained,
                m.max_marks,
                m.assessment_date
            FROM marks m
            JOIN subjects s
                ON m.workspace_id = s.workspace_id
                AND m.subject_id = s.id
            WHERE m.workspace_id = $1
              AND m.student_id = $2
            ORDER BY s.code, m.assessment_type
            `,
            [workspace_id, studentId]
        );

        res.json({
            status: "success",
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Error fetching student marks:", error.message);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch student marks"
        });
    }
};

module.exports = {
    getStudentMarks
};