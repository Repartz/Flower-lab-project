const Cart = {
    getItems() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    },

    addItem(flower, quantity = 1) {
        const items = this.getItems();
        const existing = items.find(i => i.flower_id === flower.flower_id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            items.push({
                flower_id: flower.flower_id,
                name: flower.name,
                price: flower.price,
                photo_url: flower.photo_url,
                quantity
            });
        }
        localStorage.setItem('cart', JSON.stringify(items));
        this.updateBadge();
    },

    removeItem(flowerId) {
        let items = this.getItems();
        items = items.filter(i => i.flower_id !== flowerId);
        localStorage.setItem('cart', JSON.stringify(items));
        this.updateBadge();
    },

    updateQuantity(flowerId, quantity) {
        const items = this.getItems();
        const item = items.find(i => i.flower_id === flowerId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(flowerId);
                return;
            }
            item.quantity = quantity;
        }
        localStorage.setItem('cart', JSON.stringify(items));
        this.updateBadge();
    },

    getTotal() {
        return this.getItems().reduce((sum, i) => sum + i.price * i.quantity, 0);
    },

    getCount() {
        return this.getItems().reduce((sum, i) => sum + i.quantity, 0);
    },

    clear() {
        localStorage.removeItem('cart');
        this.updateBadge();
    },

    updateBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = this.getCount();
        badges.forEach(b => {
            b.textContent = count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
