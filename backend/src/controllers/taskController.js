const pool = require("../config/db");


// ============================================================
// GENERATE TASKS FROM ROADMAP
// ============================================================

const generateTasksFromRoadmap = async (req, res) => {
    const client = await pool.connect();

    try {
        const { roadmapId } = req.params;

        const workspaceId = req.user.workspace_id;

        // ----------------------------------------------------
        // Get roadmap + student + exam information
        // ----------------------------------------------------

        const roadmapResult = await client.query(
            `
            SELECT
                r.id,
                r.workspace_id,
                r.student_id,
                r.exam_id,
                e.subject_id,
                e.name AS exam_name,
                e.exam_date
            FROM roadmaps r
            JOIN exams e
                ON e.workspace_id = r.workspace_id
                AND e.id = r.exam_id
            WHERE r.id = $1
              AND r.workspace_id = $2
            `,
            [roadmapId, workspaceId]
        );

        if (roadmapResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Roadmap not found"
            });
        }

        const roadmap = roadmapResult.rows[0];

        // ----------------------------------------------------
        // Get roadmap items
        // ----------------------------------------------------

        const itemsResult = await client.query(
            `
            SELECT
                id,
                workspace_id,
                title,
                description,
                scheduled_date,
                estimated_minutes,
                sequence_number,
                status
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

        if (itemsResult.rows.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No roadmap items found"
            });
        }

        await client.query("BEGIN");

        const createdTasks = [];

        // ----------------------------------------------------
        // Create tasks
        // ----------------------------------------------------

        for (const item of itemsResult.rows) {

            // ------------------------------------------------
            // Prevent duplicate task creation
            // ------------------------------------------------

            const existingTask = await client.query(
                `
                SELECT id
                FROM tasks
                WHERE workspace_id = $1
                  AND roadmap_item_id = $2
                `,
                [
                    roadmap.workspace_id,
                    item.id
                ]
            );

            if (existingTask.rows.length > 0) {
                continue;
            }

            // ------------------------------------------------
            // Determine priority
            // ------------------------------------------------

            let priority = "MEDIUM";

            if (item.sequence_number <= 2) {
                priority = "HIGH";
            }

            // ------------------------------------------------
            // Determine difficulty
            // ------------------------------------------------

            let difficulty = "MEDIUM";

            if (item.estimated_minutes >= 90) {
                difficulty = "HARD";
            } else if (item.estimated_minutes <= 45) {
                difficulty = "EASY";
            }

            // ------------------------------------------------
            // Deadline = end of scheduled study day
            // ------------------------------------------------

            const deadline = new Date(item.scheduled_date);

            deadline.setHours(
                23,
                59,
                59,
                999
            );

            // ------------------------------------------------
            // Insert task
            // ------------------------------------------------

            const taskResult = await client.query(
                `
                INSERT INTO tasks (
                    workspace_id,
                    student_id,
                    subject_id,
                    roadmap_item_id,
                    title,
                    description,
                    deadline,
                    estimated_minutes,
                    priority,
                    difficulty,
                    status,
                    progress_percent,
                    progress
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    $12,
                    $13
                )
                RETURNING *
                `,
                [
                    roadmap.workspace_id,
                    roadmap.student_id,
                    roadmap.subject_id,
                    item.id,
                    item.title,
                    item.description,
                    deadline,
                    item.estimated_minutes,
                    priority,
                    difficulty,
                    "PENDING",
                    0,
                    0
                ]
            );

            createdTasks.push(
                taskResult.rows[0]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            status: "success",
            message: "Tasks generated from roadmap",
            count: createdTasks.length,
            data: createdTasks
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Error generating tasks:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to generate tasks"
        });

    } finally {
        client.release();
    }
};


// ============================================================
// GET STUDENT TASKS
// ============================================================

const getStudentTasks = async (req, res) => {

    try {

        const { studentId } = req.params;

        const workspaceId = req.user.workspace_id;

        const result = await pool.query(
            `
            SELECT
                t.id,
                t.workspace_id,
                t.student_id,
                t.subject_id,
                t.roadmap_item_id,
                t.title,
                t.description,
                t.deadline,
                t.estimated_minutes,
                t.priority,
                t.difficulty,
                t.status,
                t.progress_percent,
                t.created_at,
                t.updated_at
            FROM tasks t
            WHERE t.student_id = $1
              AND t.workspace_id = $2
            ORDER BY
                t.deadline ASC NULLS LAST,
                t.priority DESC
            `,
            [
                studentId,
                workspaceId
            ]
        );

        res.json({
            status: "success",
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error(
            "Error fetching student tasks:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to fetch tasks"
        });
    }
};


// ============================================================
// UPDATE TASK
// ============================================================

const updateTask = async (req, res) => {

    try {

        const { taskId } = req.params;

        const workspaceId = req.user.workspace_id;

        const {
            status,
            progress_percent
        } = req.body;

        // ----------------------------------------------------
        // Validate input
        // ----------------------------------------------------

        if (
            status === undefined &&
            progress_percent === undefined
        ) {

            return res.status(400).json({
                status: "error",
                message:
                    "Provide status or progress_percent"
            });
        }

        // ----------------------------------------------------
        // Validate status
        // ----------------------------------------------------

        const validStatuses = [
            "PENDING",
            "IN_PROGRESS",
            "COMPLETED",
            "SKIPPED"
        ];

        if (
            status !== undefined &&
            !validStatuses.includes(status)
        ) {

            return res.status(400).json({
                status: "error",
                message: "Invalid task status"
            });
        }

        // ----------------------------------------------------
        // Validate progress
        // ----------------------------------------------------

        if (
            progress_percent !== undefined &&
            (
                !Number.isInteger(progress_percent) ||
                progress_percent < 0 ||
                progress_percent > 100
            )
        ) {

            return res.status(400).json({
                status: "error",
                message:
                    "progress_percent must be an integer between 0 and 100"
            });
        }

        // ----------------------------------------------------
        // Build dynamic update query
        // ----------------------------------------------------

        const fields = [];
        const values = [];

        let parameterIndex = 1;

        if (status !== undefined) {

            fields.push(
                `status = $${parameterIndex}`
            );

            values.push(status);

            parameterIndex++;
        }

        if (progress_percent !== undefined) {

            fields.push(
                `progress_percent = $${parameterIndex}`
            );

            values.push(progress_percent);

            parameterIndex++;
        }

        // ----------------------------------------------------
        // Completed task = 100%
        // ----------------------------------------------------

        if (status === "COMPLETED") {

            fields.push(
                `progress_percent = 100`
            );
        }

        // ----------------------------------------------------
        // Add task ID + workspace ID
        // ----------------------------------------------------

        values.push(taskId);

        const taskIdParameter = parameterIndex;

        parameterIndex++;

        values.push(workspaceId);

        const workspaceParameter = parameterIndex;

        // ----------------------------------------------------
        // Update task
        // ----------------------------------------------------

        const result = await pool.query(
            `
            UPDATE tasks
            SET
                ${fields.join(", ")},
                updated_at = NOW()
            WHERE id = $${taskIdParameter}
              AND workspace_id = $${workspaceParameter}
            RETURNING
                id,
                workspace_id,
                student_id,
                subject_id,
                roadmap_item_id,
                title,
                description,
                deadline,
                estimated_minutes,
                priority,
                difficulty,
                status,
                progress_percent,
                created_at,
                updated_at
            `,
            values
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                status: "error",
                message: "Task not found"
            });
        }

        res.json({
            status: "success",
            message: "Task updated successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Error updating task:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to update task"
        });
    }
};


// ============================================================
// ADAPTIVE TASK ENGINE
// ============================================================

const getAdaptiveTasks = async (req, res) => {

    try {

        const { studentId } = req.params;

        const workspaceId = req.user.workspace_id;

        const result = await pool.query(
            `
            SELECT
                t.id,
                t.title,
                t.description,
                t.subject_id,
                t.deadline,
                t.estimated_minutes,
                t.priority,
                t.difficulty,
                t.status,
                t.progress_percent,
                s.name AS subject_name
            FROM tasks t
            LEFT JOIN subjects s
                ON s.workspace_id = t.workspace_id
                AND s.id = t.subject_id
            WHERE t.student_id = $1
              AND t.workspace_id = $2
              AND t.status IN ('PENDING', 'IN_PROGRESS')
            `,
            [
                studentId,
                workspaceId
            ]
        );

        const now = new Date();

        let totalRemainingMinutes = 0;
        let overdueCount = 0;
        let urgentCount = 0;
        let highPriorityCount = 0;

        const adaptiveTasks =
            result.rows.map((task) => {

                const progress =
                    Number(
                        task.progress_percent || 0
                    );

                const estimatedMinutes =
                    Number(
                        task.estimated_minutes || 0
                    );

                const remainingMinutes =
                    Math.ceil(
                        estimatedMinutes *
                        (1 - progress / 100)
                    );

                totalRemainingMinutes +=
                    remainingMinutes;

                let score = 0;
                const reasons = [];

                // --------------------------------
                // 1. PRIORITY
                // --------------------------------

                switch (task.priority) {

                    case "URGENT":

                        score += 40;

                        urgentCount++;

                        reasons.push(
                            "urgent priority"
                        );

                        break;

                    case "HIGH":

                        score += 30;

                        highPriorityCount++;

                        reasons.push(
                            "high priority"
                        );

                        break;

                    case "MEDIUM":

                        score += 20;

                        break;

                    case "LOW":

                        score += 10;

                        break;
                }

                // --------------------------------
                // 2. DEADLINE PRESSURE
                // --------------------------------

                let hoursUntilDeadline = null;
                let overdue = false;

                if (task.deadline) {

                    const deadline =
                        new Date(task.deadline);

                    hoursUntilDeadline =
                        (
                            deadline - now
                        ) /
                        (1000 * 60 * 60);

                    if (
                        hoursUntilDeadline < 0
                    ) {

                        overdue = true;

                        score += 50;

                        overdueCount++;

                        reasons.push(
                            "overdue"
                        );

                    } else if (
                        hoursUntilDeadline <= 24
                    ) {

                        score += 35;

                        reasons.push(
                            "deadline within 24 hours"
                        );

                    } else if (
                        hoursUntilDeadline <= 48
                    ) {

                        score += 25;

                        reasons.push(
                            "deadline within 48 hours"
                        );

                    } else if (
                        hoursUntilDeadline <= 72
                    ) {

                        score += 15;

                        reasons.push(
                            "deadline within 3 days"
                        );
                    }
                }

                // --------------------------------
                // 3. PROGRESS
                // --------------------------------

                if (
                    progress > 0 &&
                    progress < 100
                ) {

                    score += 5;

                    reasons.push(
                        "partially completed"
                    );
                }

                // --------------------------------
                // 4. DIFFICULTY
                // --------------------------------

                if (
                    task.difficulty === "HARD"
                ) {

                    score += 10;

                    reasons.push(
                        "hard task"
                    );

                } else if (
                    task.difficulty === "MEDIUM"
                ) {

                    score += 5;
                }

                // --------------------------------
                // 5. LONG TASK
                // --------------------------------

                if (
                    remainingMinutes >= 90
                ) {

                    score += 5;

                    reasons.push(
                        "large workload"
                    );
                }

                // --------------------------------
                // 6. RECOMMENDATION
                // --------------------------------

                let recommendation =
                    "Complete after higher-priority tasks.";

                if (score >= 90) {

                    recommendation =
                        "Do this task next.";

                } else if (score >= 70) {

                    recommendation =
                        "Complete this task soon.";

                } else if (score >= 50) {

                    recommendation =
                        "Schedule this task today.";
                }

                return {

                    ...task,

                    remaining_minutes:
                        remainingMinutes,

                    hours_until_deadline:
                        hoursUntilDeadline === null
                            ? null
                            : Number(
                                hoursUntilDeadline
                                    .toFixed(1)
                            ),

                    overdue,

                    adaptive_score:
                        score,

                    recommendation,

                    reasons
                };
            });

        // --------------------------------
        // SORT
        // --------------------------------

        adaptiveTasks.sort(
            (a, b) =>
                b.adaptive_score -
                a.adaptive_score
        );

        // --------------------------------
        // WORKLOAD
        // --------------------------------

        let workloadLevel = "LOW";

        if (
            totalRemainingMinutes > 360
        ) {

            workloadLevel = "HIGH";

        } else if (
            totalRemainingMinutes > 180
        ) {

            workloadLevel = "MEDIUM";
        }

        // --------------------------------
        // OVERALL RECOMMENDATION
        // --------------------------------

        let recommendation;

        if (overdueCount > 0) {

            recommendation =
                `You have ${overdueCount} overdue task(s). Prioritize them before lower-priority work.`;

        } else if (
            workloadLevel === "HIGH"
        ) {

            recommendation =
                "Heavy workload detected. Focus on urgent and deadline-sensitive tasks first.";

        } else if (
            workloadLevel === "MEDIUM"
        ) {

            recommendation =
                "Moderate workload detected. Start with the highest adaptive-score tasks.";

        } else {

            recommendation =
                "Your current workload is manageable.";
        }

        res.json({

            status: "success",

            summary: {

                workload_level:
                    workloadLevel,

                total_tasks:
                    adaptiveTasks.length,

                total_remaining_minutes:
                    totalRemainingMinutes,

                total_remaining_hours:
                    Number(
                        (
                            totalRemainingMinutes / 60
                        ).toFixed(2)
                    ),

                overdue_tasks:
                    overdueCount,

                urgent_tasks:
                    urgentCount,

                high_priority_tasks:
                    highPriorityCount
            },

            recommendation,

            tasks:
                adaptiveTasks
        });

    } catch (error) {

        console.error(
            "Error running adaptive task engine:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to analyze adaptive workload"
        });
    }
};


// ============================================================
// WEAK SUBJECT INTELLIGENCE
// ============================================================

const getWeakSubjectScores = async (
    studentId,
    workspaceId
) => {

    const result = await pool.query(
        `
        WITH student_subject_stats AS (
            SELECT
                m.student_id,
                m.subject_id,
                AVG(
                    m.marks_obtained /
                    NULLIF(m.max_marks, 0) * 100
                ) AS cat_average
            FROM marks m
            WHERE m.workspace_id = $1
              AND m.assessment_type IN ('CAT1', 'CAT2')
            GROUP BY
                m.student_id,
                m.subject_id
        ),

        class_subject_stats AS (
            SELECT
                subject_id,
                AVG(
                    marks_obtained /
                    NULLIF(max_marks, 0) * 100
                ) AS class_average,
                COUNT(DISTINCT student_id) AS student_count
            FROM marks
            WHERE workspace_id = $1
              AND assessment_type IN ('CAT1', 'CAT2')
            GROUP BY subject_id
        ),

        percentile_stats AS (
            SELECT
                student_id,
                subject_id,
                PERCENT_RANK() OVER (
                    PARTITION BY subject_id
                    ORDER BY cat_average
                ) * 100 AS percentile
            FROM student_subject_stats
        )

        SELECT
            s.id AS subject_id,
            s.name AS subject_name,

            ss.cat_average,
            cs.class_average,
            cs.student_count,

            CASE
                WHEN ss.cat_average IS NOT NULL
                     AND cs.class_average IS NOT NULL
                THEN ss.cat_average - cs.class_average
                ELSE NULL
            END AS performance_gap,

            CASE
                WHEN cs.student_count >= 2
                THEN ps.percentile
                ELSE NULL
            END AS percentile

        FROM subjects s

        LEFT JOIN student_subject_stats ss
            ON ss.subject_id = s.id
            AND ss.student_id = $2

        LEFT JOIN class_subject_stats cs
            ON cs.subject_id = s.id

        LEFT JOIN percentile_stats ps
            ON ps.subject_id = s.id
            AND ps.student_id = $2

        WHERE s.workspace_id = $1
        `,
        [
            workspaceId,
            studentId
        ]
    );

    const weakSubjects = {};

    result.rows.forEach((row) => {

        // No marks = don't classify as weak
        if (row.cat_average === null) {
            return;
        }

        const performanceGap = Number(
            row.performance_gap || 0
        );

        const percentile =
            row.percentile !== null
                ? Number(row.percentile)
                : null;

        const studentCount = Number(
            row.student_count || 0
        );

        let weakScore = 0;
        let weaknessLevel = "NORMAL";

        /*
         * Percentile is only trusted when there are
         * at least 2 students in the subject.
         */

        const strongWeakness =
            performanceGap <= -10 ||
            (
                studentCount >= 2 &&
                percentile < 25
            );

        const moderateWeakness =
            performanceGap < 0 ||
            (
                studentCount >= 2 &&
                percentile < 50
            );

        if (strongWeakness) {

            weakScore = 20;
            weaknessLevel = "STRONG";

        } else if (moderateWeakness) {

            weakScore = 10;
            weaknessLevel = "MODERATE";
        }

        weakSubjects[row.subject_id] = {

            subjectName:
                row.subject_name,

            performanceGap:
                Number(
                    performanceGap.toFixed(2)
                ),

            percentile:
                percentile !== null
                    ? Number(
                        percentile.toFixed(2)
                    )
                    : null,

            studentCount,

            weakScore,

            weaknessLevel
        };
    });

    return weakSubjects;
};


// ============================================================
// OPTIMIZE MY DAY
// ============================================================

const optimizeMyDay = async (req, res) => {

    try {

        const { studentId } = req.params;

        const workspaceId = req.user.workspace_id;

        // ----------------------------------------------------
        // Verify student belongs to authenticated workspace
        // ----------------------------------------------------

        const studentResult = await pool.query(
            `
            SELECT
                id,
                workspace_id
            FROM students
            WHERE id = $1
              AND workspace_id = $2
            `,
            [
                studentId,
                workspaceId
            ]
        );

        if (
            studentResult.rows.length === 0
        ) {

            return res.status(404).json({
                status: "error",
                message: "Student not found"
            });
        }

        // ----------------------------------------------------
        // Get weak-subject intelligence
        // ----------------------------------------------------

        const weakSubjects =
            await getWeakSubjectScores(
                studentId,
                workspaceId
            );

        // ----------------------------------------------------
        // Get active tasks + subject + nearest upcoming exam
        // ----------------------------------------------------

        const result = await pool.query(
            `
            SELECT
                t.id,
                t.title,
                t.description,
                t.subject_id,
                t.deadline,
                t.estimated_minutes,
                t.priority,
                t.difficulty,
                t.status,
                t.progress_percent,

                s.name AS subject_name,

                exam_info.exam_id,
                exam_info.exam_name,
                exam_info.exam_date

            FROM tasks t

            LEFT JOIN subjects s
                ON s.workspace_id = t.workspace_id
                AND s.id = t.subject_id

            LEFT JOIN LATERAL (

                SELECT
                    e.id AS exam_id,
                    e.name AS exam_name,
                    e.exam_date

                FROM exams e

                WHERE e.workspace_id = t.workspace_id
                  AND e.subject_id = t.subject_id
                  AND e.exam_date >= NOW()

                ORDER BY e.exam_date ASC

                LIMIT 1

            ) exam_info
                ON TRUE

            WHERE t.student_id = $1
              AND t.workspace_id = $2
              AND t.status IN (
                  'PENDING',
                  'IN_PROGRESS'
              )

            ORDER BY t.id
            `,
            [
                studentId,
                workspaceId
            ]
        );

        const now = new Date();

        const optimizedTasks =
            result.rows.map((task) => {

                const progress =
                    Number(
                        task.progress_percent || 0
                    );

                const estimatedMinutes =
                    Number(
                        task.estimated_minutes || 0
                    );

                const remainingMinutes =
                    Math.ceil(
                        estimatedMinutes *
                        (1 - progress / 100)
                    );

                let score = 0;

                const reasons = [];

                // ==========================================
                // 1. PRIORITY
                // ==========================================

                if (
                    task.priority === "URGENT"
                ) {

                    score += 40;

                    reasons.push(
                        "urgent priority"
                    );

                } else if (
                    task.priority === "HIGH"
                ) {

                    score += 30;

                    reasons.push(
                        "high priority"
                    );

                } else if (
                    task.priority === "MEDIUM"
                ) {

                    score += 20;

                } else {

                    score += 10;
                }

                // ==========================================
                // 2. DEADLINE PRESSURE
                // ==========================================

                let hoursUntilDeadline = null;

                let overdue = false;

                if (task.deadline) {

                    const deadline =
                        new Date(task.deadline);

                    hoursUntilDeadline =
                        (
                            deadline - now
                        ) /
                        (1000 * 60 * 60);

                    if (
                        hoursUntilDeadline < 0
                    ) {

                        overdue = true;

                        score += 60;

                        reasons.push(
                            "overdue"
                        );

                    } else if (
                        hoursUntilDeadline <= 12
                    ) {

                        score += 50;

                        reasons.push(
                            "deadline within 12 hours"
                        );

                    } else if (
                        hoursUntilDeadline <= 24
                    ) {

                        score += 40;

                        reasons.push(
                            "deadline within 24 hours"
                        );

                    } else if (
                        hoursUntilDeadline <= 48
                    ) {

                        score += 30;

                        reasons.push(
                            "deadline within 48 hours"
                        );

                    } else if (
                        hoursUntilDeadline <= 72
                    ) {

                        score += 20;

                        reasons.push(
                            "deadline within 3 days"
                        );

                    } else if (
                        hoursUntilDeadline <= 168
                    ) {

                        score += 10;

                        reasons.push(
                            "deadline within 7 days"
                        );
                    }
                }

                // ==========================================
                // 3. EXAM PROXIMITY
                // ==========================================

                let hoursUntilExam = null;

                if (task.exam_date) {

                    const examDate =
                        new Date(task.exam_date);

                    hoursUntilExam =
                        (
                            examDate - now
                        ) /
                        (1000 * 60 * 60);

                    if (
                        hoursUntilExam <= 24 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 50;

                        reasons.push(
                            `${task.exam_name} is within 24 hours`
                        );

                    } else if (
                        hoursUntilExam <= 72 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 45;

                        reasons.push(
                            `${task.exam_name} is within 3 days`
                        );

                    } else if (
                        hoursUntilExam <= 168 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 35;

                        reasons.push(
                            `${task.exam_name} is within 7 days`
                        );

                    } else if (
                        hoursUntilExam <= 336 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 25;

                        reasons.push(
                            `${task.exam_name} is within 14 days`
                        );

                    } else if (
                        hoursUntilExam <= 504 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 15;

                        reasons.push(
                            `${task.exam_name} is within 21 days`
                        );

                    } else if (
                        hoursUntilExam <= 720 &&
                        hoursUntilExam >= 0
                    ) {

                        score += 10;

                        reasons.push(
                            `${task.exam_name} is within 30 days`
                        );
                    }
                }

                // ==========================================
                // 4. WEAK SUBJECT INTELLIGENCE
                // ==========================================

                const subjectWeakness =
                    weakSubjects[
                        task.subject_id
                    ];

                if (
                    subjectWeakness &&
                    subjectWeakness.weakScore > 0
                ) {

                    score +=
                        subjectWeakness.weakScore;

                    if (
                        subjectWeakness.weaknessLevel ===
                        "STRONG"
                    ) {

                        reasons.push(
                            `${subjectWeakness.subjectName} is currently one of your weaker subjects`
                        );

                    } else {

                        reasons.push(
                            `${subjectWeakness.subjectName} is currently below your class performance`
                        );
                    }
                }

                // ==========================================
                // 5. DIFFICULTY
                // ==========================================

                if (
                    task.difficulty === "HARD"
                ) {

                    score += 10;

                    reasons.push(
                        "hard task"
                    );

                } else if (
                    task.difficulty === "MEDIUM"
                ) {

                    score += 5;
                }

                // ==========================================
                // 6. PARTIAL PROGRESS
                // ==========================================

                if (
                    progress > 0 &&
                    progress < 100
                ) {

                    score += 8;

                    reasons.push(
                        "partially completed"
                    );
                }

                // ==========================================
                // 7. LONG TASK
                // ==========================================

                if (
                    remainingMinutes >= 90
                ) {

                    score += 5;

                    reasons.push(
                        "large remaining workload"
                    );
                }

                // ==========================================
                // RETURN CALCULATED TASK
                // ==========================================

                return {

                    ...task,

                    remaining_minutes:
                        remainingMinutes,

                    hours_until_deadline:
                        hoursUntilDeadline === null
                            ? null
                            : Number(
                                hoursUntilDeadline
                                    .toFixed(1)
                            ),

                    hours_until_exam:
                        hoursUntilExam === null
                            ? null
                            : Number(
                                hoursUntilExam
                                    .toFixed(1)
                            ),

                    weak_subject:
                        subjectWeakness
                            ? {
                                level:
                                    subjectWeakness.weaknessLevel,

                                performance_gap:
                                    subjectWeakness.performanceGap,

                                percentile:
                                    subjectWeakness.percentile,

                                score:
                                    subjectWeakness.weakScore
                            }
                            : null,

                    overdue,

                    optimization_score:
                        score,

                    reasons
                };
            });

        // ==========================================
        // SORT BY OPTIMIZATION SCORE
        // ==========================================

        optimizedTasks.sort(
            (a, b) =>
                b.optimization_score -
                a.optimization_score
        );

        // ==========================================
        // CREATE FINAL PLAN
        // ==========================================

        const plan =
            optimizedTasks.map(
                (task, index) => {

                    let action = "Do later";

                    if (index === 0) {

                        action = "Do first";

                    } else if (index === 1) {

                        action = "Do second";

                    } else if (index === 2) {

                        action = "Do third";
                    }

                    return {

                        order:
                            index + 1,

                        task_id:
                            task.id,

                        title:
                            task.title,

                        subject:
                            task.subject_name,

                        remaining_minutes:
                            task.remaining_minutes,

                        priority:
                            task.priority,

                        difficulty:
                            task.difficulty,

                        deadline:
                            task.deadline,

                        exam:
                            task.exam_name || null,

                        exam_date:
                            task.exam_date || null,

                        hours_until_exam:
                            task.hours_until_exam,

                        weak_subject:
                            task.weak_subject,

                        action,

                        reasons:
                            task.reasons,

                        score:
                            task.optimization_score
                    };
                }
            );

        // ==========================================
        // TOTAL WORKLOAD
        // ==========================================

        const totalMinutes =
            plan.reduce(
                (sum, task) =>
                    sum + task.remaining_minutes,
                0
            );

        let workloadLevel = "LOW";

        if (
            totalMinutes > 360
        ) {

            workloadLevel = "HIGH";

        } else if (
            totalMinutes > 180
        ) {

            workloadLevel = "MEDIUM";
        }

        // ==========================================
        // WORKLOAD MESSAGE
        // ==========================================

        let message =
            "Your schedule is manageable.";

        if (
            workloadLevel === "MEDIUM"
        ) {

            message =
                "You have a moderate workload. Follow the recommended order to reduce deadline, exam, and academic-performance pressure.";
        }

        if (
            workloadLevel === "HIGH"
        ) {

            message =
                "Your workload is heavy. Complete urgent, deadline-sensitive, and academically important tasks first and consider moving lower-priority work.";
        }

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        res.json({

            status: "success",

            plan: {

                workload_level:
                    workloadLevel,

                total_tasks:
                    plan.length,

                total_remaining_minutes:
                    totalMinutes,

                total_remaining_hours:
                    Number(
                        (
                            totalMinutes / 60
                        ).toFixed(2)
                    ),

                message
            },

            optimized_tasks:
                plan
        });

    } catch (error) {

        console.error(
            "Error optimizing day:",
            error.message
        );

        res.status(500).json({

            status: "error",

            message:
                "Failed to optimize daily tasks"
        });
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    generateTasksFromRoadmap,

    getStudentTasks,

    updateTask,

    getAdaptiveTasks,

    optimizeMyDay
};