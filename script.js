document.addEventListener('DOMContentLoaded', () => {

    // 1. Cursor Glow Tracker
    const cursorGlow = document.getElementById('cursor-glow');
    document.addEventListener('mousemove', (e) => {
        if (cursorGlow) {
            cursorGlow.style.left = `${e.clientX}px`;
            cursorGlow.style.top = `${e.clientY}px`;
        }
    });

    // Toggle active glow on interactive elements
    document.querySelectorAll('a, button, .product-card, .photo-stack-item').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('glow-active'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('glow-active'));
    });

    // 2. Live Preview & Printing Animation (Mini Only)
    const photoUpload = document.getElementById('photo-upload');
    const previewHolder = document.getElementById('preview-image-holder');
    const polaroidFrame = document.getElementById('polaroid-frame');
    const shutter = document.getElementById('shutter');

    if (photoUpload && previewHolder) {
        photoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Trigger Shutter
                if (shutter) {
                    shutter.classList.add('shutter-active');
                    setTimeout(() => shutter.classList.remove('shutter-active'), 500);
                }

                // Prepare photo
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Slight delay to simulate printing after shutter
                    setTimeout(() => {
                        previewHolder.style.backgroundImage = `url('${event.target.result}')`;
                        previewHolder.innerHTML = '';

                        // Trigger slide-out animation
                        if (polaroidFrame) {
                            polaroidFrame.style.animation = 'none';
                            polaroidFrame.offsetHeight; // trigger reflow
                            polaroidFrame.style.animation = 'polaroidPrint 1.5s cubic-bezier(0.23, 1, 0.32, 1) forwards';
                        }
                    }, 400);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // 4. Scroll Reveal Animation using Intersection Observer
    const revealOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        let delay = 0;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Apply stagger delay to cards
                if (entry.target.classList.contains('product-card') || entry.target.classList.contains('showcase-card')) {
                    entry.target.style.transitionDelay = `${delay}s`;
                    delay += 0.15;
                }
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, revealOptions);

    // 7. 3D Tilt Effect
    document.querySelectorAll('.interactive-card').forEach(card => {
        const inner = card.querySelector('.card-inner');
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (centerY - y) / 10;
            const rotateY = (x - centerX) / 10;
            inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            inner.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
    });

    const elementsToReveal = document.querySelectorAll('.section-title, .product-card, .contact-container, .why-card, .hero-content, .lets-connect, .glass-panel, .showcase-card');
    elementsToReveal.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        revealObserver.observe(el);
    });

    // Add CSS class for reveal
    const stylePopup = document.createElement('style');
    stylePopup.innerHTML = `
        .revealed { opacity: 1 !important; transform: translateY(0) !important; }
    `;
    document.head.appendChild(stylePopup);

    // 5. Sticky Cart Bar Logic
    const stickyBar = document.getElementById('sticky-cart');
    const stickyName = document.getElementById('sticky-name');
    const stickyPrice = document.getElementById('sticky-price');
    const stickyBtn = document.getElementById('sticky-add-btn');

    if (stickyBar) {
        window.addEventListener('scroll', () => {
            const productGrid = document.querySelector('.premium-grid');
            if (productGrid) {
                const rect = productGrid.getBoundingClientRect();
                if (rect.top < 0 && rect.bottom > 100) {
                    stickyBar.classList.add('visible');
                } else {
                    stickyBar.classList.remove('visible');
                }
            }
        });

        // Track active product for sticky bar
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                const name = card.querySelector('h3').innerText;
                const price = card.querySelector('.product-price').innerText;
                const pack = card.querySelector('.variant-btn.active')?.innerText || '8 Pack';

                stickyName.innerText = name;
                stickyPrice.innerText = `${pack} — ${price}`;

                // Link sticky button data to current card
                const addBtn = card.querySelector('.btn-add-cart');
                stickyBtn.setAttribute('data-name', addBtn.getAttribute('data-name'));
                stickyBtn.setAttribute('data-price', addBtn.getAttribute('data-price'));
                stickyBtn.setAttribute('data-pack', addBtn.getAttribute('data-pack'));
            });
        });

        // Sticky button click logic (mirrors main add to cart)
        stickyBtn.addEventListener('click', (e) => {
            const name = e.currentTarget.getAttribute('data-name');
            if (!name) return;
            const price = e.currentTarget.getAttribute('data-price');
            const pack = e.currentTarget.getAttribute('data-pack');

            addToCartBtnHandler(name, price, pack);

            e.currentTarget.classList.add('btn-pulsing');
            setTimeout(() => e.currentTarget.classList.remove('btn-pulsing'), 400);
        });
    }
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

