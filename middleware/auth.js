const jwt = require('jsonwebtoken');
const pool = require('../db');

async function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            `SELECT e.employee_id, e.full_name, e.login, e.email, e.phone,
                    array_agg(r.role_name) as roles
             FROM employees e
             LEFT JOIN user_roles ur ON e.employee_id = ur.employee_id
             LEFT JOIN roles r ON ur.role_id = r.role_id
             WHERE e.employee_id = $1 AND e.is_active = true
             GROUP BY e.employee_id`,
            [decoded.employee_id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Невалидный токен' });
    }
}

function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return next();
    }
    auth(req, res, next);
}

module.exports = { auth, optionalAuth };
