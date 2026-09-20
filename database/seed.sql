BEGIN;

-- =========================================================
-- CLOUDNEST SEED DATA
-- =========================================================

-- ---------------------------------------------------------
-- 1. CLEAR EXISTING DEMO DATA
-- ---------------------------------------------------------

DELETE FROM calendar_events;
DELETE FROM tasks;
DELETE FROM roadmap_items;
DELETE FROM roadmaps;
DELETE FROM exams;
DELETE FROM marks;
DELETE FROM students;
DELETE FROM subjects;
DELETE FROM users;
DELETE FROM workspaces;


-- ---------------------------------------------------------
-- 2. WORKSPACES
-- ---------------------------------------------------------

INSERT INTO workspaces (name, code)
VALUES
    ('CloudNest Demo College', 'CLOUDNEST'),
    ('Demo University', 'DEMOUNI');


-- ---------------------------------------------------------
-- 3. USERS
-- ---------------------------------------------------------

INSERT INTO users
    (workspace_id, email, password_hash, role)
SELECT
    id,
    'admin@cloudnest.demo',
    'DEMO_HASH_ADMIN',
    'admin'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO users
    (workspace_id, email, password_hash, role)
SELECT
    id,
    'student1@cloudnest.demo',
    'DEMO_HASH_STUDENT1',
    'student'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO users
    (workspace_id, email, password_hash, role)
SELECT
    id,
    'student2@cloudnest.demo',
    'DEMO_HASH_STUDENT2',
    'student'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO users
    (workspace_id, email, password_hash, role)
SELECT
    id,
    'student@demouni.demo',
    'DEMO_HASH_STUDENT3',
    'student'
FROM workspaces
WHERE code = 'DEMOUNI';


-- ---------------------------------------------------------
-- 4. STUDENTS
-- ---------------------------------------------------------

INSERT INTO students
    (workspace_id, user_id, registration_number, full_name,
     program, semester, section)
SELECT
    w.id,
    u.id,
    '24CSE001',
    'Arjun Kumar',
    'B.Tech Computer Science and Engineering',
    3,
    'A'
FROM workspaces w
JOIN users u
    ON u.workspace_id = w.id
WHERE w.code = 'CLOUDNEST'
  AND u.email = 'student1@cloudnest.demo';

INSERT INTO students
    (workspace_id, user_id, registration_number, full_name,
     program, semester, section)
SELECT
    w.id,
    u.id,
    '24CSE002',
    'Meera Sharma',
    'B.Tech Computer Science and Engineering',
    3,
    'A'
FROM workspaces w
JOIN users u
    ON u.workspace_id = w.id
WHERE w.code = 'CLOUDNEST'
  AND u.email = 'student2@cloudnest.demo';

INSERT INTO students
    (workspace_id, user_id, registration_number, full_name,
     program, semester, section)
SELECT
    w.id,
    u.id,
    '24CSE101',
    'Rahul Verma',
    'B.Tech Computer Science and Engineering',
    3,
    'B'
FROM workspaces w
JOIN users u
    ON u.workspace_id = w.id
WHERE w.code = 'DEMOUNI'
  AND u.email = 'student@demouni.demo';


-- ---------------------------------------------------------
-- 5. SUBJECTS
-- ---------------------------------------------------------

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'BCSE301', 'Database Management Systems', 4, 3, 'CSE'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'BCSE302', 'Operating Systems', 4, 3, 'CSE'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'BCSE303', 'Computer Networks', 4, 3, 'CSE'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'BCSE304', 'Java Programming', 3, 3, 'CSE'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'BCSE305', 'Cloud Computing', 3, 3, 'CSE'
FROM workspaces
WHERE code = 'CLOUDNEST';

INSERT INTO subjects
    (workspace_id, code, name, credits, semester, department)
SELECT id, 'CSE101', 'Programming Fundamentals', 4, 3, 'CSE'
FROM workspaces
WHERE code = 'DEMOUNI';


-- ---------------------------------------------------------
-- 6. MARKS - STUDENT 1
-- ---------------------------------------------------------

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT1',
    26,
    30,
    '2026-08-05'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT2',
    27,
    30,
    '2026-09-01'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'FAT',
    82,
    100,
    '2026-10-20'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301';


-- Operating Systems

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT1',
    22,
    30,
    '2026-08-06'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT2',
    25,
    30,
    '2026-09-02'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'FAT',
    78,
    100,
    '2026-10-22'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302';


-- Computer Networks

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT1',
    24,
    30,
    '2026-08-07'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE303';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT2',
    26,
    30,
    '2026-09-03'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE303';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'FAT',
    85,
    100,
    '2026-10-24'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE303';


-- Java

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT1',
    28,
    30,
    '2026-08-08'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE304';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT2',
    29,
    30,
    '2026-09-04'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE304';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'FAT',
    91,
    100,
    '2026-10-26'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE304';


-- Cloud Computing

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT1',
    25,
    30,
    '2026-08-09'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE305';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'CAT2',
    27,
    30,
    '2026-09-05'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE305';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'FAT',
    88,
    100,
    '2026-10-28'
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE305';


