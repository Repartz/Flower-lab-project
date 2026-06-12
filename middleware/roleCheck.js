function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        const hasRole = req.user.roles.some(r => roles.includes(r));
        if (!hasRole) {
            return res.status(403).json({ error: 'Нет прав для этого действия' });
        }
        next();
    };
}

module.exports = { requireRole };
