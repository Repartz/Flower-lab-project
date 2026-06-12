const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', auth, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { employee_id, table_name, action, limit, offset } = req.query;
        let query = `SELECT l.*, e.full_name as employee_name
                     FROM user_activity_log l
                     LEFT JOIN employees e ON l.employee_id = e.employee_id`;
        const params = [];
        const conditions = [];
        let idx = 1;

        if (employee_id) {
            conditions.push(`l.employee_id = $${idx++}`);
            params.push(Number(employee_id));
        }
        if (table_name) {
            conditions.push(`l.table_name = $${idx++}`);
            params.push(table_name);
        }
        if (action) {
            conditions.push(`l.action = $${idx++}`);
            params.push(action);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY l.created_at DESC';

        if (limit) {
            query += ` LIMIT $${idx++}`;
            params.push(Number(limit));
        } else {
            query += ' LIMIT 100';
        }
        if (offset) {
            query += ` OFFSET $${idx++}`;
            params.push(Number(offset));
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
