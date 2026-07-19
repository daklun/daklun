// Client Side Interactions & Order Simulator for Angkringan Mas Eja

let MENU_ITEMS = [];
let cart = {}; // maps item.id -> qty

// DOM Elements
const menuContainer = document.getElementById("menu-container");
const menuFilters = document.getElementById("menu-filters");
const plateItemsContainer = document.getElementById("plate-items-container");
const plateEmptyMessage = document.getElementById("plate-empty-message");
const cartItemsList = document.getElementById("cart-items-list");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartTotalEl = document.getElementById("cart-total");
const heroCartCountEl = document.getElementById("hero-cart-count");
const clearCartBtn = document.getElementById("clear-cart-btn");
const sauceContainer = document.getElementById("sauce-selection-container");
const customerNameInput = document.getElementById("customer-name");
const orderNoteInput = document.getElementById("order-note");
const paymentMethodInput = document.getElementById("payment-method");
const paymentInstructionsBox = document.getElementById("payment-instructions-box");
const paymentDetailsText = document.getElementById("payment-details-text");
const waPreviewContent = document.getElementById("wa-preview-content");
const sendWhatsappBtn = document.getElementById("send-whatsapp-btn");
const orderSuccessModal = document.getElementById("order-success-modal");
const orderReceiptContent = document.getElementById("order-receipt-content");
const mobileToggle = document.getElementById("mobile-toggle");
const mobileClose = document.getElementById("mobile-close");
const mobileNav = document.getElementById("mobile-nav");

// WhatsApp Target configuration
const WHATSAPP_NUMBER = "6282329547641"; 

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    try {
        MENU_ITEMS = await db.getMenuItems();
    } catch (err) {
        console.error("Failed to load menu from db:", err);
    }
    renderMenu("all");
    updateCartUI();
    setupEventListeners();
});

function setupEventListeners() {
    // Category filtering
    if (menuFilters) {
        menuFilters.addEventListener("click", (e) => {
            if (e.target.classList.contains("filter-btn")) {
                menuFilters.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
                e.target.classList.add("active");
                const filter = e.target.getAttribute("data-filter");
                renderMenu(filter);
            }
        });
    }

    // Clear cart
    if (clearCartBtn) {
        clearCartBtn.addEventListener("click", () => {
            cart = {};
            // Clear visual coordinates and elements
            Object.keys(plateVisualPositions).forEach(id => {
                removePlateItemVisual(parseInt(id));
            });
            updateCartUI();
        });
    }

    // Sauce selector trigger
    const sauceRadios = document.querySelectorAll('input[name="sauce"]');
    sauceRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.querySelectorAll(".sauce-card").forEach(card => card.classList.remove("active"));
            e.target.closest(".sauce-card").classList.add("active");
            updateWhatsAppPreview();
        });
    });

    // Inputs real-time updates
    if (customerNameInput) customerNameInput.addEventListener("input", updateWhatsAppPreview);
    if (orderNoteInput) orderNoteInput.addEventListener("input", updateWhatsAppPreview);
    if (paymentMethodInput) {
        paymentMethodInput.addEventListener("change", handlePaymentChange);
        paymentMethodInput.addEventListener("change", updateWhatsAppPreview);
    }

    // Submit Pesanan Langsung
    if (sendWhatsappBtn) {
        sendWhatsappBtn.addEventListener("click", submitOrder);
    }

    // Mobile nav toggle
    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener("click", () => mobileNav.classList.add("open"));
    }
    if (mobileClose && mobileNav) {
        mobileClose.addEventListener("click", () => mobileNav.classList.remove("open"));
    }

    // Close on mobile links
    document.querySelectorAll(".mobile-link").forEach(link => {
        link.addEventListener("click", () => {
            if (mobileNav) mobileNav.classList.remove("open");
        });
    });

    // Header sticky shadow & section highlight
    window.addEventListener("scroll", handleScrollHighlight);
}

