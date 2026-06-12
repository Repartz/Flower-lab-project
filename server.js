require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const flowersRoutes = require('./routes/flowers');
const categoriesRoutes = require('./routes/categories');
const ordersRoutes = require('./routes/orders');
const employeesRoutes = require('./routes/employees');
const logsRoutes = require('./routes/logs');

app.use('/api/auth', authRoutes);
app.use('/api/flowers', flowersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/logs', logsRoutes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