-- ---------------------------------------------------------
-- 7. MARKS - STUDENT 2
-- ---------------------------------------------------------

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT1', 21, 30, '2026-08-05'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE301';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT2', 23, 30, '2026-09-01'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE301';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'FAT', 74, 100, '2026-10-20'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE301';


INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT1', 24, 30, '2026-08-06'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE302';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT2', 26, 30, '2026-09-02'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE302';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'FAT', 81, 100, '2026-10-22'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE302';


INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT1', 20, 30, '2026-08-07'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE303';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT2', 22, 30, '2026-09-03'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE303';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'FAT', 72, 100, '2026-10-24'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE303';


INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT1', 27, 30, '2026-08-08'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE304';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT2', 28, 30, '2026-09-04'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE304';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'FAT', 89, 100, '2026-10-26'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE304';


INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT1', 23, 30, '2026-08-09'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE305';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'CAT2', 25, 30, '2026-09-05'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE305';

INSERT INTO marks
    (workspace_id, student_id, subject_id, assessment_type,
     marks_obtained, max_marks, assessment_date)
SELECT
    s.workspace_id, s.id, sub.id, 'FAT', 79, 100, '2026-10-28'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE002'
  AND sub.code = 'BCSE305';


-- ---------------------------------------------------------
-- 8. EXAMS - STUDENT 1
-- ---------------------------------------------------------

INSERT INTO exams
    (workspace_id, student_id, subject_id, name, exam_date,
     duration_minutes, syllabus)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'DBMS FAT',
    '2026-10-20 09:00:00+05:30',
    180,
    'ER Model, Relational Algebra, SQL, Normalization, Transactions, Indexing'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301';

INSERT INTO exams
    (workspace_id, student_id, subject_id, name, exam_date,
     duration_minutes, syllabus)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'Operating Systems FAT',
    '2026-10-22 09:00:00+05:30',
    180,
    'Processes, Threads, CPU Scheduling, Synchronization, Deadlocks, Memory Management'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302';

INSERT INTO exams
    (workspace_id, student_id, subject_id, name, exam_date,
     duration_minutes, syllabus)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    'Computer Networks FAT',
    '2026-10-24 09:00:00+05:30',
    180,
    'OSI Model, TCP/IP, Routing, Transport Layer, Congestion Control, Network Security'
FROM students s
JOIN subjects sub ON sub.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE303';


-- ---------------------------------------------------------
-- 9. ROADMAPS
-- ---------------------------------------------------------

INSERT INTO roadmaps
    (workspace_id, student_id, exam_id, title,
     start_date, end_date, status)
SELECT
    e.workspace_id,
    e.student_id,
    e.id,
    'DBMS FAT Preparation Roadmap',
    '2026-10-14',
    '2026-10-19',
    'ACTIVE'
FROM exams e
JOIN students s ON s.id = e.student_id
WHERE s.registration_number = '24CSE001'
  AND e.name = 'DBMS FAT';

INSERT INTO roadmaps
    (workspace_id, student_id, exam_id, title,
     start_date, end_date, status)
SELECT
    e.workspace_id,
    e.student_id,
    e.id,
    'Operating Systems FAT Preparation Roadmap',
    '2026-10-16',
    '2026-10-21',
    'ACTIVE'
FROM exams e
JOIN students s ON s.id = e.student_id
WHERE s.registration_number = '24CSE001'
  AND e.name = 'Operating Systems FAT';


-- ---------------------------------------------------------
-- 10. ROADMAP ITEMS
-- ---------------------------------------------------------

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'ER Model and Relational Algebra',
    'Revise ER diagrams and relational algebra operations.',
    '2026-10-14',
    60,
    1,
    'COMPLETED'
FROM roadmaps r
WHERE r.title = 'DBMS FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'SQL and Advanced Queries',
    'Practice joins, subqueries, grouping and aggregate queries.',
    '2026-10-15',
    75,
    2,
    'IN_PROGRESS'
FROM roadmaps r
WHERE r.title = 'DBMS FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'Normalization',
    'Revise functional dependencies, 1NF, 2NF, 3NF and BCNF.',
    '2026-10-16',
    60,
    3,
    'PENDING'
FROM roadmaps r
WHERE r.title = 'DBMS FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'Transactions and Concurrency',
    'Study ACID properties, schedules, locking and serializability.',
    '2026-10-17',
    60,
    4,
    'PENDING'
FROM roadmaps r
WHERE r.title = 'DBMS FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'Indexing and B+ Trees',
    'Revise indexing techniques and B+ tree operations.',
    '2026-10-18',
    60,
    5,
    'PENDING'
FROM roadmaps r
WHERE r.title = 'DBMS FAT Preparation Roadmap';


INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'CPU Scheduling',
    'Practice FCFS, SJF, Round Robin and priority scheduling.',
    '2026-10-16',
    60,
    1,
    'COMPLETED'
FROM roadmaps r
WHERE r.title = 'Operating Systems FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'Synchronization',
    'Revise semaphores, mutexes and classical synchronization problems.',
    '2026-10-17',
    75,
    2,
    'IN_PROGRESS'
