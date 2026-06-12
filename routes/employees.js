const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.employee_id, e.full_name, e.login, e.phone, e.email, e.is_active, e.created_at,
                    array_agg(r.role_name) as roles
             FROM employees e
             LEFT JOIN user_roles ur ON e.employee_id = ur.employee_id
             LEFT JOIN roles r ON ur.role_id = r.role_id
             GROUP BY e.employee_id
             ORDER BY e.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const { full_name, login, password, phone, email, role } = req.body;
        if (!full_name || !login || !password) {
            return res.status(400).json({ error: 'Заполните обязательные поля' });
        }

        const hash = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO employees (full_name, login, password_hash, phone, email)
                 VALUES ($1, $2, $3, $4, $5) RETURNING employee_id, full_name, login, phone, email, created_at`,
                [full_name, login, hash, phone || null, email || null]
            );

            const employee = result.rows[0];
            const roleName = role || 'Manager';
            const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', [roleName]);
            if (roleResult.rows.length > 0) {
                await client.query(
                    'INSERT INTO user_roles (employee_id, role_id) VALUES ($1, $2)',
                    [employee.employee_id, roleResult.rows[0].role_id]
                );
            }

            await client.query('COMMIT');
            res.status(201).json({ ...employee, roles: [roleName] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Сотрудник с таким логином уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:id', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const { full_name, login, phone, email, is_active, role } = req.body;

        let query = `UPDATE employees SET full_name=$1, login=$2, phone=$3, email=$4, is_active=$5`;
        const params = [full_name, login, phone || null, email || null, is_active !== false];
        let idx = 6;

        if (req.body.password) {
            const hash = await bcrypt.hash(req.body.password, 10);
            query += `, password_hash=$${idx++}`;
            params.push(hash);
        }

        query += ` WHERE employee_id=$${idx} RETURNING employee_id, full_name, login, phone, email, is_active`;
        params.push(req.params.id);

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        if (role) {
            await pool.query('DELETE FROM user_roles WHERE employee_id = $1', [req.params.id]);
            const roleResult = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', [role]);
            if (roleResult.rows.length > 0) {
                await pool.query(
                    'INSERT INTO user_roles (employee_id, role_id) VALUES ($1, $2)',
                    [req.params.id, roleResult.rows[0].role_id]
                );
            }
        }

        res.json({ ...result.rows[0], roles: role ? [role] : req.user.roles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:id', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM employees WHERE employee_id = $1 RETURNING employee_id',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json({ message: 'Сотрудник удалён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
