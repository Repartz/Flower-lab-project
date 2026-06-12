const express = require('express');
const pool = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { category, occasion, color, min_price, max_price, sort, search, is_hit, is_new, limit, offset } = req.query;
        let query = 'SELECT f.*, c.name as category_name FROM flowers f LEFT JOIN categories c ON f.category_id = c.category_id WHERE f.is_active = true';
        const params = [];
        let idx = 1;

        if (category) {
            query += ` AND c.slug = $${idx++}`;
            params.push(category);
        }
        if (occasion) {
            query += ` AND f.occasion_tags ILIKE $${idx++}`;
            params.push(`%${occasion}%`);
        }
        if (color) {
            query += ` AND f.color_tags ILIKE $${idx++}`;
            params.push(`%${color}%`);
        }
        if (min_price) {
            query += ` AND f.price >= $${idx++}`;
            params.push(Number(min_price));
        }
        if (max_price) {
            query += ` AND f.price <= $${idx++}`;
            params.push(Number(max_price));
        }
        if (search) {
            query += ` AND (f.name ILIKE $${idx} OR f.description ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        if (is_hit === 'true') {
            query += ' AND f.is_hit = true';
        }
        if (is_new === 'true') {
            query += ' AND f.is_new = true';
        }

        const sortMap = {
            'new': 'f.created_at DESC',
            'price_asc': 'f.price ASC',
            'price_desc': 'f.price DESC',
            'popular': 'f.is_hit DESC, f.created_at DESC'
        };
        query += ` ORDER BY ${sortMap[sort] || 'f.created_at DESC'}`;

        if (limit) {
            query += ` LIMIT $${idx++}`;
            params.push(Number(limit));
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

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.*, c.name as category_name FROM flowers f
             LEFT JOIN categories c ON f.category_id = c.category_id
             WHERE f.flower_id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/', auth, requireRole(['Admin', 'Manager']), upload.single('photo'), async (req, res) => {
    try {
        const { name, slug, description, composition, price, old_price, size_cm, color_tags, occasion_tags, category_id, stock_count, is_hit, is_new } = req.body;
        if (!name || !price) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }
        if (Number(price) <= 0) {
            return res.status(400).json({ error: 'Цена должна быть больше 0' });
        }

        let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
        const slugCheck = await pool.query('SELECT flower_id FROM flowers WHERE slug = $1', [finalSlug]);
        if (slugCheck.rows.length > 0) {
            finalSlug = finalSlug + '-' + Date.now();
        }

        const photo_url = req.file ? '/uploads/' + req.file.filename : null;

        const result = await pool.query(
            `INSERT INTO flowers (name, slug, description, composition, price, old_price, size_cm, color_tags, occasion_tags, category_id, stock_count, is_hit, is_new, photo_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [name, finalSlug, description || null, composition || null, Number(price),
             old_price ? Number(old_price) : null,
             size_cm ? Number(size_cm) : null,
             color_tags || null,
             occasion_tags || null,
             category_id ? Number(category_id) : null,
             stock_count ? Number(stock_count) : 0,
             is_hit === 'true', is_new === 'true', photo_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('CREATE FLOWER ERROR:', err.message, err.stack);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

router.put('/:id', auth, requireRole(['Admin', 'Manager']), upload.single('photo'), async (req, res) => {
    try {
        const { name, slug, description, composition, price, old_price, size_cm, color_tags, occasion_tags, category_id, stock_count, is_hit, is_new } = req.body;
        if (!name || !price) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }

        let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
        const slugCheck = await pool.query('SELECT flower_id FROM flowers WHERE slug = $1 AND flower_id != $2', [finalSlug, req.params.id]);
        if (slugCheck.rows.length > 0) {
            finalSlug = finalSlug + '-' + Date.now();
        }

        let photo_url;
        if (req.file) {
            photo_url = '/uploads/' + req.file.filename;
        }

        let query = `UPDATE flowers SET name=$1, slug=$2, description=$3, composition=$4, price=$5, old_price=$6, size_cm=$7, color_tags=$8, occasion_tags=$9, category_id=$10, stock_count=$11, is_hit=$12, is_new=$13, updated_at=NOW()`;
        const params = [name, finalSlug, description || null, composition || null, Number(price),
            old_price ? Number(old_price) : null,
            size_cm ? Number(size_cm) : null,
            color_tags || null,
            occasion_tags || null,
            category_id ? Number(category_id) : null,
            stock_count ? Number(stock_count) : 0,
            is_hit === 'true', is_new === 'true'];
        let idx = 14;

        if (photo_url) {
            query += `, photo_url=$${idx++}`;
            params.push(photo_url);
        }
        query += ` WHERE flower_id=$${idx} RETURNING *`;
        params.push(req.params.id);

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
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
            'DELETE FROM flowers WHERE flower_id = $1 RETURNING flower_id',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json({ message: 'Товар удалён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
