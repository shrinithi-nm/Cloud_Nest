const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured in .env");
};

// REGISTER
const register = async (req, res) => {
    try {
        const { workspace_id, email, password, role = "student" } = req.body;

        if (!workspace_id || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "workspace_id, email and password are required"
            });
        }

        if (!["student", "admin"].includes(role)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid role"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await pool.query(
            `
            SELECT id
            FROM users
            WHERE workspace_id = $1
              AND email = $2
            `,
            [workspace_id, normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "User already exists in this workspace"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `
            INSERT INTO users (
                workspace_id,
                email,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, workspace_id, email, role, is_active
            `,
            [
                workspace_id,
                normalizedEmail,
                passwordHash,
                role
            ]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            {
                user_id: user.id,
                workspace_id: user.workspace_id,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            status: "success",
            message: "User registered successfully",
            user,
            token
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Registration failed"
        });
    }
};


// LOGIN
const login = async (req, res) => {
    try {
        const { workspace_id, email, password } = req.body;

        if (!workspace_id || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "workspace_id, email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `
            SELECT
                id,
                workspace_id,
                email,
                password_hash,
                role,
                is_active
            FROM users
            WHERE workspace_id = $1
              AND email = $2
            `,
            [workspace_id, normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                status: "error",
                message: "User account is inactive"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                status: "error",
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.id,
                workspace_id: user.workspace_id,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            status: "success",
            message: "Login successful",
            user: {
                id: user.id,
                workspace_id: user.workspace_id,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            },
            token
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Login failed"
        });
    }
};


// GET CURRENT USER
const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                workspace_id,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE id = $1
              AND workspace_id = $2
            `,
            [
                req.user.user_id,
                req.user.workspace_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "User not found"
            });
        }

        res.json({
            status: "success",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Get user error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch user"
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};