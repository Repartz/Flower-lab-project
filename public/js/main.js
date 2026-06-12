function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function showError(msg) {
    const el = document.getElementById('error-message');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

function showSuccess(msg) {
    const el = document.getElementById('success-message');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
}

function showLoader(container) {
    if (container) {
        container.innerHTML = '<div class="loader">Загрузка...</div>';
    }
}

function getParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
}

function setParams(params) {
    const qs = new URLSearchParams(params).toString();
    window.location.search = qs;
}

const statusLabels = {
    'new': 'Новый',
    'assembled': 'Собран',
    'in_delivery': 'В доставке',
    'delivered': 'Доставлен',
    'cancelled': 'Отменён'
};

const statusClasses = {
    'new': 'status-new',
    'assembled': 'status-assembled',
    'in_delivery': 'status-delivery',
    'delivered': 'status-delivered',
    'cancelled': 'status-cancelled'
};

const actionLabels = {
    'CREATE': 'Создание',
    'UPDATE': 'Обновление',
    'DELETE': 'Удаление',
    'LOGIN': 'Вход',
    'LOGOUT': 'Выход',
    'STATUS_CHANGE': 'Смена статуса'
};

function imageOrPlaceholder(url) {
    return url || 'https://via.placeholder.com/300x300?text=Нет+фото';
}
