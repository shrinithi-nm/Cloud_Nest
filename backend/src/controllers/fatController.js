const pool = require("../config/db");

const getStudentAndConfig = async (studentId, subjectId) => {
    const result = await pool.query(
        `
        SELECT
            st.id AS student_id,
            st.workspace_id,
            s.id AS subject_id,
            gc.cat1_weight,
            gc.cat2_weight,
            gc.assignment_weight,
            gc.fat_weight
        FROM students st
        JOIN subjects s
            ON s.workspace_id = st.workspace_id
            AND s.id = $2
        JOIN grading_configs gc
            ON gc.workspace_id = st.workspace_id
        WHERE st.id = $1
        `,
        [studentId, subjectId]
    );

    return result.rows[0];
};


const getCatMarks = async (studentId, subjectId) => {
    const result = await pool.query(
        `
        SELECT
            assessment_type,
            marks_obtained,
            max_marks
        FROM marks
        WHERE student_id = $1
          AND subject_id = $2
          AND assessment_type IN ('CAT1', 'CAT2')
        ORDER BY assessment_type
        `,
        [studentId, subjectId]
    );

    return result.rows;
};


const getAssignmentMarks = async (
    studentId,
    subjectId,
    workspaceId
) => {
    const result = await pool.query(
        `
        SELECT
            assignment_number,
            marks_obtained,
            max_marks
        FROM assignments
        WHERE workspace_id = $1
          AND student_id = $2
          AND subject_id = $3
        ORDER BY assignment_number
        `,
        [workspaceId, studentId, subjectId]
    );

    return result.rows;
};


const calculateAssignmentContribution = (
    assignmentRows,
    assignmentWeight
) => {
    if (assignmentRows.length === 0) {
        return null;
    }

    const totalObtained = assignmentRows.reduce(
        (sum, row) => sum + Number(row.marks_obtained),
        0
    );

    const totalMaximum = assignmentRows.reduce(
        (sum, row) => sum + Number(row.max_marks),
        0
    );

    const percentage =
        totalMaximum > 0
            ? (totalObtained / totalMaximum) * 100
            : 0;

    const contribution =
        percentage * (assignmentWeight / 100);

    return {
        totalObtained,
        totalMaximum,
        percentage,
        contribution
    };
};


const buildMarksObject = (catRows) => {
    const marks = {};

    catRows.forEach((row) => {
        marks[row.assessment_type] = {
            obtained: Number(row.marks_obtained),
            maximum: Number(row.max_marks)
        };
    });

    return marks;
};


const calculateFatTarget = async (req, res) => {
    try {
        const { studentId, subjectId } = req.params;

        const targetTotal = Number(req.query.target || 80);

        if (
            Number.isNaN(targetTotal) ||
            targetTotal < 0 ||
            targetTotal > 100
        ) {
            return res.status(400).json({
                status: "error",
                message: "Target must be between 0 and 100"
            });
        }

        const studentConfig = await getStudentAndConfig(
            studentId,
            subjectId
        );

        if (!studentConfig) {
            return res.status(404).json({
                status: "error",
                message:
                    "Student, subject, or grading configuration not found"
            });
        }

        const catRows = await getCatMarks(
            studentId,
            subjectId
        );

        if (catRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No CAT marks found"
            });
        }

        const assignmentRows = await getAssignmentMarks(
            studentId,
            subjectId,
            studentConfig.workspace_id
        );

        if (assignmentRows.length !== 3) {
            return res.status(400).json({
                status: "error",
                message:
                    "All 3 assignment marks are required before calculating the FAT target",
                assignmentsFound: assignmentRows.length
            });
        }

        const marks = buildMarksObject(catRows);

        const cat1Percentage = marks.CAT1
            ? (marks.CAT1.obtained / marks.CAT1.maximum) * 100
            : 0;

        const cat2Percentage = marks.CAT2
            ? (marks.CAT2.obtained / marks.CAT2.maximum) * 100
            : 0;

        const weights = {
            CAT1: Number(studentConfig.cat1_weight),
            CAT2: Number(studentConfig.cat2_weight),
            ASSIGNMENT: Number(studentConfig.assignment_weight),
            FAT: Number(studentConfig.fat_weight)
        };

        const cat1Contribution =
            cat1Percentage * (weights.CAT1 / 100);

        const cat2Contribution =
            cat2Percentage * (weights.CAT2 / 100);

        const assignmentCalculation =
            calculateAssignmentContribution(
                assignmentRows,
                weights.ASSIGNMENT
            );

        const assignmentContribution =
            assignmentCalculation.contribution;

        const currentWeightedScore =
            cat1Contribution +
            cat2Contribution +
            assignmentContribution;

        const maximumPossibleScore =
            currentWeightedScore + weights.FAT;

        let requiredFat = 0;

        if (currentWeightedScore >= targetTotal) {
            requiredFat = 0;
        } else {
            requiredFat =
                ((targetTotal - currentWeightedScore) /
                    weights.FAT) *
                100;
        }

        const targetAchievable =
            targetTotal <= maximumPossibleScore;

        const minimumFat = targetAchievable
            ? Math.max(0, Math.min(100, requiredFat))
            : null;

        const recommendedFat =
            minimumFat === null
                ? null
                : Math.min(
                      100,
                      Math.ceil(minimumFat + 5)
                  );

        let riskStatus = "ON_TRACK";

        if (!targetAchievable) {
            riskStatus = "TARGET_UNACHIEVABLE";
        } else if (minimumFat > 90) {
            riskStatus = "HIGH_RISK";
        } else if (minimumFat > 75) {
            riskStatus = "AT_RISK";
        }

        res.json({
            status: "success",

            studentId,
            subjectId,
            targetTotal,

            currentPerformance: {
                CAT1: Number(cat1Percentage.toFixed(2)),
                CAT2: Number(cat2Percentage.toFixed(2)),

                assignments: {
                    A1: Number(
                        assignmentRows[0].marks_obtained
                    ),
                    A2: Number(
                        assignmentRows[1].marks_obtained
                    ),
                    A3: Number(
                        assignmentRows[2].marks_obtained
                    ),
                    total: Number(
                        assignmentCalculation.totalObtained.toFixed(2)
                    ),
                    maximum: Number(
                        assignmentCalculation.totalMaximum.toFixed(2)
                    ),
                    percentage: Number(
                        assignmentCalculation.percentage.toFixed(2)
                    )
                },

                catAverage: Number(
                    (
                        (cat1Percentage + cat2Percentage) /
                        2
                    ).toFixed(2)
                )
            },

            calculation: {
                weights,

                CAT1Contribution: Number(
                    cat1Contribution.toFixed(2)
                ),

                CAT2Contribution: Number(
                    cat2Contribution.toFixed(2)
                ),

                assignmentContribution: Number(
                    assignmentContribution.toFixed(2)
                ),

                currentWeightedScore: Number(
                    currentWeightedScore.toFixed(2)
                ),

                maximumPossibleScore: Number(
                    maximumPossibleScore.toFixed(2)
                ),

                requiredFat:
                    minimumFat === null
                        ? null
                        : Number(minimumFat.toFixed(2)),

                recommendedFat
            },

            targetAchievable,
            riskStatus
        });

    } catch (error) {
        console.error(
            "Error calculating FAT target:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to calculate FAT target"
        });
    }
};