function getStockStatus(item) {
    if (item.stok_sistem <= 0) {
        return { text: "Habis", class: "status-habis", color: "var(--accent-red)" };
    } else if (item.stok_sistem <= item.stok_minimum) {
        return { text: `Kritis (${item.stok_sistem})`, class: "status-kritis", color: "var(--accent-red)" };
    } else if (item.stok_sistem <= item.stok_minimum * 2) {
        return { text: `Terbatas (${item.stok_sistem})`, class: "status-peringatan", color: "var(--gold)" };
    } else {
        return { text: `Tersedia (${item.stok_sistem})`, class: "status-aman", color: "var(--success)" };
    }
}

function renderMenu(categoryFilter) {
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    
    const filteredItems = categoryFilter === "all" 
        ? MENU_ITEMS 
        : MENU_ITEMS.filter(item => item.category === categoryFilter);
        
    if (filteredItems.length === 0) {
        menuContainer.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1; padding: 40px 0;">
                <i class="fa-solid fa-folder-open text-muted" style="font-size: 2.2rem; margin-bottom: 8px;"></i>
                <p>Menu kategori ini tidak tersedia.</p>
            </div>
        `;
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        
        let categoryName = "Menu Utama";
        if (item.category === "sate") categoryName = "Sate-Satean";
        if (item.category === "minuman") categoryName = "Wedangan / Es";

        const imgUrl = (item.image && (item.image.startsWith("data:") || item.image.startsWith("http") || item.image.startsWith("assets/") || item.image.startsWith("/"))) 
            ? item.image 
            : (item.image ? `assets/${item.image}` : '');

        const status = getStockStatus(item);

        card.innerHTML = `
            <div class="menu-img-container">
                <span class="menu-badge">${categoryName}</span>
                <span class="menu-stock-badge ${status.class}" style="position: absolute; top: 16px; right: 16px; font-size: 0.7rem; font-weight: 800; background: rgba(0,0,0,0.65); padding: 4px 10px; border-radius: 50px; border: 1px solid ${status.color}; color: ${status.color};">${status.text}</span>
                ${imgUrl ? `<img src="${imgUrl}" alt="${item.name}" class="menu-card-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">` : ''}
                <span class="menu-icon-graphic" style="${imgUrl ? 'display: none;' : ''}">${item.emoji}</span>
            </div>
            <div class="menu-info">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent); margin-bottom: 2px;">${item.code || ""}</div>
                <h3 style="margin-top: 0;">${item.name}</h3>
                <p>${item.description}</p>
                <div class="menu-footer">
                    <span class="menu-price">${formatRupiah(item.price)}</span>
                    <button class="btn-add-item" onclick="addToCart(${item.id})" aria-label="Tambah ${item.name}" ${item.stok_sistem <= 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

// Cart Mechanics
window.addToCart = function(id) {
    const item = MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    const currentQty = cart[id] || 0;
    if (item.stok_sistem <= 0) {
        alert(`Maaf, stok ${item.name} sedang habis!`);
        return;
    }
    if (currentQty >= item.stok_sistem) {
        alert(`Maaf, Anda tidak dapat memesan ${item.name} melebihi sisa stok kami (${item.stok_sistem} pcs).`);
        return;
    }

    if (cart[id]) {
        cart[id]++;
    } else {
        cart[id] = 1;
    }
    updateCartUI();
    animatePlateItem(id);
};

window.decreaseQty = function(id) {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] === 0) {
            delete cart[id];
            removePlateItemVisual(id);
        }
    }
    updateCartUI();
};

window.increaseQty = function(id) {
    const item = MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    const currentQty = cart[id] || 0;
    if (currentQty >= item.stok_sistem) {
        alert(`Maaf, Anda tidak dapat memesan ${item.name} melebihi sisa stok kami (${item.stok_sistem} pcs).`);
        return;
    }

    if (cart[id]) {
        cart[id]++;
    }
    updateCartUI();
};

