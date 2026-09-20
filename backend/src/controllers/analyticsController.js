const pool = require("../config/db");

const getStudentAnalytics = async (req, res) => {
    try {
        const { studentId } = req.params;

        const studentResult = await pool.query(
            `
            SELECT
                id,
                registration_number,
                full_name,
                program,
                semester,
                section,
                workspace_id
            FROM students
            WHERE id = $1
            `,
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Student not found"
            });
        }

        const student = studentResult.rows[0];
        const workspaceId = student.workspace_id;

        const marksResult = await pool.query(
            `
            SELECT
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
            WHERE m.student_id = $1
              AND m.workspace_id = $2
            ORDER BY s.code, m.assessment_type
            `,
            [studentId, workspaceId]
        );

        const classStatsResult = await pool.query(
            `
            SELECT
                subject_id,
                AVG(marks_obtained / max_marks * 100) AS class_average,
                STDDEV_POP(marks_obtained / max_marks * 100) AS standard_deviation
            FROM marks
            WHERE workspace_id = $1
              AND assessment_type IN ('CAT1', 'CAT2')
            GROUP BY subject_id
            `,
            [workspaceId]
        );

        const percentileResult = await pool.query(
            `
            WITH student_averages AS (
                SELECT
                    student_id,
                    subject_id,
                    AVG(marks_obtained / max_marks * 100) AS cat_average
                FROM marks
                WHERE workspace_id = $1
                  AND assessment_type IN ('CAT1', 'CAT2')
                GROUP BY student_id, subject_id
            )
            SELECT
                subject_id,
                student_id,
                cat_average,
                PERCENT_RANK() OVER (
                    PARTITION BY subject_id
                    ORDER BY cat_average
                ) * 100 AS percentile
            FROM student_averages
            `,
            [workspaceId]
        );

        const classStats = {};

        classStatsResult.rows.forEach((row) => {
            classStats[row.subject_id] = {
                classAverage: Number(row.class_average || 0),
                standardDeviation: Number(
                    row.standard_deviation || 0
                )
            };
        });

        const percentileStats = {};

        percentileResult.rows.forEach((row) => {
            if (String(row.student_id) === String(studentId)) {
                percentileStats[row.subject_id] =
                    Number(row.percentile || 0);
            }
        });

        const subjects = {};

        marksResult.rows.forEach((mark) => {
            if (!subjects[mark.subject_id]) {
                subjects[mark.subject_id] = {
                    subjectId: mark.subject_id,
                    subjectCode: mark.subject_code,
                    subjectName: mark.subject_name,
                    marks: {}
                };
            }

            subjects[mark.subject_id].marks[
                mark.assessment_type
            ] = {
                obtained: Number(mark.marks_obtained),
                maximum: Number(mark.max_marks),
                percentage: Number(
                    (
                        (Number(mark.marks_obtained) /
                            Number(mark.max_marks)) *
                        100
                    ).toFixed(2)
                )
            };
        });

        const analytics = Object.values(subjects).map((subject) => {
            const catMarks = [];

            if (subject.marks.CAT1) {
                catMarks.push(
                    subject.marks.CAT1.percentage
                );
            }

            if (subject.marks.CAT2) {
                catMarks.push(
                    subject.marks.CAT2.percentage
                );
            }

            const catAverage =
                catMarks.length > 0
                    ? catMarks.reduce((a, b) => a + b, 0) /
                      catMarks.length
                    : 0;

            const stats = classStats[subject.subjectId] || {
                classAverage: 0,
                standardDeviation: 0
            };

            const performanceGap =
                catAverage - stats.classAverage;

            let trend = "STABLE";

            if (
                subject.marks.CAT1 &&
                subject.marks.CAT2
            ) {
                const cat1 =
                    subject.marks.CAT1.percentage;

                const cat2 =
                    subject.marks.CAT2.percentage;

                if (cat2 > cat1 + 5) {
                    trend = "IMPROVING";
                } else if (cat2 < cat1 - 5) {
                    trend = "DECLINING";
                }
            }

            return {
                subjectId: subject.subjectId,
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                marks: subject.marks,
                catAverage: Number(
                    catAverage.toFixed(2)
                ),
                classAverage: Number(
                    stats.classAverage.toFixed(2)
                ),
                standardDeviation: Number(
                    stats.standardDeviation.toFixed(2)
                ),
                performanceGap: Number(
                    performanceGap.toFixed(2)
                ),
                percentile: Number(
                    (percentileStats[subject.subjectId] || 0)
                        .toFixed(2)
                ),
                trend
            };
        });

        delete student.workspace_id;

        res.json({
            status: "success",
            student,
            subjects: analytics
        });

    } catch (error) {
        console.error(
            "Error calculating academic analytics:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to calculate academic analytics"
        });
    }
};

module.exports = {
    getStudentAnalytics
};