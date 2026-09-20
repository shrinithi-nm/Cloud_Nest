-- ============================================================
-- CloudNest
-- Intelligent Multi-Tenant Student Cloud Workspace
-- PostgreSQL Schema
-- ============================================================

BEGIN;

-- ============================================================
-- 1. WORKSPACES
-- ============================================================

CREATE TABLE workspaces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT workspaces_code_unique
        UNIQUE (code),

    CONSTRAINT workspaces_name_check
        CHECK (length(trim(name)) > 0),

    CONSTRAINT workspaces_code_check
        CHECK (length(trim(code)) > 0),

    CONSTRAINT workspaces_id_unique
        UNIQUE (id)
);


-- ============================================================
-- 2. USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'student',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT users_workspace_email_unique
        UNIQUE (workspace_id, email),

    CONSTRAINT users_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT users_role_check
        CHECK (
            role IN (
                'student',
                'admin'
            )
        ),

    CONSTRAINT users_email_check
        CHECK (length(trim(email)) > 0),

    CONSTRAINT users_password_hash_check
        CHECK (length(password_hash) > 0)
);


-- ============================================================
-- 3. STUDENTS
-- ============================================================

CREATE TABLE students (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    registration_number VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,

    program VARCHAR(100) NOT NULL,
    semester SMALLINT NOT NULL,
    section VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT students_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Ensures the user belongs to the same workspace
    CONSTRAINT students_workspace_user_fk
        FOREIGN KEY (workspace_id, user_id)
        REFERENCES users(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT students_workspace_user_unique
        UNIQUE (workspace_id, user_id),

    CONSTRAINT students_workspace_registration_unique
        UNIQUE (workspace_id, registration_number),

    CONSTRAINT students_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT students_name_check
        CHECK (length(trim(full_name)) > 0),

    CONSTRAINT students_program_check
        CHECK (length(trim(program)) > 0),

    CONSTRAINT students_semester_check
        CHECK (semester BETWEEN 1 AND 8)
);


-- ============================================================
-- 4. SUBJECTS
-- ============================================================

CREATE TABLE subjects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,

    credits NUMERIC(3,1) NOT NULL,
    semester SMALLINT NOT NULL,

    department VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT subjects_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT subjects_workspace_code_unique
        UNIQUE (workspace_id, code),

    CONSTRAINT subjects_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT subjects_code_check
        CHECK (length(trim(code)) > 0),

    CONSTRAINT subjects_name_check
        CHECK (length(trim(name)) > 0),

    CONSTRAINT subjects_credits_check
        CHECK (
            credits > 0
            AND credits <= 10
        ),

    CONSTRAINT subjects_semester_check
        CHECK (semester BETWEEN 1 AND 8)
);


-- ============================================================
-- 5. MARKS
-- ============================================================

CREATE TABLE marks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    student_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,

    assessment_type VARCHAR(20) NOT NULL,

    marks_obtained NUMERIC(6,2) NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL,

    assessment_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT marks_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Student must belong to same workspace
    CONSTRAINT marks_workspace_student_fk
        FOREIGN KEY (workspace_id, student_id)
        REFERENCES students(workspace_id, id)
        ON DELETE CASCADE,

    -- Subject must belong to same workspace
    CONSTRAINT marks_workspace_subject_fk
        FOREIGN KEY (workspace_id, subject_id)
        REFERENCES subjects(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT marks_unique_assessment
        UNIQUE (
            workspace_id,
            student_id,
            subject_id,
            assessment_type
        ),

    CONSTRAINT marks_assessment_type_check
        CHECK (
            assessment_type IN (
                'CAT1',
                'CAT2',
                'FAT',
                'INTERNAL',
                'ASSIGNMENT',
                'QUIZ'
            )
        ),

    CONSTRAINT marks_max_check
        CHECK (max_marks > 0),

    CONSTRAINT marks_obtained_check
        CHECK (
            marks_obtained >= 0
            AND marks_obtained <= max_marks
        )
);


-- ============================================================
-- 6. EXAMS
-- ============================================================

