// Administrative Panel & Cashier Logic for Angkringan Mas Eja

// Auth State
let isLoggedIn = localStorage.getItem("admin_logged_in") === "true";
const ADMIN_PIN = "1234";

// Global Loaded Data Cache
let MENU_ITEMS = [];
let TRANSACTIONS = [];
let BONS = [];
let EXPENSES = [];
let WASTES = [];
let PELANGGAN = [];

// POS State
let posCart = {}; // maps item.id -> qty

// DOM Elements
const authOverlay = document.getElementById("auth-overlay");
const adminPinInput = document.getElementById("admin-pin");
const authError = document.getElementById("auth-error");
const btnLoginSubmit = document.getElementById("btn-login-submit");
const btnLogout = document.getElementById("btn-logout");
const connectionStatus = document.getElementById("connection-status");

const posBonSelect = document.getElementById("pos-bon-select");
const partialPayModal = document.getElementById("partial-pay-modal");
const btnPartialCancel = document.getElementById("btn-partial-cancel");
const btnPartialConfirm = document.getElementById("btn-partial-confirm");
const partialBonSelect = document.getElementById("partial-bon-select");
const partialBonName = document.getElementById("partial-bon-name");
const partialBonWhatsapp = document.getElementById("partial-bon-whatsapp");

// Tab switching
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Modal Elements
const itemModal = document.getElementById("item-modal");
const itemForm = document.getElementById("item-form");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnModalCancel = document.getElementById("btn-modal-cancel");
const btnAddNewMenuItem = document.getElementById("btn-add-menu-item-modal");
const modalTitle = document.getElementById("modal-title");

// Receipt Modal Elements
const receiptModal = document.getElementById("receipt-modal");
const receiptPaperWrapper = document.getElementById("receipt-paper-wrapper");
const receiptCloseBtn = document.getElementById("receipt-close-btn");
const btnPrintClose = document.getElementById("btn-print-close");
const btnPrintAction = document.getElementById("btn-print-action");

// Initialize Panel
document.addEventListener("DOMContentLoaded", async () => {
    checkAuthentication();
    setupTabSwitching();
    setupConfigForms();
    setupImageUpload();

    if (isLoggedIn) {
        await loadAllData();
        setupDashboardTab();
        setupPOSTab();
        setupStokTab();
        setupBonTab();
        setupPelangganTab();
        setupLaporanTab();
        updateDBBadge();
    }
});

// Authentication
function checkAuthentication() {
    if (!isLoggedIn) {
        authOverlay.style.display = "flex";
        if (btnLogout) btnLogout.style.display = "none";
        
        btnLoginSubmit.addEventListener("click", () => {
            const enteredPin = adminPinInput.value;
            if (enteredPin === ADMIN_PIN) {
                isLoggedIn = true;
                localStorage.setItem("admin_logged_in", "true");
                authOverlay.style.display = "none";
                window.location.reload();
            } else {
                authError.style.display = "block";
                adminPinInput.value = "";
            }
        });
        
        adminPinInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") btnLoginSubmit.click();
        });
    } else {
        authOverlay.style.display = "none";
        if (btnLogout) {
            btnLogout.style.display = "inline-flex";
            btnLogout.addEventListener("click", () => {
                isLoggedIn = false;
                localStorage.setItem("admin_logged_in", "false");
                window.location.reload();
            });
        }
    }
}

// Fetch all from Local/Cloud DB
async function loadAllData() {
    try {
        MENU_ITEMS = await db.getMenuItems();
        TRANSACTIONS = await db.getTransactions();
        BONS = await db.getBons();
        EXPENSES = await db.getExpenses();
        WASTES = await db.getFoodWaste();
        PELANGGAN = await db.getPelanggan();
    } catch (err) {
        console.error("Error loading operational databases:", err);
    }
}

function updateDBBadge() {
    if (!connectionStatus) return;
    const client = db.getSupabase();
    if (client) {
        connectionStatus.textContent = "Supabase Cloud";
        connectionStatus.className = "db-badge connected";
    } else {
        connectionStatus.textContent = "Lokal (Browser)";
        connectionStatus.className = "db-badge local";
    }
}

// Tab Switching Routing
function setupTabSwitching() {
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            const targetTab = btn.getAttribute("data-tab");
            const targetContent = document.getElementById(`content-${targetTab}`);
            if (targetContent) targetContent.classList.add("active");
            
            // Reload context specific stuff
            if (targetTab === "dasbor") renderDashboardStats();
            if (targetTab === "kasir") renderPOSMenu();
            if (targetTab === "stok") renderStokTables();
            if (targetTab === "bon") renderBonTable();
            if (targetTab === "pelanggan") renderPelangganTable();
            if (targetTab === "laporan") renderLaporanPembukuan();
        });
    });
}

// Toast Notification
function showToast(message, type = "success") {
    let toast = document.getElementById("admin-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "admin-toast";
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            padding: 14px 20px; border-radius: 10px; font-size: 0.9rem;
            font-weight: 600; max-width: 380px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            transition: opacity 0.4s; opacity: 0; pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === "success" ? "#16a34a" : type === "warning" ? "#d97706" : "#dc2626";
    toast.style.color = "#fff";
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 4000);
}

// Helper Currency
function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