function updateCartUI() {
    if (!cartItemsList) return;
    cartItemsList.innerHTML = "";
    
    let totalItems = 0;
    let subtotal = 0;
    let containsSate = false;

    Object.keys(cart).forEach(id => {
        const itemId = parseInt(id);
        const item = MENU_ITEMS.find(m => m.id === itemId);
        if (!item) return;

        const qty = cart[id];
        totalItems += qty;
        const lineTotal = item.price * qty;
        subtotal += lineTotal;

        if (item.category === "sate") {
            containsSate = true;
        }

        const row = document.createElement("div");
        row.className = "cart-item";
        
        let dotColor = "var(--accent)";
        if (item.category === "sate") dotColor = "var(--success)";
        if (item.category === "minuman") dotColor = "#00b4d8";

        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-dot" style="background-color: ${dotColor}"></span>
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatRupiah(item.price)} x ${qty}</div>
                </div>
            </div>
            <div class="cart-item-controls">
                <button class="btn-qty" onclick="decreaseQty(${itemId})"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-val">${qty}</span>
                <button class="btn-qty" onclick="increaseQty(${itemId})"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        cartItemsList.appendChild(row);
        
        // Update plate graphic
        updatePlateItemVisual(item, qty);
    });

    if (totalItems === 0) {
        if (plateEmptyMessage) plateEmptyMessage.style.display = "block";
        cartItemsList.innerHTML = `
            <div class="text-center text-muted" style="padding: 24px 0;">
                <i class="fa-solid fa-basket-shopping" style="font-size: 2.2rem; margin-bottom: 8px;"></i>
                <p>Silakan pilih menu untuk memulai pesanan Anda</p>
            </div>
        `;
        if (sauceContainer) sauceContainer.style.display = "none";
    } else {
        if (plateEmptyMessage) plateEmptyMessage.style.display = "none";
        if (sauceContainer) sauceContainer.style.display = containsSate ? "block" : "none";
    }

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatRupiah(subtotal);
    if (cartTotalEl) cartTotalEl.textContent = formatRupiah(subtotal);
    if (heroCartCountEl) heroCartCountEl.textContent = totalItems;

    updateWhatsAppPreview();
}

// Visual Plate Skew Coordinates
const plateVisualPositions = {}; // maps item.id -> {x, y, rotation}

function animatePlateItem(id) {
    const item = MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    if (!plateVisualPositions[id]) {
        // Polar coordinates inside green leaf base (radius max 100px)
        const maxRadius = 90; 
        const radius = Math.random() * maxRadius;
        const angle = Math.random() * 2 * Math.PI;
        
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius);
        const rotation = Math.round(Math.random() * 360);

        plateVisualPositions[id] = { x, y, rotation };
    }
}

function updatePlateItemVisual(item, qty) {
    if (!plateItemsContainer) return;
    animatePlateItem(item.id);

    let visualItem = document.getElementById(`plate-visual-${item.id}`);
    const pos = plateVisualPositions[item.id];

    if (!visualItem) {
        visualItem = document.createElement("div");
        visualItem.id = `plate-visual-${item.id}`;
        visualItem.className = "floating-plate-item";
        
        // Position relative to center
        visualItem.style.left = `calc(50% + ${pos.x}px - 26px)`;
        visualItem.style.top = `calc(50% + ${pos.y}px - 26px)`;
        
        visualItem.innerHTML = `
            <span class="item-icon" style="transform: rotate(${pos.rotation}deg); display: inline-block;">${item.emoji}</span>
            <span class="item-badge" id="plate-badge-${item.id}">${qty}</span>
        `;
        
        visualItem.addEventListener("click", () => {
            addToCart(item.id);
        });

        plateItemsContainer.appendChild(visualItem);
    } else {
        const badge = document.getElementById(`plate-badge-${item.id}`);
        if (badge) badge.textContent = qty;
    }
}

function removePlateItemVisual(id) {
    const visualItem = document.getElementById(`plate-visual-${id}`);
    if (visualItem) {
        visualItem.classList.add("removing");
        visualItem.style.transform = "scale(0) rotate(180deg)";
        visualItem.style.opacity = "0";
        setTimeout(() => {
            visualItem.remove();
        }, 300);
    }
    delete plateVisualPositions[id];
}

