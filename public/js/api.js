const API_BASE = '/api';

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(API_BASE + url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса');
    }
    return data;
}

const api = {
    get: (url) => apiRequest(url),
    post: (url, body) => apiRequest(url, { method: 'POST', body }),
    put: (url, body) => apiRequest(url, { method: 'PUT', body }),
    delete: (url) => apiRequest(url, { method: 'DELETE' }),

    upload: (url, formData) => {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return fetch(API_BASE + url, {
            method: 'POST',
            headers,
            body: formData
        }).then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Ошибка загрузки');
            return data;
        });
    },

    uploadPut: (url, formData) => {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return fetch(API_BASE + url, {
            method: 'PUT',
            headers,
            body: formData
        }).then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Ошибка загрузки');
            return data;
        });
    },

    auth: {
        login: (login, password) => apiRequest('/auth/login', { method: 'POST', body: { login, password } }),
        me: () => apiRequest('/auth/me'),
        logout: () => apiRequest('/auth/logout', { method: 'POST' })
    },

    flowers: {
        list: (params) => {
            const qs = new URLSearchParams(params).toString();
            return apiRequest('/flowers' + (qs ? '?' + qs : ''));
        },
        get: (id) => apiRequest('/flowers/' + id),
        create: (formData) => api.upload('/flowers', formData),
        update: (id, formData) => api.uploadPut('/flowers/' + id, formData),
        delete: (id) => apiRequest('/flowers/' + id, { method: 'DELETE' })
    },

    categories: {
        list: () => apiRequest('/categories'),
        create: (body) => apiRequest('/categories', { method: 'POST', body }),
        update: (id, body) => apiRequest('/categories/' + id, { method: 'PUT', body }),
        delete: (id) => apiRequest('/categories/' + id, { method: 'DELETE' })
    },

    orders: {
        create: (body) => apiRequest('/orders', { method: 'POST', body }),
        list: (params) => {
            const qs = new URLSearchParams(params).toString();
            return apiRequest('/orders' + (qs ? '?' + qs : ''));
        },
        get: (id) => apiRequest('/orders/' + id),
        updateStatus: (id, status) => apiRequest('/orders/' + id + '/status', { method: 'PUT', body: { status } }),
        delete: (id) => apiRequest('/orders/' + id, { method: 'DELETE' })
    },

    employees: {
        list: () => apiRequest('/employees'),
        create: (body) => apiRequest('/employees', { method: 'POST', body }),
        update: (id, body) => apiRequest('/employees/' + id, { method: 'PUT', body }),
        delete: (id) => apiRequest('/employees/' + id, { method: 'DELETE' })
    },

    logs: {
        list: (params) => {
            const qs = new URLSearchParams(params).toString();
            return apiRequest('/logs' + (qs ? '?' + qs : ''));
        }
    }
};