CREATE TABLE exams (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    student_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,

    name VARCHAR(100) NOT NULL,

    exam_date TIMESTAMPTZ NOT NULL,

    duration_minutes INTEGER,

    syllabus TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT exams_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Student must belong to same workspace
    CONSTRAINT exams_workspace_student_fk
        FOREIGN KEY (workspace_id, student_id)
        REFERENCES students(workspace_id, id)
        ON DELETE CASCADE,

    -- Subject must belong to same workspace
    CONSTRAINT exams_workspace_subject_fk
        FOREIGN KEY (workspace_id, subject_id)
        REFERENCES subjects(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT exams_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT exams_name_check
        CHECK (length(trim(name)) > 0),

    CONSTRAINT exams_duration_check
        CHECK (
            duration_minutes IS NULL
            OR duration_minutes > 0
        )
);


-- ============================================================
-- 7. ROADMAPS
-- ============================================================

CREATE TABLE roadmaps (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    student_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,

    title VARCHAR(150) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roadmaps_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Student must belong to same workspace
    CONSTRAINT roadmaps_workspace_student_fk
        FOREIGN KEY (workspace_id, student_id)
        REFERENCES students(workspace_id, id)
        ON DELETE CASCADE,

    -- Exam must belong to same workspace
    CONSTRAINT roadmaps_workspace_exam_fk
        FOREIGN KEY (workspace_id, exam_id)
        REFERENCES exams(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT roadmaps_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT roadmaps_title_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT roadmaps_date_check
        CHECK (end_date >= start_date),

    CONSTRAINT roadmaps_status_check
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'PAUSED',
                'CANCELLED'
            )
        )
);


-- ============================================================
-- 8. ROADMAP ITEMS
-- ============================================================

CREATE TABLE roadmap_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,
    roadmap_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    scheduled_date DATE NOT NULL,

    estimated_minutes INTEGER NOT NULL,

    sequence_number INTEGER NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roadmap_items_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Roadmap must belong to same workspace
    CONSTRAINT roadmap_items_workspace_roadmap_fk
        FOREIGN KEY (workspace_id, roadmap_id)
        REFERENCES roadmaps(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT roadmap_items_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT roadmap_items_title_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT roadmap_items_time_check
        CHECK (estimated_minutes > 0),

    CONSTRAINT roadmap_items_sequence_check
        CHECK (sequence_number > 0),

    CONSTRAINT roadmap_items_status_check
        CHECK (
            status IN (
                'PENDING',
                'IN_PROGRESS',
                'COMPLETED',
                'SKIPPED'
            )
        ),

    CONSTRAINT roadmap_items_sequence_unique
        UNIQUE (
            workspace_id,
            roadmap_id,
            sequence_number
        )
);


-- ============================================================
-- 9. TASKS
-- ============================================================

CREATE TABLE tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    student_id BIGINT NOT NULL,
    subject_id BIGINT,
    roadmap_item_id BIGINT,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    deadline TIMESTAMPTZ,

    estimated_minutes INTEGER NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',

    difficulty VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    progress_percent SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Student must belong to same workspace
    CONSTRAINT tasks_workspace_student_fk
        FOREIGN KEY (workspace_id, student_id)
        REFERENCES students(workspace_id, id)
        ON DELETE CASCADE,

    -- Optional subject must belong to same workspace
    CONSTRAINT tasks_workspace_subject_fk
        FOREIGN KEY (workspace_id, subject_id)
        REFERENCES subjects(workspace_id, id)
        ON DELETE SET NULL,

    -- Optional roadmap item must belong to same workspace
    CONSTRAINT tasks_workspace_roadmap_item_fk
        FOREIGN KEY (workspace_id, roadmap_item_id)
        REFERENCES roadmap_items(workspace_id, id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT tasks_title_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT tasks_estimated_time_check
        CHECK (estimated_minutes > 0),

    CONSTRAINT tasks_priority_check
        CHECK (
            priority IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'URGENT'
            )
        ),

    CONSTRAINT tasks_difficulty_check
        CHECK (
            difficulty IN (
                'EASY',
                'MEDIUM',
                'HARD'
            )
        ),

    CONSTRAINT tasks_status_check
        CHECK (
            status IN (
                'PENDING',
                'IN_PROGRESS',
                'COMPLETED',
                'SKIPPED'
            )
        ),

    CONSTRAINT tasks_progress_check
        CHECK (
            progress_percent BETWEEN 0 AND 100
        )
);


-- ============================================================
-- 10. CALENDAR EVENTS
-- ============================================================