// Build WhatsApp Text
function buildWhatsAppMessage() {
    const itemKeys = Object.keys(cart);
    if (itemKeys.length === 0) return "";

    const name = (customerNameInput && customerNameInput.value.trim()) || "Pelanggan";
    const note = (orderNoteInput && orderNoteInput.value.trim()) || "-";
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : "Cash / Bayar di Tempat";
    const selectedSauceRadio = document.querySelector('input[name="sauce"]:checked');
    const sauce = selectedSauceRadio ? selectedSauceRadio.value : "Original";

    let hasSate = false;
    let text = `*HALO ANGKRINGAN MAS EJA* 👋\n`;
    text += `Saya ingin memesan menu lesehan berikut:\n\n`;
    text += `*DAFTAR PESANAN:*\n`;

    let totalSum = 0;
    itemKeys.forEach(id => {
        const item = MENU_ITEMS.find(m => m.id === parseInt(id));
        if (!item) return;

        const qty = cart[id];
        const cost = item.price * qty;
        totalSum += cost;

        if (item.category === "sate") hasSate = true;

        text += `• *${qty}x* [${item.code || ""}] ${item.name} (${formatRupiah(item.price)})\n`;
    });

    if (hasSate) {
        text += `\n*PILIHAN COCOLAN/BUMBU SATE:* ${sauce}\n`;
    }

    text += `\n*DETAIL PEMESAN:*`;
    text += `\n• Nama: ${name}`;
    text += `\n• Catatan Tambahan: _"${note}"_`;
    text += `\n• Metode Pembayaran: ${paymentMethod}`;
    
    text += `\n\n*ESTIMASI TOTAL HARGA:* *${formatRupiah(totalSum)}*\n`;
    text += `\n_Mohon konfirmasi ketersediaan menu ya kak. Terima kasih!_`;

    return text;
}

function updateWhatsAppPreview() {
    if (!waPreviewContent || !sendWhatsappBtn) return;
    // Hitung total
    let total = 0;
    let itemCount = 0;
    Object.entries(cart).forEach(([id, qty]) => {
        const item = MENU_ITEMS.find(m => m.id === parseInt(id));
        if (item) { total += item.price * qty; itemCount += qty; }
    });

    if (itemCount === 0) {
        waPreviewContent.textContent = "Piring virtual Anda masih kosong...";
        sendWhatsappBtn.disabled = true;
        sendWhatsappBtn.style.opacity = "0.5";
        sendWhatsappBtn.style.cursor = "not-allowed";
    } else {
        let preview = `📋 RINGKASAN PESANAN\n`;
        preview += `${'─'.repeat(30)}\n`;
        Object.entries(cart).forEach(([id, qty]) => {
            const item = MENU_ITEMS.find(m => m.id === parseInt(id));
            if (item) preview += `${item.emoji} ${qty}x ${item.name} — ${formatRupiah(item.price * qty)}\n`;
        });
        preview += `${'─'.repeat(30)}\n`;
        preview += `💰 TOTAL: ${formatRupiah(total)}`;
        waPreviewContent.textContent = preview;
        sendWhatsappBtn.disabled = false;
        sendWhatsappBtn.style.opacity = "1";
        sendWhatsappBtn.style.cursor = "pointer";
    }
}

async function submitOrder() {
    const name = customerNameInput ? customerNameInput.value.trim() : "";
    const note = orderNoteInput ? orderNoteInput.value.trim() : "";
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : "Bayar di Tempat";

    if (!name) {
        customerNameInput && customerNameInput.focus();
        customerNameInput && (customerNameInput.style.border = "2px solid #ef4444");
        setTimeout(() => customerNameInput && (customerNameInput.style.border = ""), 2000);
        return;
    }

    // Build items list
    const orderItems = [];
    let totalSum = 0;
    Object.entries(cart).forEach(([id, qty]) => {
        const item = MENU_ITEMS.find(m => m.id === parseInt(id));
        if (item) {
            orderItems.push({ id: item.id, name: item.name, code: item.code || "", price: item.price, qty, emoji: item.emoji });
            totalSum += item.price * qty;
        }
    });

    if (orderItems.length === 0) return;

    // Disable button saat loading
    sendWhatsappBtn.disabled = true;
    sendWhatsappBtn.textContent = "⏳ Memproses...";

    const transaction = {
        customer_name: name,
        items: JSON.stringify(orderItems),
        total: totalSum,
        payment_method: paymentMethod,
        note: note,
        status: "pending",
        source: "online",
        timestamp: new Date().toISOString()
    };

    try {
        await db.saveTransaction(transaction);
    } catch (err) {
        console.error("Gagal menyimpan pesanan:", err);
    }

    // Tampilkan struk konfirmasi
    showOrderSuccess(name, orderItems, totalSum, paymentMethod, note);

    // Reset cart
    cart = {};
    updateCartUI();
    if (customerNameInput) customerNameInput.value = "";
    if (orderNoteInput) orderNoteInput.value = "";
    sendWhatsappBtn.disabled = false;
    sendWhatsappBtn.innerHTML = '✅ Konfirmasi Pesanan';
}

