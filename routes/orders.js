const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

router.post('/', async (req, res) => {
    const { customer_name, customer_phone, customer_email, telegram_username, address, delivery_type, delivery_date, delivery_time, gift_card_text, courier_comment, items } = req.body;

    if (!customer_name || !customer_phone || !items || items.length === 0) {
        return res.status(400).json({ error: 'Заполните обязательные поля и добавьте товары' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let total = 0;
        for (const item of items) {
            const flower = await client.query('SELECT price FROM flowers WHERE flower_id = $1', [item.flower_id]);
            if (flower.rows.length === 0) {
                throw new Error(`Товар с ID ${item.flower_id} не найден`);
            }
            item.unit_price = flower.rows[0].price;
            item.total_price = item.unit_price * item.quantity;
            total += item.total_price;
        }

        if (delivery_type === 'express') {
            total += 1000;
        } else {
            total += 400;
        }

        const orderResult = await client.query(
            `INSERT INTO orders (customer_name, customer_phone, customer_email, telegram_username, address, delivery_type, delivery_date, delivery_time, gift_card_text, courier_comment, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new') RETURNING *`,
            [customer_name, customer_phone, customer_email || null, telegram_username || null,
             address || null, delivery_type || 'standard', delivery_date || null, delivery_time || null,
             gift_card_text || null, courier_comment || null, total]
        );

        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, flower_id, quantity, unit_price, total_price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [order.order_id, item.flower_id, item.quantity, item.unit_price, item.total_price]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(order);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message || 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

router.get('/', auth, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT o.*, e.full_name as handled_by_name FROM orders o LEFT JOIN employees e ON o.handled_by = e.employee_id';
        const params = [];

        if (status) {
            query += ' WHERE o.status = $1';
            params.push(status);
        }
        query += ' ORDER BY o.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const order = await pool.query(
            `SELECT o.*, e.full_name as handled_by_name FROM orders o
             LEFT JOIN employees e ON o.handled_by = e.employee_id
             WHERE o.order_id = $1`,
            [req.params.id]
        );
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const items = await pool.query(
            `SELECT oi.*, f.name as flower_name, f.photo_url FROM order_items oi
             LEFT JOIN flowers f ON oi.flower_id = f.flower_id
             WHERE oi.order_id = $1`,
            [req.params.id]
        );

        res.json({ ...order.rows[0], items: items.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:id/status', auth, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['new', 'assembled', 'in_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Неверный статус' });
        }

        const result = await pool.query(
            `UPDATE orders SET status = $1, handled_by = $2, updated_at = NOW()
             WHERE order_id = $3 RETURNING *`,
            [status, req.user.employee_id, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        await pool.query(
            `INSERT INTO user_activity_log (employee_id, action, table_name, record_id, new_data, ip_address, user_agent)
             VALUES ($1, 'STATUS_CHANGE', 'orders', $2, $3, $4, $5)`,
            [req.user.employee_id, req.params.id, JSON.stringify({ status }), req.ip, req.headers['user-agent']]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:id', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
            const result = await client.query(
                'DELETE FROM orders WHERE order_id = $1 RETURNING order_id',
                [req.params.id]
            );
            await client.query('COMMIT');
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Заказ не найден' });
            }
            res.json({ message: 'Заказ удалён' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
