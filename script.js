document.addEventListener('DOMContentLoaded', () => {

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

// =============================================
// CART SYSTEM - Runs globally on products page
// =============================================
let cart = JSON.parse(localStorage.getItem('cartItems')) || [];

const cartCounterEl = document.getElementById('cart-counter');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalEl = document.getElementById('cart-total-price');
const cartFooter = document.getElementById('cart-footer');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const toastContainer = document.getElementById('toast-container');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutBtn = document.getElementById('checkout-btn');

// Initialize on page load
updateCartBadge();
renderCart();

// ---- Cart Drawer Toggle ----
function toggleCart(e) {
    if (e) e.preventDefault();
    if (!cartDrawer) return;
    const isOpen = cartDrawer.classList.contains('open');
    if (isOpen) {
        cartDrawer.classList.remove('open');
        if (cartOverlay) cartOverlay.style.display = 'none';
    } else {
        renderCart();
        cartDrawer.classList.add('open');
        if (cartOverlay) cartOverlay.style.display = 'block';
    }
}

// ---- Render Cart Items ----
function renderCart() {
    if (!cartItemsList) return;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `<p class="empty-cart-msg"><i class="fas fa-box-open"></i><br>Your cart is empty!</p>`;
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    if (cartFooter) cartFooter.style.display = 'block';

    let total = 0;
    cartItemsList.innerHTML = cart.map((item, i) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">$${item.price} each</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="changeQty(${i}, -1)">&#8722;</button>
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${i}, 1)">&#43;</button>
            </div>
            <p class="cart-item-total">$${itemTotal}</p>
        </div>`;
    }).join('');

    if (cartTotalEl) cartTotalEl.innerText = `$${total}`;
}

// ---- Change Quantity ----
function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    renderCart();
    updateCartBadge();
}

// ---- Update Badge Count ----
function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCounterEl) cartCounterEl.innerText = count;
}

// ---- Persist Cart ----
function saveCart() {
    localStorage.setItem('cartItems', JSON.stringify(cart));
}

// ---- Add to Cart Button Handlers ----
const addToCartBtns = document.querySelectorAll('.btn-add-cart');

addToCartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const name = e.target.getAttribute('data-name');
        const price = e.target.getAttribute('data-price');

        // Add or increment item in local cart
        const existing = cart.find(item => item.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ name: name, price: parseFloat(price), qty: 1 });
        }

        saveCart();
        updateCartBadge();
        renderCart();
        showToast(`🛍️ ${name} added to your cart!`);
    });
});

if (checkoutModal) {
    const closeModalBtn = checkoutModal.querySelector('.close-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const modalProductEl = document.getElementById('modal-product-name');
    const priceInput = document.getElementById('checkout-price');

    // Proceed to Checkout from Drawer
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast("Your cart is empty!", true);
                return;
            }

            // Summarize cart for display
            const summary = cart.map(item => `${item.name} (x${item.qty})`).join(', ');
            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            modalProductEl.innerText = `📦 Items: ${summary}`;
            priceInput.value = total;

            // Close drawer and open modal
            toggleCart();
            checkoutModal.style.display = 'flex';
        });
    }

    closeModalBtn.addEventListener('click', () => { checkoutModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target === checkoutModal) checkoutModal.style.display = 'none';
    });

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerName = document.getElementById('checkout-name').value;
        const customerEmail = document.getElementById('checkout-email').value;
        const contactNumber = document.getElementById('checkout-phone').value;
        const deliveryLocation = document.getElementById('checkout-location').value;
        const submitBtn = checkoutForm.querySelector('.btn-submit');

        const summary = cart.map(item => `${item.name} (x${item.qty})`).join(', ');
        const total = priceInput.value;

        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Processing...';
        submitBtn.disabled = true;

        try {
            const isLocalFile = window.location.protocol === 'file:';
            const finalUrl = isLocalFile ? 'http://localhost:3000/api/orders' : '/api/orders';

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: summary,
                    price: total,
                    customerName,
                    customerEmail,
                    contactNumber,
                    deliveryLocation
                })
            });

            if (response.ok) {
                const data = await response.json();
                checkoutModal.style.display = 'none';
                checkoutForm.reset();

                // Populate and show Order Confirmation overlay
                document.getElementById('conf-order-id').innerText = `#${String(data.orderId).padStart(4, '0')}`;
                document.getElementById('conf-product').innerText = summary;
                document.getElementById('conf-price').innerText = `$${total}`;
                document.getElementById('conf-location').innerText = deliveryLocation;
                document.getElementById('order-confirmation').style.display = 'flex';

                // Clear cart after successful order
                cart = [];
                saveCart();
                updateCartBadge();
                renderCart();
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to place order.', true);
            }
        } catch (err) {
            showToast('Network error. Make sure the server is running.', true);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

function closeConfirmation() {
    const overlay = document.getElementById('order-confirmation');
    if (overlay) overlay.style.display = 'none';
}

function showToast(message, isError = false) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' toast-error' : ''}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