function showOrderSuccess(name, items, total, paymentMethod, note) {
    if (!orderSuccessModal || !orderReceiptContent) return;

    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    const orderNum = Math.floor(Math.random() * 900 + 100);

    let html = `
        <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:3rem;">✅</div>
            <h2 style="color:#22c55e; margin:8px 0 4px;">Pesanan Diterima!</h2>
            <p style="color:#9ca3af; font-size:0.85rem;">No. Antrian: <strong style="color:#f97316; font-size:1.2rem;">#${orderNum}</strong></p>
        </div>
        <div style="background:#1a1a2e; border-radius:12px; padding:16px; margin-bottom:12px; font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:#9ca3af;">Pelanggan</span><strong>${name}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:#9ca3af;">Waktu</span><span>${timeStr}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:#9ca3af;">Pembayaran</span><span>${paymentMethod}</span>
            </div>
        </div>
        <div style="background:#1a1a2e; border-radius:12px; padding:16px; margin-bottom:12px;">
            <p style="color:#9ca3af; font-size:0.75rem; margin:0 0 10px; text-transform:uppercase; letter-spacing:1px;">Pesanan Anda</p>
            ${items.map(i => `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.85rem;">
                    <span>${i.emoji} ${i.qty}x ${i.name}</span>
                    <strong>${formatRupiah(i.price * i.qty)}</strong>
                </div>`).join("")}
            <div style="border-top:1px solid #374151; margin-top:10px; padding-top:10px; display:flex; justify-content:space-between;">
                <strong>TOTAL</strong>
                <strong style="color:#f97316; font-size:1.1rem;">${formatRupiah(total)}</strong>
            </div>
        </div>
        ${note ? `<div style="background:#1a1a2e; border-radius:12px; padding:12px; margin-bottom:12px; font-size:0.85rem;"><span style="color:#9ca3af;">Catatan: </span>${note}</div>` : ""}
        <p style="text-align:center; color:#9ca3af; font-size:0.8rem;">Silakan tunjukkan nomor antrian <strong style="color:#f97316;">#${orderNum}</strong> ke kasir 🙏</p>
    `;

    orderReceiptContent.innerHTML = html;
    orderSuccessModal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function handlePaymentChange() {
    if (!paymentMethodInput || !paymentInstructionsBox || !paymentDetailsText) return;
    const method = paymentMethodInput.value;
    if (method === "Transfer Bank BCA") {
        paymentDetailsText.innerHTML = "<strong>Instruksi Transfer BCA:</strong><br>Silakan transfer ke rekening BCA <strong>82329547641</strong> a.n. <strong>Eja Sutrisno</strong>.<br>Kirim bukti transfer bersama pesan WhatsApp ini.";
        paymentInstructionsBox.style.display = "block";
    } else if (method === "QRIS / E-Wallet") {
        paymentDetailsText.innerHTML = "<strong>Instruksi QRIS/E-Wallet:</strong><br>Silakan scan kode QRIS di meja kasir atau transfer E-Wallet ke nomor <strong>082329547641</strong>.<br>Kirim bukti bayar bersama pesan WhatsApp ini.";
        paymentInstructionsBox.style.display = "block";
    } else {
        paymentInstructionsBox.style.display = "none";
    }
}

function handleScrollHighlight() {
    const scrollPosition = window.scrollY + 100;
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-links a");

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute("id");

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove("active");
                if (link.getAttribute("href") === `#${sectionId}`) {
                    link.classList.add("active");
                }
            });
        }
    });

    const navbar = document.querySelector(".navbar-container");
    if (navbar) {
        if (window.scrollY > 20) {
            navbar.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
            navbar.style.background = "rgba(10, 10, 12, 0.95)";
        } else {
            navbar.style.boxShadow = "none";
            navbar.style.background = "rgba(10, 10, 12, 0.85)";
        }
    }
}
