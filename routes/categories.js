const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM categories ORDER BY sort_order ASC, category_id ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/', auth, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { name, slug, description, sort_order } = req.body;
        const result = await pool.query(
            `INSERT INTO categories (name, slug, description, sort_order)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, slug, description, sort_order ? Number(sort_order) : 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:id', auth, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { name, slug, description, sort_order, is_active } = req.body;
        const result = await pool.query(
            `UPDATE categories SET name=$1, slug=$2, description=$3, sort_order=$4, is_active=$5
             WHERE category_id = $6 RETURNING *`,
            [name, slug, description, sort_order ? Number(sort_order) : 0, is_active !== false, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:id', auth, requireRole(['Admin']), async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM categories WHERE category_id = $1 RETURNING category_id',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json({ message: 'Категория удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
