const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    try {
        const result = await pool.query(
            `SELECT e.employee_id, e.full_name, e.login, e.password_hash, e.email, e.phone, e.is_active,
                    array_agg(r.role_name) as roles
             FROM employees e
             LEFT JOIN user_roles ur ON e.employee_id = ur.employee_id
             LEFT JOIN roles r ON ur.role_id = r.role_id
             WHERE e.login = $1
             GROUP BY e.employee_id`,
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: 'Учётная запись деактивирована' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const token = jwt.sign(
            { employee_id: user.employee_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        await pool.query(
            `INSERT INTO user_activity_log (employee_id, action, table_name, ip_address, user_agent)
             VALUES ($1, 'LOGIN', 'employees', $2, $3)`,
            [user.employee_id, req.ip, req.headers['user-agent']]
        );

        res.json({
            token,
            user: {
                employee_id: user.employee_id,
                full_name: user.full_name,
                login: user.login,
                email: user.email,
                phone: user.phone,
                roles: user.roles
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/me', auth, (req, res) => {
    res.json({
        user: {
            employee_id: req.user.employee_id,
            full_name: req.user.full_name,
            login: req.user.login,
            email: req.user.email,
            phone: req.user.phone,
            roles: req.user.roles
        }
    });
});

router.post('/logout', auth, async (req, res) => {
    try {
        await pool.query(
            `INSERT INTO user_activity_log (employee_id, action, table_name, ip_address, user_agent)
             VALUES ($1, 'LOGOUT', 'employees', $2, $3)`,
            [req.user.employee_id, req.ip, req.headers['user-agent']]
        );
    } catch (err) {
        console.error(err);
    }
    res.json({ message: 'Вы вышли из системы' });
});

module.exports = router;