const calculateWhatIfFat = async (req, res) => {
    try {
        const { studentId, subjectId } = req.params;

        const fatScore = Number(req.query.fat);
        const targetTotal = Number(req.query.target || 80);

        if (
            Number.isNaN(fatScore) ||
            fatScore < 0 ||
            fatScore > 100
        ) {
            return res.status(400).json({
                status: "error",
                message: "FAT score must be between 0 and 100"
            });
        }

        if (
            Number.isNaN(targetTotal) ||
            targetTotal < 0 ||
            targetTotal > 100
        ) {
            return res.status(400).json({
                status: "error",
                message: "Target must be between 0 and 100"
            });
        }

        const studentConfig = await getStudentAndConfig(
            studentId,
            subjectId
        );

        if (!studentConfig) {
            return res.status(404).json({
                status: "error",
                message:
                    "Student, subject, or grading configuration not found"
            });
        }

        const catRows = await getCatMarks(
            studentId,
            subjectId
        );

        if (catRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No CAT marks found"
            });
        }

        const assignmentRows = await getAssignmentMarks(
            studentId,
            subjectId,
            studentConfig.workspace_id
        );

        if (assignmentRows.length !== 3) {
            return res.status(400).json({
                status: "error",
                message:
                    "All 3 assignment marks are required for the what-if calculation",
                assignmentsFound: assignmentRows.length
            });
        }

        const marks = buildMarksObject(catRows);

        const cat1Percentage = marks.CAT1
            ? (marks.CAT1.obtained / marks.CAT1.maximum) * 100
            : 0;

        const cat2Percentage = marks.CAT2
            ? (marks.CAT2.obtained / marks.CAT2.maximum) * 100
            : 0;

        const weights = {
            CAT1: Number(studentConfig.cat1_weight),
            CAT2: Number(studentConfig.cat2_weight),
            ASSIGNMENT: Number(studentConfig.assignment_weight),
            FAT: Number(studentConfig.fat_weight)
        };

        const cat1Contribution =
            cat1Percentage * (weights.CAT1 / 100);

        const cat2Contribution =
            cat2Percentage * (weights.CAT2 / 100);

        const assignmentCalculation =
            calculateAssignmentContribution(
                assignmentRows,
                weights.ASSIGNMENT
            );

        const assignmentContribution =
            assignmentCalculation.contribution;

        const catAndAssignmentContribution =
            cat1Contribution +
            cat2Contribution +
            assignmentContribution;

        const fatContribution =
            fatScore * (weights.FAT / 100);

        const projectedTotal =
            catAndAssignmentContribution +
            fatContribution;

        const difference =
            projectedTotal - targetTotal;

        const targetAchieved =
            projectedTotal >= targetTotal;

        res.json({
            status: "success",

            studentId,
            subjectId,

            targetTotal,
            fatScore,

            calculation: {
                weights,

                CAT1Contribution: Number(
                    cat1Contribution.toFixed(2)
                ),

                CAT2Contribution: Number(
                    cat2Contribution.toFixed(2)
                ),

                assignmentContribution: Number(
                    assignmentContribution.toFixed(2)
                ),

                FATContribution: Number(
                    fatContribution.toFixed(2)
                ),

                projectedTotal: Number(
                    projectedTotal.toFixed(2)
                ),

                difference: Number(
                    difference.toFixed(2)
                )
            },

            targetAchieved,

            statusMessage: targetAchieved
                ? "TARGET_ACHIEVED"
                : "TARGET_NOT_ACHIEVED"
        });

    } catch (error) {
        console.error(
            "Error calculating FAT what-if:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to calculate FAT what-if"
        });
    }
};


module.exports = {
    calculateFatTarget,
    calculateWhatIfFat
};