// Date helper
function getTodayDateString() {
    const d = new Date();
    // Local date string in format YYYY-MM-DD
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

// ----------------------------------------------------
// TAB 1: DASBOR (DASHBOARD SUMMARY)
// ----------------------------------------------------
const statTodayRevenue = document.getElementById("stat-today-revenue");
const statTodayTransactions = document.getElementById("stat-today-transactions");
const statActiveBons = document.getElementById("stat-active-bons");
const statTodayWasteCost = document.getElementById("stat-today-waste-cost");
const criticalStockAlerts = document.getElementById("critical-stock-alerts");
const overdueBonAlerts = document.getElementById("overdue-bon-alerts");
const todayTransactionsRows = document.getElementById("today-transactions-rows");
const criticalStockRows = document.getElementById("critical-stock-rows");
const criticalStockCount = document.getElementById("critical-stock-count");

function setupDashboardTab() {
    renderDashboardStats();
}

function renderDashboardStats() {
    const today = getTodayDateString();
    
    // 1. Calculate today's stats
    const todayTrans = TRANSACTIONS.filter(t => t.tanggal === today);
    const todayRevenue = todayTrans.reduce((acc, t) => acc + Number(t.total_harga), 0);
    
    const activeBonsList = BONS.filter(b => !b.status_lunas);
    const activeBonSum = activeBonsList.reduce((acc, b) => acc + Number(b.sisa_hutang), 0);
    
    const todayWaste = WASTES.filter(w => w.tanggal === today);
    const todayWasteCostSum = todayWaste.reduce((acc, w) => acc + Number(w.kerugian_modal), 0);
    
    if (statTodayRevenue) statTodayRevenue.textContent = formatRupiah(todayRevenue);
    if (statTodayTransactions) statTodayTransactions.textContent = `${todayTrans.length} Transaksi`;
    if (statActiveBons) statActiveBons.textContent = formatRupiah(activeBonSum);
    if (statTodayWasteCost) statTodayWasteCost.textContent = formatRupiah(todayWasteCostSum);

    // 2. Critical Stock Alerts (stok_sistem <= stok_minimum)
    const criticalItems = MENU_ITEMS.filter(item => item.stok_sistem <= item.stok_minimum);
    if (criticalStockCount) criticalStockCount.textContent = criticalItems.length;
    
    if (criticalStockAlerts) {
        criticalStockAlerts.innerHTML = "";
        if (criticalItems.length > 0) {
            const box = document.createElement("div");
            box.className = "alert-box danger";
            box.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <strong>Peringatan Inventori Kritis!</strong> Ada ${criticalItems.length} menu makanan yang hampir habis (di bawah stok minimum). Segera tambahkan stok di tab Inventori.
                </div>
            `;
            criticalStockAlerts.appendChild(box);
        }
    }

    // 3. Overdue Bon Alerts (> 7 days since creation date)
    const currentDate = new Date();
    const overdueBons = activeBonsList.filter(bon => {
        const bonDate = new Date(bon.tanggal_bon);
        const diffTime = Math.abs(currentDate - bonDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    });

    if (overdueBonAlerts) {
        overdueBonAlerts.innerHTML = "";
        if (overdueBons.length > 0) {
            const box = document.createElement("div");
            box.className = "alert-box";
            box.innerHTML = `
                <i class="fa-solid fa-circle-exclamation text-gold"></i>
                <div>
                    <strong>Peringatan Bon Jatuh Tempo!</strong> Ada ${overdueBons.length} piutang pelanggan yang belum lunas melewati batas 7 hari. Cek detail di tab Catatan Bon.
                </div>
            `;
            overdueBonAlerts.appendChild(box);
        }
    }

    // 4. Render Today's transactions table
    if (todayTransactionsRows) {
        todayTransactionsRows.innerHTML = "";
        if (todayTrans.length === 0) {
            todayTransactionsRows.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px 0;">Belum ada transaksi hari ini.</td></tr>`;
        } else {
            todayTrans.forEach(t => {
                const tr = document.createElement("tr");
                const itemsCount = JSON.parse(t.items).reduce((acc, i) => acc + i.qty, 0);
                tr.innerHTML = `
                    <td>${t.jam.substring(0, 5)}</td>
                    <td><span class="category-pill">${t.pembayaran}</span></td>
                    <td>${itemsCount} Porsi</td>
                    <td><strong>${formatRupiah(t.total_harga)}</strong></td>
                    <td>
                        <button class="btn-secondary btn-sm" onclick="showReceiptModal(${t.id})" style="padding: 4px 10px;"><i class="fa-solid fa-file-invoice"></i> Struk</button>
                    </td>
                `;
                todayTransactionsRows.appendChild(tr);
            });
        }
    }

    // 5. Render Critical Stock List
    if (criticalStockRows) {
        criticalStockRows.innerHTML = "";
        if (criticalItems.length === 0) {
            criticalStockRows.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 24px 0;">Semua stok aman.</td></tr>`;
        } else {
            criticalItems.forEach(item => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="td-name">${item.emoji} ${item.name}</td>
                    <td class="text-center text-danger"><strong>${item.stok_sistem}</strong></td>
                    <td class="text-center text-muted">${item.stok_minimum}</td>
                `;
                criticalStockRows.appendChild(tr);
            });
        }
    }
}

// ----------------------------------------------------
// TAB 2: KASIR POS INTERNAL
// ----------------------------------------------------
const posSearch = document.getElementById("pos-search");
const posMenuGridContainer = document.getElementById("pos-menu-grid-container");
const posCartItemsList = document.getElementById("pos-cart-items");
const posSubtotalEl = document.getElementById("pos-subtotal");
const posPaymentMethod = document.getElementById("pos-payment-method");
const posCashInputGroup = document.getElementById("pos-cash-input-group");
const posBonInputGroup = document.getElementById("pos-bon-input-group");
const posAmountPaid = document.getElementById("pos-amount-paid");
const posAmountChange = document.getElementById("pos-amount-change");
const posBonName = document.getElementById("pos-bon-name");
const posBonWhatsapp = document.getElementById("pos-bon-whatsapp");
const btnCompleteCheckout = document.getElementById("btn-complete-checkout");
const posClearCartBtn = document.getElementById("pos-clear-cart-btn");

let posActiveFilter = "all";

function setupPOSTab() {
    if (posSearch) {
        posSearch.addEventListener("input", renderPOSMenu);
    }
    
    // Category filters
    const posFilterButtons = document.querySelectorAll("[data-pos-filter]");
    posFilterButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            posFilterButtons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            posActiveFilter = e.target.getAttribute("data-pos-filter");
            renderPOSMenu();
        });
    });

    if (posClearCartBtn) {
        posClearCartBtn.addEventListener("click", () => {
            posCart = {};
            updatePOSCartUI();
        });
    }

    if (posPaymentMethod) {
        posPaymentMethod.addEventListener("change", () => {
            const method = posPaymentMethod.value;
            if (method === "Bon Hutang") {
                posCashInputGroup.style.display = "none";
                posBonInputGroup.style.display = "block";
            } else if (method === "Tunai") {
                posCashInputGroup.style.display = "block";
                posBonInputGroup.style.display = "none";
            } else {
                posCashInputGroup.style.display = "none";
                posBonInputGroup.style.display = "none";
            }
        });
    }

    if (posAmountPaid) {
        posAmountPaid.addEventListener("input", calculatePOSChange);
    }

    if (btnCompleteCheckout) {
        btnCompleteCheckout.addEventListener("click", processPOSCheckout);
    }

    // New customer selection hooks for POS cashier
    if (posBonSelect) {
        posBonSelect.addEventListener("change", () => {
            const selectedId = parseInt(posBonSelect.value);
            const p = PELANGGAN.find(cust => cust.id === selectedId);
            if (p) {
                posBonName.value = p.nama;
                posBonName.readOnly = true;
                posBonWhatsapp.value = p.no_whatsapp;
                posBonWhatsapp.readOnly = true;
            } else {
                posBonName.value = "";
                posBonName.readOnly = false;
                posBonWhatsapp.value = "";
                posBonWhatsapp.readOnly = false;
            }
        });
    }

    if (partialBonSelect) {
        partialBonSelect.addEventListener("change", () => {
            const selectedId = parseInt(partialBonSelect.value);
            const p = PELANGGAN.find(cust => cust.id === selectedId);
            if (p) {
                partialBonName.value = p.nama;
                partialBonName.readOnly = true;
                partialBonWhatsapp.value = p.no_whatsapp;
                partialBonWhatsapp.readOnly = true;
            } else {
                partialBonName.value = "";
                partialBonName.readOnly = false;
                partialBonWhatsapp.value = "";
                partialBonWhatsapp.readOnly = false;
            }
        });
    }

    if (btnPartialCancel) {
        btnPartialCancel.addEventListener("click", () => {
            partialPayModal.style.display = "none";
            window.pendingCheckout = null;
        });
    }

    if (btnPartialConfirm) {
        btnPartialConfirm.addEventListener("click", async () => {
            if (!window.pendingCheckout) return;
            
            const custId = partialBonSelect.value;
            const name = partialBonName.value.trim();
            const wa = partialBonWhatsapp.value.trim();
            
            if (name === "") {
                alert("Nama pelanggan bon wajib diisi!");
                return;
            }
            
            const { keys, subtotal, method, paid } = window.pendingCheckout;
            const debt = subtotal - paid;
            
            partialPayModal.style.display = "none";
            window.pendingCheckout = null;
            
            await executePOSCheckoutCompletion(keys, subtotal, method, paid, 0, true, debt, name, wa, custId);
            showToast("Transaksi berhasil diproses sebagian tunai & sisa bon!", "success");
        });
    }

    populateCustomerDropdowns();
}

function renderPOSMenu() {
    if (!posMenuGridContainer) return;
    posMenuGridContainer.innerHTML = "";
    
    const query = posSearch ? posSearch.value.toLowerCase().trim() : "";
    let items = MENU_ITEMS;

    // Filter Category
    if (posActiveFilter !== "all") {
        items = items.filter(i => i.category === posActiveFilter);
    }

    // Filter Search Query
    if (query !== "") {
        items = items.filter(i => i.name.toLowerCase().includes(query));
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "pos-menu-item";
        
        const isCritical = item.stok_sistem <= item.stok_minimum;
        const stockClass = item.stok_sistem === 0 ? "critical" : (isCritical ? "critical" : "");
        const stockText = item.stok_sistem === 0 ? "Habis" : `Stok: ${item.stok_sistem}`;

        const imageHTML = item.image
            ? `<div class="pos-menu-emoji" style="padding:0; overflow:hidden;">
                <img src="${item.image}" alt="${item.name}" 
                     style="width:100%; height:100%; object-fit:cover; border-radius:10px; display:block;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <span style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:2rem;">${item.emoji}</span>
               </div>`
            : `<div class="pos-menu-emoji">${item.emoji}</div>`;
        
        div.innerHTML = `
            ${imageHTML}
            <div class="pos-menu-name">${item.name}</div>
            <div class="pos-menu-price">${formatRupiah(item.price)}</div>
            <div class="pos-menu-stock ${stockClass}">${stockText}</div>
        `;
        
        if (item.stok_sistem <= 0) div.style.opacity = "0.5";
        div.addEventListener("click", () => addPOSCartItem(item.id));
        posMenuGridContainer.appendChild(div);
    });
}

function addPOSCartItem(id) {
    const item = MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    if (item.stok_sistem <= 0) {
        alert("Stok menu ini habis! Tidak bisa ditambahkan ke keranjang.");
        return;
    }

    const currentQty = posCart[id] || 0;
    if (currentQty >= item.stok_sistem) {
        alert("Jumlah beli melebihi batas stok sistem!");
        return;
    }

    posCart[id] = currentQty + 1;
    updatePOSCartUI();
}

window.decreasePOSCartQty = function(id) {
    if (posCart[id]) {
        posCart[id]--;
        if (posCart[id] === 0) {
            delete posCart[id];
        }
    }
    updatePOSCartUI();
};

window.increasePOSCartQty = function(id) {
    const item = MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    const currentQty = posCart[id] || 0;
    if (currentQty >= item.stok_sistem) {
        alert("Stok tidak mencukupi!");
        return;
    }

    posCart[id] = currentQty + 1;
    updatePOSCartUI();
};

function updatePOSCartUI() {
    if (!posCartItemsList) return;
    posCartItemsList.innerHTML = "";
    
    let subtotal = 0;
    const keys = Object.keys(posCart);

    if (keys.length === 0) {
        posCartItemsList.innerHTML = `<div class="text-center text-muted" style="padding: 24px 0;">Keranjang kasir kosong.</div>`;
        if (posSubtotalEl) posSubtotalEl.textContent = "Rp 0";
        if (posAmountPaid) posAmountPaid.value = "";
        if (posAmountChange) posAmountChange.value = "Rp 0";
        return;
    }

    keys.forEach(id => {
        const item = MENU_ITEMS.find(m => m.id === parseInt(id));
        if (!item) return;

        const qty = posCart[id];
        const total = item.price * qty;
        subtotal += total;

        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <div class="cart-item-info">
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatRupiah(item.price)} x ${qty}</div>
                </div>
            </div>
            <div class="cart-item-controls">
                <button class="btn-qty" onclick="decreasePOSCartQty(${item.id})"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-val">${qty}</span>
                <button class="btn-qty" onclick="increasePOSCartQty(${item.id})"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        posCartItemsList.appendChild(row);
    });

    if (posSubtotalEl) posSubtotalEl.textContent = formatRupiah(subtotal);
    calculatePOSChange();
}

function calculatePOSChange() {
    if (!posAmountPaid || !posAmountChange || !posSubtotalEl) return;
    const subtotalText = posSubtotalEl.textContent.replace(/[^\d]/g, "");
    const subtotal = Number(subtotalText);
    const paid = Number(posAmountPaid.value) || 0;
    
    if (paid < subtotal) {
        posAmountChange.value = "Uang kurang";
        posAmountChange.style.color = "var(--accent-red)";
    } else {
        const change = paid - subtotal;
        posAmountChange.value = formatRupiah(change);
        posAmountChange.style.color = "var(--success)";
    }
}

window.quickCash = function(val) {
    if (!posAmountPaid) return;
    posAmountPaid.value = val;
    calculatePOSChange();
};

async function processPOSCheckout() {
    const keys = Object.keys(posCart);
    if (keys.length === 0) {
        alert("Keranjang belanja kosong!");
        return;
    }

    const subtotalText = posSubtotalEl.textContent.replace(/[^\d]/g, "");
    const subtotal = Number(subtotalText);
    const method = posPaymentMethod.value;
    
    let paid = 0;
    let change = 0;
    
    let customerName = "";
    let customerWA = "";
    let customerId = "";

    if (method === "Tunai") {
        paid = Number(posAmountPaid.value) || 0;
        if (paid < subtotal) {
            // Trigger partial payment / bon conversion flow
            window.pendingCheckout = { keys, subtotal, method, paid };
            
            document.getElementById("partial-total-label").textContent = formatRupiah(subtotal);
            document.getElementById("partial-paid-label").textContent = formatRupiah(paid);
            document.getElementById("partial-debt-label").textContent = formatRupiah(subtotal - paid);
            
            if (partialBonName) {
                partialBonName.value = "";
                partialBonName.readOnly = false;
            }
            if (partialBonWhatsapp) {
                partialBonWhatsapp.value = "";
                partialBonWhatsapp.readOnly = false;
            }
            if (partialBonSelect) {
                partialBonSelect.value = "";
            }
            
            populateCustomerDropdowns();
            partialPayModal.style.display = "flex";
            return;
        }
        change = paid - subtotal;
    } else if (method === "Bon Hutang") {
        customerId = posBonSelect.value;
        customerName = posBonName.value.trim();
        customerWA = posBonWhatsapp.value.trim();
        if (customerName === "") {
            alert("Nama pelanggan bon wajib diisi!");
            return;
        }
    }

    await executePOSCheckoutCompletion(keys, subtotal, method, paid, change, false, 0, customerName, customerWA, customerId);
}

// ----------------------------------------------------
// RECEIPT POPUP COMPONENT
// ----------------------------------------------------
function showReceiptModal(transactionId, paidAmount = null, changeAmount = null) {
    const t = TRANSACTIONS.find(trans => trans.id === transactionId);
    if (!t) return;

    const items = JSON.parse(t.items);
    let itemsHtml = "";
    items.forEach(i => {
        itemsHtml += `
            <div class="receipt-row">
                <span>${i.name} (${i.qty}x)</span>
                <span>${formatRupiah(i.price * i.qty)}</span>
            </div>
        `;
    });

    const isTunai = t.pembayaran === "Tunai";
    const finalPaid = paidAmount !== null ? paidAmount : t.total_harga;
    const finalChange = changeAmount !== null ? changeAmount : 0;

    const receiptHtml = `
        <div class="receipt-container" id="printable-receipt">
            <div class="receipt-header">
                <div class="receipt-title">ANGKRINGAN MAS EJA</div>
                <div class="receipt-sub">Alun-Alun Kota Tegal</div>
                <div class="receipt-sub">WA: +62 823-2954-7641</div>
            </div>
            <div style="font-size: 0.75rem; margin-bottom: 10px;">
                <div>Trans ID : #${t.id}</div>
                <div>Tanggal  : ${t.tanggal} ${t.jam.substring(0, 5)}</div>
                <div>Metode   : ${t.pembayaran}</div>
            </div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-totals">
                <div class="receipt-row" style="font-weight: bold;">
                    <span>Total Belanja:</span>
                    <span>${formatRupiah(t.total_harga)}</span>
                </div>
                ${isTunai ? `
                <div class="receipt-row">
                    <span>Uang Tunai:</span>
                    <span>${formatRupiah(finalPaid)}</span>
                </div>
                <div class="receipt-row">
                    <span>Kembalian:</span>
                    <span>${formatRupiah(finalChange)}</span>
                </div>
                ` : ''}
            </div>
            <div class="receipt-footer">
                <div>Maturnuwun, Sampun Lesehan!</div>
                <div>Simulasi Computational Thinking</div>
            </div>
        </div>
    `;

    if (receiptPaperWrapper) receiptPaperWrapper.innerHTML = receiptHtml;
    if (receiptModal) receiptModal.style.display = "flex";
}

if (receiptCloseBtn) receiptCloseBtn.addEventListener("click", () => receiptModal.style.display = "none");
if (btnPrintClose) btnPrintClose.addEventListener("click", () => receiptModal.style.display = "none");
if (btnPrintAction) {
    btnPrintAction.addEventListener("click", () => {
        const printContent = document.getElementById("printable-receipt").outerHTML;
        const originalContent = document.body.innerHTML;
        
        // Simple printable window
        const win = window.open("", "_blank");
        win.document.write(`
            <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        body { background: #fff; margin: 0; padding: 20px; font-family: monospace; }
                        .receipt-container { max-width: 320px; margin: 0 auto; }
                        .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .receipt-title { font-size: 1.2rem; font-weight: bold; }
                        .receipt-sub { font-size: 0.8rem; }
                        .receipt-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9rem; }
                        .receipt-items { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                        .receipt-totals { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                        .receipt-footer { text-align: center; font-size: 0.8rem; margin-top: 10px; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${printContent}
                </body>
            </html>
        `);
        win.document.close();
    });
}

window.showReceiptModal = showReceiptModal;

// ----------------------------------------------------
// TAB 3: INVENTORI & MANAGEMENT BASI
// ----------------------------------------------------
const crudMenuRows = document.getElementById("crud-menu-rows");
const wasteItemId = document.getElementById("waste-item-id");
const wasteSystemStock = document.getElementById("waste-system-stock");
const wastePhysicalStock = document.getElementById("waste-physical-stock");
const wasteCalculationResult = document.getElementById("waste-calculation-result");
const foodWasteForm = document.getElementById("food-waste-form");
const wasteLogRows = document.getElementById("waste-log-rows");

function setupStokTab() {
    if (btnAddNewMenuItem) {
        btnAddNewMenuItem.addEventListener("click", () => openItemModal());
    }
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeItemModal);
    if (btnModalCancel) btnModalCancel.addEventListener("click", closeItemModal);
    if (itemForm) itemForm.addEventListener("submit", saveMenuItemForm);

    if (wasteItemId) {
        wasteItemId.addEventListener("change", handleWasteMenuSelection);
    }
    if (wastePhysicalStock) {
        wastePhysicalStock.addEventListener("input", calculateWasteDifference);
    }
    if (foodWasteForm) {
        foodWasteForm.addEventListener("submit", recordFoodWasteSubmit);
    }
}

function renderStokTables() {
    renderStokMonitoring();
    renderMenuCRUD();
    renderBasiLog();
}

function renderMenuCRUD() {
    if (!crudMenuRows) return;
    crudMenuRows.innerHTML = "";

    MENU_ITEMS.forEach(item => {
        const tr = document.createElement("tr");
        let cat = "Nasi & Mie";
        let catClass = "utama";
        if (item.category === "sate") {
            cat = "Sate";
            catClass = "sate";
        }
        if (item.category === "minuman") {
            cat = "Wedang";
            catClass = "minuman";
        }

        tr.innerHTML = `
            <td class="td-name">${item.emoji} ${item.name}</td>
            <td><span class="category-pill ${catClass}">${cat}</span></td>
            <td><strong>${formatRupiah(item.price)}</strong></td>
            <td>${formatRupiah(item.harga_modal)}</td>
            <td class="text-center">${item.stok_sistem}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="openItemModal(${item.id})" aria-label="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-icon delete" onclick="deleteMenuItem(${item.id})" aria-label="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        crudMenuRows.appendChild(tr);
    });

    // Populate Waste select dropdown (only Food/Sate can get spoiled, but include all or filter)
    if (wasteItemId) {
        wasteItemId.innerHTML = `<option value="">-- Pilih Menu Makanan --</option>`;
        MENU_ITEMS.forEach(item => {
            if (item.category !== "minuman") {
                const opt = document.createElement("option");
                opt.value = item.id;
                opt.textContent = `${item.emoji} ${item.name}`;
                wasteItemId.appendChild(opt);
            }
        });
    }
}

// -------------------------------------------------------
// Image Upload Helper
// -------------------------------------------------------
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;

                // Scale down proportionally
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function setupImageUpload() {
    const fileInput = document.getElementById("item-image-file");
    if (!fileInput) return;
    fileInput.addEventListener("change", async function() {
        const file = this.files[0];
        if (!file) return;

        document.getElementById("item-image-filename").textContent = "⏳ Mengompres gambar...";

        // Compress to max 400x400, quality 0.75 — keeps Base64 well under 100KB
        const compressed = await compressImage(file, 400, 400, 0.75);

        document.getElementById("item-image").value = compressed;
        document.getElementById("item-image-filename").textContent = `✅ ${file.name} (terkompresi)`;
        document.getElementById("item-image-preview-img").src = compressed;
        document.getElementById("item-image-preview").style.display = "block";
    });
}

function clearMenuImage() {
    document.getElementById("item-image").value = "";
    document.getElementById("item-image-file").value = "";
    document.getElementById("item-image-filename").textContent = "Belum ada gambar dipilih";
    document.getElementById("item-image-preview").style.display = "none";
    document.getElementById("item-image-preview-img").src = "";
}

function openItemModal(id = null) {
    if (!itemForm || !itemModal || !modalTitle) return;
    itemForm.reset();
    
    if (id === null) {
        modalTitle.innerHTML = `<i class="fa-solid fa-plus text-orange"></i> Tambah Menu Baru`;
        document.getElementById("item-id").value = "";
    } else {
        modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-orange"></i> Edit Menu Item`;
        const item = MENU_ITEMS.find(m => m.id === id);
        if (item) {
            document.getElementById("item-id").value = item.id;
            document.getElementById("item-name").value = item.name;
            document.getElementById("item-category").value = item.category;
            document.getElementById("item-emoji").value = item.emoji;
            document.getElementById("item-image").value = item.image || "";
            document.getElementById("item-image-file").value = "";
            if (item.image) {
                document.getElementById("item-image-filename").textContent = "Gambar tersimpan";
                document.getElementById("item-image-preview-img").src = item.image;
                document.getElementById("item-image-preview").style.display = "block";
            } else {
                document.getElementById("item-image-filename").textContent = "Belum ada gambar dipilih";
                document.getElementById("item-image-preview").style.display = "none";
            }
            document.getElementById("item-price").value = item.price;
            document.getElementById("item-modal-price").value = item.harga_modal;
            document.getElementById("item-stock").value = item.stok_sistem;
            document.getElementById("item-min-stock").value = item.stok_minimum;
            document.getElementById("item-desc").value = item.description;
        }
    }
    itemModal.style.display = "flex";
}

function closeItemModal() {
    if (itemModal) itemModal.style.display = "none";
}

async function saveMenuItemForm(e) {
    e.preventDefault();
    const idVal = document.getElementById("item-id").value;
    
    const existing = idVal !== "" ? MENU_ITEMS.find(m => m.id === parseInt(idVal)) : null;

    const item = {
        name: document.getElementById("item-name").value,
        category: document.getElementById("item-category").value,
        emoji: document.getElementById("item-emoji").value,
        image: document.getElementById("item-image").value || null,
        price: Number(document.getElementById("item-price").value),
        harga_modal: Number(document.getElementById("item-modal-price").value),
        stok_sistem: Number(document.getElementById("item-stock").value),
        stok_minimum: Number(document.getElementById("item-min-stock").value),
        description: document.getElementById("item-desc").value,
        // Preserve v2.0 relational fields
        code: existing ? existing.code : null,
        stok_awal: existing ? (existing.stok_awal !== undefined ? existing.stok_awal : Number(document.getElementById("item-stock").value)) : Number(document.getElementById("item-stock").value),
        terjual: existing ? (existing.terjual || 0) : 0
    };

    if (idVal !== "") item.id = parseInt(idVal);

    try {
        const res = await db.saveMenuItem(item);
        if (res.success) {
            closeItemModal();
            await loadAllData();
            renderStokTables();
            renderDashboardStats();
            if (res.savedToCloud === false) {
                showToast("Menu disimpan lokal saja (Offline Mode)", "warning");
            } else {
                showToast("Menu berhasil disimpan!", "success");
            }
        } else {
            alert("❌ Gagal menyimpan menu!\n\nDetail: " + res.error);
        }
    } catch (error) {
        console.error(error);
        alert("🚨 Terjadi error saat menyimpan: " + error.message);
    }
}

window.openItemModal = openItemModal;

window.deleteMenuItem = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus menu ini dari database?")) {
        const res = await db.deleteMenuItem(id);
        if (res.success) {
            await loadAllData();
            renderStokTables();
            renderDashboardStats();
        } else {
            alert("Gagal menghapus!");
        }
    }
};

// Waste Logics
function handleWasteMenuSelection() {
    if (!wasteItemId || !wasteSystemStock) return;
    const selectedId = parseInt(wasteItemId.value);
    const item = MENU_ITEMS.find(m => m.id === selectedId);
    
    if (item) {
        wasteSystemStock.value = item.stok_sistem;
    } else {
        wasteSystemStock.value = 0;
    }
    calculateWasteDifference();
}

function calculateWasteDifference() {
    if (!wasteSystemStock || !wastePhysicalStock || !wasteCalculationResult) return;
    const sys = Number(wasteSystemStock.value) || 0;
    const phy = Number(wastePhysicalStock.value) || 0;
    
    if (wastePhysicalStock.value === "") {
        wasteCalculationResult.style.display = "none";
        return;
    }

    if (phy > sys) {
        wasteCalculationResult.innerHTML = `<strong>Peringatan:</strong> Jumlah fisik melebihi stok sistem. Sistem akan menyesuaikan stok baru menjadi ${phy} (basi = 0).`;
        wasteCalculationResult.style.color = "var(--gold)";
        wasteCalculationResult.style.display = "block";
    } else {
        const diff = sys - phy;
        const selectedId = parseInt(wasteItemId.value);
        const item = MENU_ITEMS.find(m => m.id === selectedId);
        const modalCost = item ? item.harga_modal * diff : 0;
        
        wasteCalculationResult.innerHTML = `
            <strong>Detail Makanan Basi:</strong><br>
            • Jumlah Basi: <strong>${diff} porsi/tusuk</strong><br>
            • Kerugian Modal (HPP): <strong>${formatRupiah(modalCost)}</strong>
        `;
        wasteCalculationResult.style.color = "var(--accent-red)";
        wasteCalculationResult.style.display = "block";
    }
}

async function recordFoodWasteSubmit(e) {
    e.preventDefault();
    const itemId = parseInt(wasteItemId.value);
    const sys = Number(wasteSystemStock.value) || 0;
    const phy = Number(wastePhysicalStock.value) || 0;

    const item = MENU_ITEMS.find(m => m.id === itemId);
    if (!item) return;

    const qtyBasi = Math.max(0, sys - phy);
    const lossCost = qtyBasi * item.harga_modal;

    // 1. Save waste record
    const waste = {
        tanggal: getTodayDateString(),
        menu_item_id: itemId,
        qty_basi: qtyBasi,
        kerugian_modal: lossCost
    };
    await db.saveFoodWaste(waste);

    // 2. Set new system stock to what's physically remaining
    // (stok_sistem becomes equal to physical stock)
    item.stok_sistem = phy;
    await db.saveMenuItem(item);

    // Clear form
    foodWasteForm.reset();
    if (wasteCalculationResult) wasteCalculationResult.style.display = "none";

    await loadAllData();
    renderStokTables();
    renderDashboardStats();
}

function renderBasiLog() {
    if (!wasteLogRows) return;
    wasteLogRows.innerHTML = "";
    
    const today = getTodayDateString();
    const todayWastes = WASTES.filter(w => w.tanggal === today);

    if (todayWastes.length === 0) {
        wasteLogRows.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 12px 0;">Belum ada catatan basi hari ini.</td></tr>`;
        return;
    }

    todayWastes.forEach(w => {
        const item = MENU_ITEMS.find(m => m.id === w.menu_item_id);
        const name = item ? item.name : "Menu Dihapus";
        const emoji = item ? item.emoji : "🍽️";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${emoji} ${name}</td>
            <td class="text-center"><strong>${w.qty_basi} pcs</strong></td>
            <td class="text-danger">${formatRupiah(w.kerugian_modal)}</td>
        `;
        wasteLogRows.appendChild(tr);
    });
}

// ----------------------------------------------------
// TAB 4: CATATAN BON (CUSTOMER DEBTS)
// ----------------------------------------------------
const bonDebtRows = document.getElementById("bon-debt-rows");

function setupBonTab() {
    // Functions inside windows scope
}

function renderBonTable() {
    if (!bonDebtRows) return;
    bonDebtRows.innerHTML = "";

    if (BONS.length === 0) {
        bonDebtRows.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px 0;">Tidak ada catatan bon hutang aktif.</td></tr>`;
        return;
    }

    BONS.forEach(b => {
        const tr = document.createElement("tr");
        
        // Calculate overdue status
        const bonDate = new Date(b.tanggal_bon);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - bonDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let overdueBadge = `<span class="category-pill" style="color: var(--success); border-color: rgba(46,196,182,0.2)">Aman (${diffDays} hari)</span>`;
        if (!b.status_lunas && diffDays > 7) {
            overdueBadge = `<span class="category-pill" style="color: var(--accent-red); border-color: rgba(239,35,60,0.2); background: rgba(239,35,60,0.05)">JATUH TEMPO (${diffDays} hari)</span>`;
        } else if (b.status_lunas) {
            overdueBadge = `<span class="text-muted">-</span>`;
        }

        let statusBadge = b.status_lunas 
            ? `<span class="category-pill" style="color: var(--success); border-color: rgba(46,196,182,0.2)">LUNAS</span>`
            : `<span class="category-pill" style="color: var(--gold); border-color: rgba(255,190,11,0.2)">BELUM LUNAS</span>`;

        tr.innerHTML = `
            <td>${b.tanggal_bon}</td>
            <td class="td-name">${b.nama_pelanggan}</td>
            <td>${b.no_whatsapp || "-"}</td>
            <td><strong>${formatRupiah(b.jumlah_hutang)}</strong></td>
            <td class="text-center">${overdueBadge}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-center">
                <div class="action-btns">
                    ${!b.status_lunas ? `
                    <button class="btn-secondary btn-sm" onclick="markBonAsPaid(${b.id})" style="padding: 4px 10px; border-color: rgba(46, 196, 182, 0.3); color: var(--success);"><i class="fa-solid fa-circle-check"></i> Lunasi</button>
                    <button class="btn-secondary btn-sm" onclick="sendBonWaReminder(${b.id})" style="padding: 4px 10px; border-color: rgba(37, 211, 102, 0.3); color: #25d366;"><i class="fa-brands fa-whatsapp"></i> Tagih</button>
                    ` : '<span class="text-muted">-</span>'}
                </div>
            </td>
        `;
        bonDebtRows.appendChild(tr);
    });
}

window.markBonAsPaid = async function(id) {
    const bon = BONS.find(b => b.id === id);
    if (!bon) return;

    if (confirm(`Apakah Anda yakin menandai bon atas nama ${bon.nama_pelanggan} sebesar ${formatRupiah(bon.sisa_hutang)} telah LUNAS?`)) {
        // Find customer and update their outstanding bon balance
        const cust = PELANGGAN.find(p => p.nama.toLowerCase() === bon.nama_pelanggan.toLowerCase() || p.no_whatsapp === bon.no_whatsapp);
        if (cust) {
            cust.saldo_bon = Math.max(0, (cust.saldo_bon || 0) - bon.jumlah_hutang);
            await db.savePelanggan(cust);
        }

        bon.sisa_hutang = 0;
        bon.status_lunas = true;
        
        await db.saveBon(bon);

        // Also record this payment in transactions for accounting
        const today = getTodayDateString();
        const time = new Date().toTimeString().split(' ')[0];
        const dummyItem = [{
            id: 999,
            name: `PELUNASAN BON - ${bon.nama_pelanggan}`,
            price: bon.jumlah_hutang,
            harga_modal: 0,
            qty: 1,
            emoji: "📝"
        }];

        const trans = {
            tanggal: today,
            jam: time,
            items: JSON.stringify(dummyItem),
            total_harga: bon.jumlah_hutang,
            pembayaran: "Pelunasan Bon"
        };
        await db.saveTransaction(trans);

        await loadAllData();
        renderBonTable();
        renderDashboardStats();
    }
};

window.sendBonWaReminder = function(id) {
    const bon = BONS.find(b => b.id === id);
    if (!bon || !bon.no_whatsapp) {
        alert("Nomor WhatsApp pelanggan tidak terdaftar!");
        return;
    }

    let text = `*PENGINGAT PEMBAYARAN BON - ANGKRINGAN MAS EJA* 🍢\n\n`;
    text += `Halo Kak *${bon.nama_pelanggan}*,\n`;
    text += `Kami ingin mengonfirmasi catatan piutang/bon atas nama Kakak sebesar *${formatRupiah(bon.jumlah_hutang)}* yang tercatat pada tanggal *${bon.tanggal_bon}*.\n\n`;
    text += `Silakan melakukan pelunasan secara tunai di kasir atau transfer ke rekening *BCA 82329547641* a.n. *Eja Sutrisno*.\n\n`;
    text += `_Jika sudah melakukan pembayaran, mohon abaikan pesan ini atau kirimkan bukti transfer. Matur nuwun!_`;

    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=${bon.no_whatsapp.replace(/^[0]/, "62")}&text=${encoded}`;
    window.open(url, "_blank");
};

// ----------------------------------------------------
// TAB 5: LAPORAN KEUANGAN (PROFIT & LOSS)
// ----------------------------------------------------
const filterLaporanTanggal = document.getElementById("filter-laporan-tanggal");
const plGrossRevenue = document.getElementById("pl-gross-revenue");
const plCogs = document.getElementById("pl-cogs");
const plTotalExpenses = document.getElementById("pl-total-expenses");
const plTotalWaste = document.getElementById("pl-total-waste");
const plNetProfit = document.getElementById("pl-net-profit");
const expenseForm = document.getElementById("expense-form");
const expenseLogRows = document.getElementById("expense-log-rows");

let salesChart = null;

function setupLaporanTab() {
    if (filterLaporanTanggal) {
        filterLaporanTanggal.value = getTodayDateString();
        filterLaporanTanggal.addEventListener("change", renderLaporanPembukuan);
    }
    if (expenseForm) {
        expenseForm.addEventListener("submit", saveExpenseSubmit);
    }
}

function renderLaporanPembukuan() {
    const selectedDate = filterLaporanTanggal ? filterLaporanTanggal.value : getTodayDateString();
    
    // 1. Calculate P&L numbers for this specific day
    const dayTrans = TRANSACTIONS.filter(t => t.tanggal === selectedDate);
    const grossRev = dayTrans.reduce((acc, t) => acc + Number(t.total_harga), 0);
    
    // COGS (Harga Pokok Penjualan)
    let cogs = 0;
    dayTrans.forEach(t => {
        const items = JSON.parse(t.items);
        items.forEach(i => {
            cogs += (Number(i.harga_modal) * i.qty);
        });
    });

    const dayExpenses = EXPENSES.filter(e => e.tanggal === selectedDate);
    const totalExp = dayExpenses.reduce((acc, e) => acc + Number(e.jumlah), 0);

    const dayWastes = WASTES.filter(w => w.tanggal === selectedDate);
    const totalWasteCost = dayWastes.reduce((acc, w) => acc + Number(w.kerugian_modal), 0);

    // Net profit = Gross Rev - COGS - Expenses - Waste
    const netProfit = grossRev - cogs - totalExp - totalWasteCost;

    if (plGrossRevenue) plGrossRevenue.textContent = formatRupiah(grossRev);
    if (plCogs) plCogs.textContent = formatRupiah(cogs);
    if (plTotalExpenses) plTotalExpenses.textContent = `- ${formatRupiah(totalExp)}`;
    if (plTotalWaste) plTotalWaste.textContent = `- ${formatRupiah(totalWasteCost)}`;
    if (plNetProfit) {
        plNetProfit.textContent = formatRupiah(netProfit);
        if (netProfit < 0) {
            plNetProfit.style.color = "var(--accent-red)";
        } else {
            plNetProfit.style.color = "var(--success)";
        }
    }

    // 2. Render Expenses table
    renderExpensesList(selectedDate);

    // 3. Render / Update Chart
    renderSalesTrendChart();
}

function renderExpensesList(date) {
    if (!expenseLogRows) return;
    expenseLogRows.innerHTML = "";

    const dayExpenses = EXPENSES.filter(e => e.tanggal === date);
    if (dayExpenses.length === 0) {
        expenseLogRows.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 12px 0;">Belum ada pengeluaran hari ini.</td></tr>`;
        return;
    }

    dayExpenses.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${e.keterangan}</td>
            <td><strong>${formatRupiah(e.jumlah)}</strong></td>
            <td class="text-center">
                <button class="btn-icon delete" onclick="deleteExpenseItem(${e.id})" style="width: 28px; height: 28px;"><i class="fa-solid fa-trash" style="font-size: 0.75rem;"></i></button>
            </td>
        `;
        expenseLogRows.appendChild(tr);
    });
}

async function saveExpenseSubmit(e) {
    e.preventDefault();
    const desc = document.getElementById("expense-desc").value.trim();
    const amount = Number(document.getElementById("expense-amount").value);
    const date = filterLaporanTanggal ? filterLaporanTanggal.value : getTodayDateString();

    const expense = {
        tanggal: date,
        keterangan: desc,
        jumlah: amount
    };

    await db.saveExpense(expense);
    document.getElementById("expense-form").reset();
    
    await loadAllData();
    renderLaporanPembukuan();
    renderDashboardStats();
}

window.deleteExpenseItem = async function(id) {
    if (confirm("Hapus catatan pengeluaran ini?")) {
        const res = await db.deleteExpense(id);
        if (res.success) {
            await loadAllData();
            renderLaporanPembukuan();
            renderDashboardStats();
        }
    }
};

function renderSalesTrendChart() {
    const canvas = document.getElementById("salesChart");
    if (!canvas) return;

    // Destory existing chart instance
    if (salesChart) {
        salesChart.destroy();
    }

    // Generate last 7 days keys
    const labels = [];
    const revenueData = [];
    const profitData = [];

    const d = new Date();
    for (let i = 6; i >= 0; i--) {
        const past = new Date(d.getTime() - (i * 24 * 60 * 60 * 1000));
        const offset = past.getTimezoneOffset();
        const local = new Date(past.getTime() - (offset * 60 * 1000));
        const dateStr = local.toISOString().split('T')[0];
        
        labels.push(dateStr.substring(5)); // just MM-DD

        // Calculate sales & net profit for that day
        const dayTrans = TRANSACTIONS.filter(t => t.tanggal === dateStr);
        const gross = dayTrans.reduce((acc, t) => acc + Number(t.total_harga), 0);
        
        let cogs = 0;
        dayTrans.forEach(t => {
            const items = JSON.parse(t.items);
            items.forEach(i => { cogs += (Number(i.harga_modal) * i.qty); });
        });

        const dayExp = EXPENSES.filter(e => e.tanggal === dateStr).reduce((acc, e) => acc + Number(e.jumlah), 0);
        const dayWaste = WASTES.filter(w => w.tanggal === dateStr).reduce((acc, w) => acc + Number(w.kerugian_modal), 0);

        labels[labels.length - 1] = past.toLocaleDateString("id-ID", { weekday: 'short' }) + " " + dateStr.substring(8);
        revenueData.push(gross);
        profitData.push(gross - cogs - dayExp - dayWaste);
    }

    // Chart.js Configuration
    const ctx = canvas.getContext("2d");
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Omzet Penjualan',
                    data: revenueData,
                    borderColor: '#ff7b00',
                    backgroundColor: 'rgba(255, 123, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Laba Bersih',
                    data: profitData,
                    borderColor: '#2ec4b6',
                    backgroundColor: 'rgba(46, 196, 182, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#adb5bd', font: { family: 'Plus Jakarta Sans' } }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#adb5bd', font: { family: 'Plus Jakarta Sans' } }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8f9fa', font: { family: 'Plus Jakarta Sans', weight: 'bold' } }
                }
            }
        }
    });
}

// ----------------------------------------------------
// TAB 6: DATABASE SETTINGS
// ----------------------------------------------------
const dbConfigForm = document.getElementById("db-config-form");
const supabaseUrlInput = document.getElementById("supabase-url");
const supabaseKeyInput = document.getElementById("supabase-key");
const btnResetDbConfig = document.getElementById("btn-reset-db-config");
const btnCopySql = document.getElementById("btn-copy-sql");

function setupConfigForms() {
    const config = db.getSupabaseConfig();
    if (supabaseUrlInput) supabaseUrlInput.value = config.url || "";
    if (supabaseKeyInput) supabaseKeyInput.value = config.key || "";

    if (dbConfigForm) {
        dbConfigForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const url = supabaseUrlInput.value.trim();
            const key = supabaseKeyInput.value.trim();
            
            const btn = document.getElementById("btn-save-db-config");
            const originalText = btn.textContent;
            btn.textContent = "Menghubungkan...";
            btn.disabled = true;

            const res = await db.saveSupabaseConfig(url, key);
            
            btn.textContent = originalText;
            btn.disabled = false;
            
            alert(res.message);
            window.location.reload();
        });
    }

    if (btnResetDbConfig) {
        btnResetDbConfig.addEventListener("click", async () => {
            if (confirm("Reset koneksi ke database cloud Supabase? Aplikasi akan kembali menyimpan data secara lokal.")) {
                await db.saveSupabaseConfig("", "");
                window.location.reload();
            }
        });
    }

    if (btnCopySql) {
        btnCopySql.addEventListener("click", () => {
            const sqlText = document.getElementById("sql-schema-code").innerText;
            navigator.clipboard.writeText(sqlText).then(() => {
                const originalText = btnCopySql.textContent;
                btnCopySql.textContent = "Tersalin!";
                btnCopySql.style.backgroundColor = "var(--success)";
                btnCopySql.style.borderColor = "var(--success)";
                setTimeout(() => {
                    btnCopySql.textContent = originalText;
                    btnCopySql.style.backgroundColor = "";
                    btnCopySql.style.borderColor = "";
                }, 2000);
            });
        });
    }
}

// ----------------------------------------------------
// LOYALTY & COMPLEMENTARY FUNCTIONS APPENDED FOR v2.0
// ----------------------------------------------------

async function executePOSCheckoutCompletion(cartKeys, subtotal, paymentMethod, paid, change, isPartial, debtAmount, customerName, customerWA, customerId) {
    // 1. Deduct Stock and update shift sales counts
    const soldItems = [];
    const stockUpdates = [];
    
    for (const idStr of cartKeys) {
        const id = parseInt(idStr);
        const item = MENU_ITEMS.find(m => m.id === id);
        const qty = posCart[idStr];
        
        soldItems.push({
            id: item.id,
            code: item.code || "",
            name: item.name,
            price: item.price,
            harga_modal: item.harga_modal,
            qty: qty,
            emoji: item.emoji
        });

        // Update item parameters
        item.stok_sistem = item.stok_sistem - qty;
        item.terjual = (item.terjual || 0) + qty;
        
        // Save back to db
        await db.saveMenuItem(item);
    }

    // 2. Save Customer data / update loyalty stats
    let targetCustId = customerId;
    if (customerName) {
        let cust = null;
        if (customerId) {
            cust = PELANGGAN.find(p => p.id === parseInt(customerId));
        }
        if (!cust) {
            // Find by name/WA just in case
            cust = PELANGGAN.find(p => p.nama.toLowerCase() === customerName.toLowerCase() || p.no_whatsapp === customerWA);
        }
        
        if (cust) {
            cust.total_transaksi = (cust.total_transaksi || 0) + 1;
            cust.total_belanja = (cust.total_belanja || 0) + subtotal;
            if (isPartial || paymentMethod === "Bon Hutang") {
                cust.saldo_bon = (cust.saldo_bon || 0) + (isPartial ? debtAmount : subtotal);
            }
            await db.savePelanggan(cust);
            targetCustId = cust.id;
        } else {
            // Create new customer
            const newCust = {
                nama: customerName,
                no_whatsapp: customerWA,
                total_transaksi: 1,
                total_belanja: subtotal,
                saldo_bon: (isPartial ? debtAmount : (paymentMethod === "Bon Hutang" ? subtotal : 0))
            };
            const saveRes = await db.savePelanggan(newCust);
            if (saveRes.success && saveRes.pelanggan) {
                targetCustId = saveRes.pelanggan.id;
            }
        }
    }

    // 3. Save Transaction
    const today = getTodayDateString();
    const time = new Date().toTimeString().split(' ')[0];
    
    const transaction = {
        tanggal: today,
        jam: time,
        items: JSON.stringify(soldItems),
        total_harga: subtotal,
        pembayaran: isPartial ? `${paymentMethod} & Bon` : paymentMethod
    };

    await db.saveTransaction(transaction);

    // 4. Save Bon if needed
    if (isPartial || paymentMethod === "Bon Hutang") {
        const bonAmt = isPartial ? debtAmount : subtotal;
        const bon = {
            nama_pelanggan: customerName || "Pelanggan Umum",
            no_whatsapp: customerWA || "",
            tanggal_bon: today,
            jumlah_hutang: bonAmt,
            sisa_hutang: bonAmt,
            status_lunas: false
        };
        await db.saveBon(bon);
    }

    // Reload all Data Cache
    await loadAllData();

    // 5. Print / Display receipt
    let latestTransId = 1;
    if (TRANSACTIONS.length > 0) {
        latestTransId = Math.max(...TRANSACTIONS.map(t => t.id || 0));
    }
    
    showReceiptModal(latestTransId, paid, change);

    // Reset Form
    posCart = {};
    if (posBonName) posBonName.value = "";
    if (posBonWhatsapp) posBonWhatsapp.value = "";
    if (posAmountPaid) posAmountPaid.value = "";
    if (posBonSelect) posBonSelect.value = "";
    
    updatePOSCartUI();
    renderPOSMenu();
    renderDashboardStats();
    renderStokTables();
    renderPelangganTable();
    populateCustomerDropdowns();
}

function populateCustomerDropdowns() {
    if (posBonSelect) {
        posBonSelect.innerHTML = `<option value="">-- Pilih Pelanggan --</option>`;
        PELANGGAN.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.nama} (Bon: ${formatRupiah(p.saldo_bon)})`;
            posBonSelect.appendChild(opt);
        });
    }
    if (partialBonSelect) {
        partialBonSelect.innerHTML = `<option value="">-- Pilih Pelanggan --</option>`;
        PELANGGAN.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.nama} (Bon: ${formatRupiah(p.saldo_bon)})`;
            partialBonSelect.appendChild(opt);
        });
    }
}

function renderStokMonitoring() {
    const monitoringRows = document.getElementById("stok-monitoring-rows");
    if (!monitoringRows) return;
    monitoringRows.innerHTML = "";

    MENU_ITEMS.forEach(item => {
        const tr = document.createElement("tr");
        
        let statusText = "AMAN";
        let statusColor = "var(--success)";
        let statusClass = "utama";

        if (item.stok_sistem <= 0) {
            statusText = "HABIS";
            statusColor = "var(--accent-red)";
            statusClass = "sate";
        } else if (item.stok_sistem <= item.stok_minimum) {
            statusText = "KRITIS!";
            statusColor = "var(--accent-red)";
            statusClass = "sate";
        } else if (item.stok_sistem <= item.stok_minimum * 2) {
            statusText = "PERINGATAN";
            statusColor = "var(--gold)";
            statusClass = "minuman";
        }

        tr.innerHTML = `
            <td class="td-name" style="color: var(--accent);">${item.code || ""}</td>
            <td class="td-name">${item.emoji} ${item.name}</td>
            <td class="text-center">${item.stok_awal}</td>
            <td class="text-center">${item.terjual}</td>
            <td class="text-center" style="font-weight: 700; color: #fff;">${item.stok_sistem}</td>
            <td class="text-center"><span class="category-pill ${statusClass}" style="color: ${statusColor}; border-color: ${statusColor};">${statusText}</span></td>
        `;
        monitoringRows.appendChild(tr);
    });
}

function setupPelangganTab() {
    const form = document.getElementById("pelanggan-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const idVal = document.getElementById("pelanggan-id").value;
            const pelanggan = {
                nama: document.getElementById("pelanggan-nama").value.trim(),
                no_whatsapp: document.getElementById("pelanggan-wa").value.trim()
            };
            if (idVal !== "") {
                pelanggan.id = parseInt(idVal);
                // retain stats
                const existing = PELANGGAN.find(p => p.id === pelanggan.id);
                if (existing) {
                    pelanggan.total_transaksi = existing.total_transaksi;
                    pelanggan.total_belanja = existing.total_belanja;
                    pelanggan.saldo_bon = existing.saldo_bon;
                }
            } else {
                pelanggan.total_transaksi = 0;
                pelanggan.total_belanja = 0;
                pelanggan.saldo_bon = 0;
            }

            const res = await db.savePelanggan(pelanggan);
            if (res.success) {
                form.reset();
                document.getElementById("pelanggan-id").value = "";
                document.getElementById("btn-cancel-pelanggan").style.display = "none";
                document.getElementById("pelanggan-form-title").innerHTML = `<i class="fa-solid fa-user-plus text-orange"></i> Tambah Pelanggan Baru`;
                await loadAllData();
                renderPelangganTable();
                populateCustomerDropdowns();
                showToast("Data pelanggan berhasil disimpan!", "success");
            } else {
                alert("Gagal menyimpan pelanggan!");
            }
        });
    }

    const cancelBtn = document.getElementById("btn-cancel-pelanggan");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            if (form) form.reset();
            document.getElementById("pelanggan-id").value = "";
            cancelBtn.style.display = "none";
            document.getElementById("pelanggan-form-title").innerHTML = `<i class="fa-solid fa-user-plus text-orange"></i> Tambah Pelanggan Baru`;
        });
    }
}

function renderPelangganTable() {
    const rows = document.getElementById("pelanggan-rows");
    if (!rows) return;
    rows.innerHTML = "";

    if (PELANGGAN.length === 0) {
        rows.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 24px 0;">Belum ada data pelanggan.</td></tr>`;
        return;
    }

    PELANGGAN.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="td-name"><i class="fa-solid fa-user text-muted" style="margin-right: 8px;"></i> ${p.nama}</td>
            <td>${p.no_whatsapp}</td>
            <td class="text-center">${p.total_transaksi || 0} kali</td>
            <td><strong>${formatRupiah(p.total_belanja || 0)}</strong></td>
            <td style="color: ${p.saldo_bon > 0 ? 'var(--accent-red)' : 'var(--success)'}; font-weight:700;">${formatRupiah(p.saldo_bon || 0)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editPelanggan(${p.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-icon delete" onclick="deletePelanggan(${p.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        rows.appendChild(tr);
    });
}

window.editPelanggan = function(id) {
    const p = PELANGGAN.find(cust => cust.id === id);
    if (!p) return;
    document.getElementById("pelanggan-id").value = p.id;
    document.getElementById("pelanggan-nama").value = p.nama;
    document.getElementById("pelanggan-wa").value = p.no_whatsapp;
    document.getElementById("btn-cancel-pelanggan").style.display = "inline-flex";
    document.getElementById("pelanggan-form-title").innerHTML = `<i class="fa-solid fa-user-pen text-orange"></i> Edit Pelanggan: ${p.nama}`;
};

window.deletePelanggan = async function(id) {
    if (confirm("Hapus data pelanggan ini? Saldo bon akan terhapus.")) {
        const res = await db.deletePelanggan(id);
        if (res.success) {
            await loadAllData();
            renderPelangganTable();
            populateCustomerDropdowns();
            showToast("Pelanggan berhasil dihapus.", "success");
        }
    }
};

window.startNewShift = async function() {
    if (confirm("Apakah Anda yakin ingin memulai shift baru? Ini akan menyalin sisa stok saat ini sebagai Stok Awal dan mereset jumlah Terjual harian.")) {
        for (const item of MENU_ITEMS) {
            item.stok_awal = item.stok_sistem;
            item.terjual = 0;
            await db.saveMenuItem(item);
        }
        await loadAllData();
        renderStokTables();
        showToast("Shift baru dimulai! Stok awal dan terjual telah di-reset.", "success");
    }
};

window.printDailyStockReport = function() {
    let rowsHtml = "";
    MENU_ITEMS.forEach(item => {
        let status = "AMAN";
        if (item.stok_sistem <= 0) status = "HABIS";
        else if (item.stok_sistem <= item.stok_minimum) status = "KRITIS";
        else if (item.stok_sistem <= item.stok_minimum * 2) status = "PERINGATAN";

        rowsHtml += `
            <tr>
                <td>${item.code || ""}</td>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.stok_awal}</td>
                <td style="text-align: center;">${item.terjual}</td>
                <td style="text-align: center;">${item.stok_sistem}</td>
                <td style="text-align: center;">${status}</td>
            </tr>
        `;
    });

    const win = window.open("", "_blank");
    win.document.write(`
        <html>
            <head>
                <title>Laporan Stok Harian</title>
                <style>
                    body { font-family: monospace; padding: 20px; color: #000; }
                    h2 { text-align: center; margin-bottom: 5px; }
                    .date { text-align: center; margin-bottom: 20px; font-size: 0.9rem; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 8px; border: 1px dashed #000; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <h2>ANGKRINGAN MAS EJA</h2>
                <div class="date">Laporan Stok Harian - Tanggal: ${getTodayDateString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Kode</th>
                            <th>Nama Menu</th>
                            <th>Stok Awal</th>
                            <th>Terjual</th>
                            <th>Sisa</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `);
    win.document.close();
};