CREATE TABLE calendar_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    workspace_id BIGINT NOT NULL,

    student_id BIGINT NOT NULL,

    task_id BIGINT,
    exam_id BIGINT,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    event_type VARCHAR(30) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT calendar_workspace_fk
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    -- Student must belong to same workspace
    CONSTRAINT calendar_workspace_student_fk
        FOREIGN KEY (workspace_id, student_id)
        REFERENCES students(workspace_id, id)
        ON DELETE CASCADE,

    -- Optional task must belong to same workspace
    CONSTRAINT calendar_workspace_task_fk
        FOREIGN KEY (workspace_id, task_id)
        REFERENCES tasks(workspace_id, id)
        ON DELETE CASCADE,

    -- Optional exam must belong to same workspace
    CONSTRAINT calendar_workspace_exam_fk
        FOREIGN KEY (workspace_id, exam_id)
        REFERENCES exams(workspace_id, id)
        ON DELETE CASCADE,

    CONSTRAINT calendar_workspace_id_unique
        UNIQUE (workspace_id, id),

    CONSTRAINT calendar_title_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT calendar_time_check
        CHECK (end_time > start_time),

    CONSTRAINT calendar_type_check
        CHECK (
            event_type IN (
                'STUDY',
                'EXAM',
                'TASK',
                'OTHER'
            )
        )
);


-- ============================================================
-- INDEXES
-- ============================================================

-- ----------------------------
-- Workspaces
-- ----------------------------

CREATE INDEX idx_workspaces_active
    ON workspaces(is_active);


-- ----------------------------
-- Users
-- ----------------------------

CREATE INDEX idx_users_workspace
    ON users(workspace_id);

CREATE INDEX idx_users_workspace_role
    ON users(workspace_id, role);


-- ----------------------------
-- Students
-- ----------------------------

CREATE INDEX idx_students_workspace
    ON students(workspace_id);

CREATE INDEX idx_students_workspace_section
    ON students(workspace_id, section);

CREATE INDEX idx_students_workspace_semester
    ON students(workspace_id, semester);


-- ----------------------------
-- Subjects
-- ----------------------------

CREATE INDEX idx_subjects_workspace
    ON subjects(workspace_id);

CREATE INDEX idx_subjects_workspace_semester
    ON subjects(workspace_id, semester);

CREATE INDEX idx_subjects_workspace_department
    ON subjects(workspace_id, department);


-- ----------------------------
-- Marks
-- ----------------------------

CREATE INDEX idx_marks_workspace_student
    ON marks(workspace_id, student_id);

CREATE INDEX idx_marks_workspace_subject
    ON marks(workspace_id, subject_id);

CREATE INDEX idx_marks_workspace_assessment
    ON marks(workspace_id, assessment_type);

CREATE INDEX idx_marks_workspace_student_assessment
    ON marks(workspace_id, student_id, assessment_type);


-- ----------------------------
-- Exams
-- ----------------------------

CREATE INDEX idx_exams_workspace_student
    ON exams(workspace_id, student_id);

CREATE INDEX idx_exams_workspace_subject
    ON exams(workspace_id, subject_id);

CREATE INDEX idx_exams_workspace_date
    ON exams(workspace_id, exam_date);


-- ----------------------------
-- Roadmaps
-- ----------------------------

CREATE INDEX idx_roadmaps_workspace_student
    ON roadmaps(workspace_id, student_id);

CREATE INDEX idx_roadmaps_workspace_exam
    ON roadmaps(workspace_id, exam_id);

CREATE INDEX idx_roadmaps_workspace_status
    ON roadmaps(workspace_id, status);


-- ----------------------------
-- Roadmap Items
-- ----------------------------

CREATE INDEX idx_roadmap_items_workspace_roadmap
    ON roadmap_items(workspace_id, roadmap_id);

CREATE INDEX idx_roadmap_items_workspace_date
    ON roadmap_items(workspace_id, scheduled_date);


-- ----------------------------
-- Tasks
-- ----------------------------

CREATE INDEX idx_tasks_workspace_student
    ON tasks(workspace_id, student_id);

CREATE INDEX idx_tasks_workspace_subject
    ON tasks(workspace_id, subject_id);

CREATE INDEX idx_tasks_workspace_deadline
    ON tasks(workspace_id, deadline);

CREATE INDEX idx_tasks_workspace_status
    ON tasks(workspace_id, status);

CREATE INDEX idx_tasks_workspace_priority
    ON tasks(workspace_id, priority);

CREATE INDEX idx_tasks_workspace_roadmap_item
    ON tasks(workspace_id, roadmap_item_id);


-- ----------------------------
-- Calendar Events
-- ----------------------------

CREATE INDEX idx_calendar_workspace_student
    ON calendar_events(workspace_id, student_id);

CREATE INDEX idx_calendar_workspace_start_time
    ON calendar_events(workspace_id, start_time);

CREATE INDEX idx_calendar_workspace_task
    ON calendar_events(workspace_id, task_id);

CREATE INDEX idx_calendar_workspace_exam
    ON calendar_events(workspace_id, exam_id);


COMMIT;


-- ============================================================
-- END OF CLOUDNEST SCHEMA
-- ============================================================