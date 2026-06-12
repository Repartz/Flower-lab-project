async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return null;
    }
    try {
        const data = await api.auth.me();
        return data.user;
    } catch (err) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return null;
    }
}

function isAdmin(user) {
    return user && user.roles && user.roles.includes('Admin');
}

function isManager(user) {
    return user && user.roles && (user.roles.includes('Admin') || user.roles.includes('Manager'));
}

function renderAdminSidebar(activePage) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdminUser = isAdmin(user);

    return `
        <nav class="admin-sidebar">
            <div class="sidebar-header">
                <a href="/" class="sidebar-logo">FLOWER LAB</a>
            </div>
            <ul class="sidebar-nav">
                <li><a href="/admin/dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
                <li><a href="/admin/orders.html" class="${activePage === 'orders' ? 'active' : ''}">Заказы</a></li>
                <li><a href="/admin/flowers.html" class="${activePage === 'flowers' ? 'active' : ''}">Товары</a></li>
                <li><a href="/admin/categories.html" class="${activePage === 'categories' ? 'active' : ''}">Категории</a></li>
                ${isAdminUser ? `<li><a href="/admin/employees.html" class="${activePage === 'employees' ? 'active' : ''}">Сотрудники</a></li>` : ''}
                ${isManager(user) ? `<li><a href="/admin/logs.html" class="${activePage === 'logs' ? 'active' : ''}">Логи</a></li>` : ''}
                <li class="sidebar-divider"></li>
                <li><a href="/">На сайт</a></li>
                <li><a href="#" onclick="logout()">Выйти</a></li>
            </ul>
            <div class="sidebar-user">
                <span>${user.full_name || 'Сотрудник'}</span>
                <small>${(user.roles || []).join(', ')}</small>
            </div>
        </nav>
    `;
}

async function logout() {
    try {
        await api.auth.logout();
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}