FROM roadmaps r
WHERE r.title = 'Operating Systems FAT Preparation Roadmap';

INSERT INTO roadmap_items
    (workspace_id, roadmap_id, title, description,
     scheduled_date, estimated_minutes, sequence_number, status)
SELECT
    r.workspace_id,
    r.id,
    'Deadlocks',
    'Study deadlock conditions, prevention, avoidance and Banker algorithm.',
    '2026-10-18',
    60,
    3,
    'PENDING'
FROM roadmaps r
WHERE r.title = 'Operating Systems FAT Preparation Roadmap';


-- ---------------------------------------------------------
-- 11. TASKS
-- ---------------------------------------------------------

INSERT INTO tasks
    (workspace_id, student_id, subject_id, roadmap_item_id,
     title, description, deadline, estimated_minutes,
     priority, difficulty, status, progress)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    ri.id,
    'Practice SQL Joins',
    'Solve 15 SQL join and aggregation problems.',
    '2026-10-15 21:00:00+05:30',
    60,
    'HIGH',
    'MEDIUM',
    'IN_PROGRESS',
    60
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
JOIN roadmap_items ri
    ON ri.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301'
  AND ri.title = 'SQL and Advanced Queries';

INSERT INTO tasks
    (workspace_id, student_id, subject_id, roadmap_item_id,
     title, description, deadline, estimated_minutes,
     priority, difficulty, status, progress)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    ri.id,
    'Revise Normalization',
    'Review functional dependencies and normal forms.',
    '2026-10-16 20:00:00+05:30',
    60,
    'HIGH',
    'HARD',
    'PENDING',
    0
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
JOIN roadmap_items ri
    ON ri.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE301'
  AND ri.title = 'Normalization';

INSERT INTO tasks
    (workspace_id, student_id, subject_id, roadmap_item_id,
     title, description, deadline, estimated_minutes,
     priority, difficulty, status, progress)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    ri.id,
    'Study Deadlocks',
    'Practice deadlock detection and Banker algorithm problems.',
    '2026-10-18 19:00:00+05:30',
    75,
    'URGENT',
    'HARD',
    'PENDING',
    0
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
JOIN roadmap_items ri
    ON ri.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302'
  AND ri.title = 'Deadlocks';


INSERT INTO tasks
    (workspace_id, student_id, subject_id, roadmap_item_id,
     title, description, deadline, estimated_minutes,
     priority, difficulty, status, progress)
SELECT
    s.workspace_id,
    s.id,
    sub.id,
    ri.id,
    'Practice CPU Scheduling',
    'Solve scheduling problems using FCFS, SJF and Round Robin.',
    '2026-10-16 18:00:00+05:30',
    60,
    'MEDIUM',
    'MEDIUM',
    'COMPLETED',
    100
FROM students s
JOIN subjects sub
    ON sub.workspace_id = s.workspace_id
JOIN roadmap_items ri
    ON ri.workspace_id = s.workspace_id
WHERE s.registration_number = '24CSE001'
  AND sub.code = 'BCSE302'
  AND ri.title = 'CPU Scheduling';


-- ---------------------------------------------------------
-- 12. CALENDAR EVENTS
-- ---------------------------------------------------------

INSERT INTO calendar_events
    (workspace_id, student_id, task_id, exam_id,
     title, description, start_time, end_time, event_type)
SELECT
    t.workspace_id,
    t.student_id,
    t.id,
    NULL,
    'SQL Practice Session',
    'Focused SQL practice session.',
    '2026-10-15 19:30:00+05:30',
    '2026-10-15 20:30:00+05:30',
    'STUDY'
FROM tasks t
WHERE t.title = 'Practice SQL Joins';

INSERT INTO calendar_events
    (workspace_id, student_id, task_id, exam_id,
     title, description, start_time, end_time, event_type)
SELECT
    t.workspace_id,
    t.student_id,
    t.id,
    NULL,
    'Normalization Revision',
    'Revision session for DBMS normalization.',
    '2026-10-16 18:30:00+05:30',
    '2026-10-16 19:30:00+05:30',
    'STUDY'
FROM tasks t
WHERE t.title = 'Revise Normalization';

INSERT INTO calendar_events
    (workspace_id, student_id, task_id, exam_id,
     title, description, start_time, end_time, event_type)
SELECT
    e.workspace_id,
    e.student_id,
    NULL,
    e.id,
    'DBMS FAT',
    'Final assessment for Database Management Systems.',
    e.exam_date,
    e.exam_date + INTERVAL '3 hours',
    'EXAM'
FROM exams e
WHERE e.name = 'DBMS FAT';

INSERT INTO calendar_events
    (workspace_id, student_id, task_id, exam_id,
     title, description, start_time, end_time, event_type)
SELECT
    e.workspace_id,
    e.student_id,
    NULL,
    e.id,
    'Operating Systems FAT',
    'Final assessment for Operating Systems.',
    e.exam_date,
    e.exam_date + INTERVAL '3 hours',
    'EXAM'
FROM exams e
WHERE e.name = 'Operating Systems FAT';


COMMIT;