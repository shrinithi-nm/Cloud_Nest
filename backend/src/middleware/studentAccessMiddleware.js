const pool = require("../config/db");

const authorizeStudentAccess = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { user_id, workspace_id, role } = req.user;

        // This middleware is only for routes containing :studentId
        if (!studentId) {
            return res.status(400).json({
                status: "error",
                message: "Student ID is required"
            });
        }

        // Admin can access any student inside their own workspace
        if (role === "admin") {
            const result = await pool.query(
                `
                SELECT id
                FROM students
                WHERE id = $1
                  AND workspace_id = $2
                `,
                [studentId, workspace_id]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    status: "error",
                    message: "Student does not belong to your workspace"
                });
            }

            return next();
        }

        // Student can access only their own student record
        if (role === "student") {
            const result = await pool.query(
                `
                SELECT id
                FROM students
                WHERE id = $1
                  AND user_id = $2
                  AND workspace_id = $3
                `,
                [studentId, user_id, workspace_id]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    status: "error",
                    message: "You can only access your own student data"
                });
            }

            return next();
        }

        return res.status(403).json({
            status: "error",
            message: "Invalid user role"
        });

    } catch (error) {
        console.error(
            "Student authorization error:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to authorize student access"
        });
    }
};

module.exports = authorizeStudentAccess;