// ---- Mobile Drawer Listeners ----
const mobileCartBtn = document.getElementById('mobile-cart-btn');
if (mobileCartBtn) {
    mobileCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleCart();
    });
}

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
                <p class="cart-item-price">₹${item.price} each</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="changeQty(${i}, -1)">&#8722;</button>
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${i}, 1)">&#43;</button>
            </div>
            <p class="cart-item-total">₹${itemTotal}</p>
        </div>`;
    }).join('');

    if (cartTotalEl) cartTotalEl.innerText = `₹${total}`;
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

    // Update mobile badges
    const mobileBadges = document.querySelectorAll('.mobile-badge');
    mobileBadges.forEach(badge => {
        badge.innerText = count;
        // Pulse animation
        badge.classList.remove('pulse-active');
        void badge.offsetWidth; // trigger reflow
        badge.classList.add('pulse-active');
    });
}

// ---- Persist Cart ----
function saveCart() {
    localStorage.setItem('cartItems', JSON.stringify(cart));
}

// ---- Variant Selection Logic ----
const variantBtns = document.querySelectorAll('.variant-btn');

variantBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        const packSize = e.target.getAttribute('data-pack');
        const price = e.target.getAttribute('data-price');
        const addBtn = card.querySelector('.btn-add-cart');
        const priceDisplay = card.querySelector('.product-price');

        // Update active button
        card.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Shimmer effect on switch
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'slideUpFade 0.5s ease-out';

        // Update UI and button data
        if (priceDisplay) {
            priceDisplay.style.transform = 'scale(1.2)';
            priceDisplay.style.transition = 'transform 0.2s';
            setTimeout(() => priceDisplay.style.transform = 'scale(1)', 200);
            priceDisplay.innerText = `₹${price}`;
        }

        if (addBtn) {
            addBtn.setAttribute('data-price', price);
            addBtn.setAttribute('data-pack', packSize);
        }
    });
});

// ---- Add to Cart Processing Helper ----
function addToCartBtnHandler(baseName, price, packSize) {
    const fullName = `${baseName} (${packSize} Pack)`;
    const existing = cart.find(item => item.name === fullName);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name: fullName, price: parseFloat(price), qty: 1 });
    }
    saveCart();
    updateCartBadge();
    renderCart();
    showToast(`🛍️ ${fullName} added to your cart!`);
}

// ---- Add to Cart Button Handlers ----
const addToCartBtns = document.querySelectorAll('.btn-add-cart');

addToCartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.currentTarget.closest && e.currentTarget.closest('#sticky-cart')) return;

        // Use currentTarget (the button) not e.target (could be the inner <span>)
        const btnEl = e.currentTarget;
        const baseName = btnEl.getAttribute('data-name');
        const price = btnEl.getAttribute('data-price');
        const packSize = btnEl.getAttribute('data-pack');

        addToCartBtnHandler(baseName, price, packSize);

        btnEl.classList.add('btn-pulsing');
        setTimeout(() => btnEl.classList.remove('btn-pulsing'), 400);
    });
});

// ---- Modal & Toast Utils ----
if (checkoutModal) {
    const closeModalBtn = checkoutModal.querySelector('.close-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const modalProductEl = document.getElementById('modal-product-name');
    const priceInput = document.getElementById('checkout-price');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast("Your cart is empty!", true);
                return;
            }
            const summary = cart.map(item => `${item.name} (x${item.qty})`).join(', ');
            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            if (modalProductEl) modalProductEl.innerText = `📦 Items: ${summary}`;
            if (priceInput) priceInput.value = total;

            toggleCart();
            checkoutModal.style.display = 'flex';
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { checkoutModal.style.display = 'none'; });

    if (checkoutForm) {

        const proceedBtn = document.getElementById('proceed-to-pay-btn');
        const backBtn = document.getElementById('back-to-details-btn');
        const detailsView = document.getElementById('checkout-details-view');
        const paymentView = document.getElementById('checkout-payment-view');

        // Handle View Transitions
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                // Ensure required fields in the first view are legally filled
                const nameValid = document.getElementById('checkout-name').reportValidity();
                const emailValid = document.getElementById('checkout-email').reportValidity();
                const phoneValid = document.getElementById('checkout-phone').reportValidity();
                const locationValid = document.getElementById('checkout-location').reportValidity();

                if (nameValid && emailValid && phoneValid && locationValid) {
                    detailsView.style.display = 'none';
                    paymentView.style.display = 'block';
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                paymentView.style.display = 'none';
                detailsView.style.display = 'block';
            });
        }

        // Final Submission (With UTR verification)
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('pay-confirm-btn');
            const summary = cart.map(item => `${item.name} (x${item.qty})`).join(', ');
            const total = priceInput.value;

            const utrNumber = document.getElementById('checkout-utr').value.trim();
            if (utrNumber.length !== 12) {
                showToast("Please enter a valid 12-digit UPI UTR number.", true);
                return;
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Confirming Order...';
            submitBtn.disabled = true;

            const customerName = document.getElementById('checkout-name').value;
            const customerEmail = document.getElementById('checkout-email').value;
            const contactNumber = document.getElementById('checkout-phone').value;
            const deliveryLocation = document.getElementById('checkout-location').value;

            try {
                const isLocalFile = window.location.protocol === 'file:';
                const finalUrl = isLocalFile ? 'http://localhost:3000/api/orders' : '/api/orders';

                const backendResponse = await fetch(finalUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productName: summary,
                        price: total,
                        customerName: customerName,
                        customerEmail: customerEmail,
                        contactNumber: contactNumber,
                        deliveryLocation: deliveryLocation,
                        paymentId: utrNumber // Saving UTR as Payment ID
                    })
                });

                if (backendResponse.ok) {
                    const data = await backendResponse.json();

                    // Reset Views
                    checkoutModal.style.display = 'none';
                    detailsView.style.display = 'block';
                    paymentView.style.display = 'none';
                    checkoutForm.reset();

                    // Show Order Confirmation overlay
                    document.getElementById('conf-order-id').innerText = `#${String(data.orderId).padStart(4, '0')}`;
                    document.getElementById('order-confirmation').style.display = 'flex';

                    // WhatsApp Integration
                    const waAdminNumber = "919014169974";
                    let waText = `Hello Pixora CuteClicks! 💜\n\nI have placed a new order on your website.\n\n*Order ID:* #${String(data.orderId).padStart(4, '0')}\n*Items:* ${summary}\n*Total Price:* ₹${total}\n*Advance Paid:* ₹100\n*UPI UTR Ref:* ${utrNumber}\n\n*Customer Details:*\nName: ${customerName}\nPhone: ${contactNumber}\nDelivery: ${deliveryLocation}\n\nPlease confirm my order! ✨`;
                    const waUrl = `https://wa.me/${waAdminNumber}?text=${encodeURIComponent(waText)}`;

                    window.open(waUrl, '_blank');

                    cart = [];
                    saveCart();
                    updateCartBadge();
                    renderCart();
                } else {
                    const data = await backendResponse.json();
                    showToast(data.error || 'Failed to confirm order with server.', true);
                }
            } catch (err) {
                showToast('Network error while saving order.', true);
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
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
