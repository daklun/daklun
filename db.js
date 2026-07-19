// Database Controller for Angkringan Mas Eja (LocalStorage + Supabase)

const DB_VERSION = "2.0";
if (localStorage.getItem("db_version") !== DB_VERSION) {
    // Keep existing config but reset data cache if version changes
    const url = localStorage.getItem("supabase_url");
    const key = localStorage.getItem("supabase_key");
    const disabled = localStorage.getItem("supabase_disabled");
    
    localStorage.clear();
    
    if (url) localStorage.setItem("supabase_url", url);
    if (key) localStorage.setItem("supabase_key", key);
    if (disabled) localStorage.setItem("supabase_disabled", disabled);
    
    localStorage.setItem("db_version", DB_VERSION);
}

// // 27 Default Menu Items Seed with Buy Price (Harga Modal), Stock and Codes
const DEFAULT_MENU_SEED = [
    { id: 1, code: "NK-01", name: "Nasi Bakar Ayam Jamur", category: "utama", price: 8000, harga_modal: 5000, stok_sistem: 5, stok_awal: 5, terjual: 0, emoji: "🍛", description: "Nasi gurih dibungkus daun pisang diisi suwiran ayam pedas & jamur, dibakar harum." },
    { id: 2, code: "NK-02", name: "Nasi Bakar Teri Kemangi", category: "utama", price: 8000, harga_modal: 5000, stok_sistem: 5, stok_awal: 5, terjual: 0, emoji: "🍙", description: "Nasi gurih isi teri asin melimpah berpadu daun kemangi segar yang wangi dibakar kering." },
    { id: 3, code: "NK-03", name: "Mie Goreng (Biasa)", category: "utama", price: 8000, harga_modal: 4500, stok_sistem: 40, stok_awal: 40, terjual: 0, emoji: "🍜", description: "Mie goreng khas angkringan dengan bumbu racikan kecap manis dan sayuran segar." },
    { id: 4, code: "NK-04", name: "Mie Goreng + Telor", category: "utama", price: 12000, harga_modal: 7000, stok_sistem: 20, stok_awal: 20, terjual: 0, emoji: "🍳", description: "Mie goreng lezat lengkap dengan tambahan telur dadar atau mata sapi sesuai selera." },
    { id: 5, code: "NK-05", name: "Mie Rebus (Biasa)", category: "utama", price: 8000, harga_modal: 4500, stok_sistem: 40, stok_awal: 40, terjual: 0, emoji: "🍲", description: "Mie rebus kuah hangat gurih dengan kol and sawi segar cocok untuk malam dingin." },
    { id: 6, code: "NK-06", name: "Mie Rebus + Telor", category: "utama", price: 12000, harga_modal: 7000, stok_sistem: 20, stok_awal: 20, terjual: 0, emoji: "🥚", description: "Mie rebus hangat disajikan dengan rebusan telur matang yang gurih dan lezat." },
    
    { id: 7, code: "ST-01", name: "Sate Kulit", category: "sate", price: 4000, harga_modal: 2000, stok_sistem: 50, stok_awal: 50, terjual: 0, emoji: "🍢", description: "Sate kulit ayam gurih digoreng garing renyah merona." },
    { id: 8, code: "ST-02", name: "Sate Usus", category: "sate", price: 3000, harga_modal: 1500, stok_sistem: 60, stok_awal: 60, terjual: 0, emoji: "🍢", description: "Sate usus ayam ungkep bumbu kuning digoreng gurih." },
    { id: 9, code: "ST-03", name: "Sate Ceker", category: "sate", price: 3000, harga_modal: 1500, stok_sistem: 30, stok_awal: 30, terjual: 0, emoji: "🍢", description: "Sate ceker ayam bumbu manis gurih empuk digoreng sejenak." },
    { id: 10, code: "ST-04", name: "Sate Sosis", category: "sate", price: 2000, harga_modal: 1000, stok_sistem: 40, stok_awal: 40, terjual: 0, emoji: "🌭", description: "Sate sosis goreng lezat disajikan dengan cocolan saus." },
    { id: 11, code: "ST-05", name: "Sate Nugget", category: "sate", price: 2000, harga_modal: 1000, stok_sistem: 40, stok_awal: 40, terjual: 0, emoji: "🍢", description: "Sate nugget ayam olahan digoreng garing renyah." },
    { id: 12, code: "ST-06", name: "Sate Ekado", category: "sate", price: 4000, harga_modal: 2200, stok_sistem: 25, stok_awal: 25, terjual: 0, emoji: "🍢", description: "Kantong kado olahan ikan berisi telur puyuh utuh digoreng gurih." },
    { id: 13, code: "ST-07", name: "Sate Otak-Otak", category: "sate", price: 2000, harga_modal: 1000, stok_sistem: 45, stok_awal: 45, terjual: 0, emoji: "🍢", description: "Sate otak-otak ikan digoreng merekah gurih empuk khas angkringan." },
    
    { id: 14, code: "WJ-01", name: "Matcha Latte", category: "minuman", price: 10000, harga_modal: 5000, stok_sistem: 30, stok_awal: 30, terjual: 0, emoji: "🍵", description: "Minuman es/hangat teh hijau Jepang berpadu susu manis lembut." },
    { id: 15, code: "WJ-02", name: "Es Coklat Premium", category: "minuman", price: 10000, harga_modal: 5000, stok_sistem: 35, stok_awal: 35, terjual: 0, emoji: "🍫", description: "Minuman coklat pekat premium gurih disajikan es atau hangat." },
    { id: 16, code: "WJ-03", name: "Teh Tarik", category: "minuman", price: 8000, harga_modal: 4000, stok_sistem: 30, stok_awal: 30, terjual: 0, emoji: "🥛", description: "Racikan teh hitam khas dan susu kental manis yang ditarik hingga berbusa." },
    { id: 17, code: "WJ-04", name: "Es Lemon Tea", category: "minuman", price: 8000, harga_modal: 3500, stok_sistem: 40, stok_awal: 40, terjual: 0, emoji: "🍋", description: "Teh segar berpadu dengan asam segar perasan lemon asli." },
    { id: 18, code: "WJ-05", name: "Wedang Jahe Susu", category: "minuman", price: 6000, harga_modal: 3000, stok_sistem: 30, stok_awal: 30, terjual: 0, emoji: "🫚", description: "Minuman jahe geprek hangat disiram susu kental manis berkhasiat." },
    { id: 19, code: "WJ-06", name: "Es Extra Joss", category: "minuman", price: 8000, harga_modal: 4000, stok_sistem: 25, stok_awal: 25, terjual: 0, emoji: "💛", description: "Minuman energi Extra Joss dilarutkan air es segar penambah stamina." },
    { id: 20, code: "WJ-07", name: "Es Extra Joss Susu", category: "minuman", price: 10000, harga_modal: 5500, stok_sistem: 25, stok_awal: 25, terjual: 0, emoji: "🥛", description: "Kombinasi energi joss berpadu manis legitnya kental manis putih es." },
    { id: 21, code: "WJ-08", name: "Kopi Item (Robusta Tegal)", category: "minuman", price: 6000, harga_modal: 2500, stok_sistem: 50, stok_awal: 50, terjual: 0, emoji: "☕", description: "Kopi hitam manis robusta Tegal diseduh cangkir tradisional." },
    { id: 22, code: "WJ-09", name: "Es NutriSari", category: "minuman", price: 8000, harga_modal: 3500, stok_sistem: 35, stok_awal: 35, terjual: 0, emoji: "🍊", description: "Minuman rasa jeruk NutriSari manis menyegarkan dahaga siang malam." },
    { id: 23, code: "WJ-10", name: "Goodday Cappuccino", category: "minuman", price: 10000, harga_modal: 5000, stok_sistem: 30, stok_awal: 30, terjual: 0, emoji: "☕", description: "Seduhan kopi cappuccino sachet instan lengkap bertabur choco granule di atasnya." },
    { id: 24, code: "WJ-11", name: "Teh (Manis/Tawar)", category: "minuman", price: 4000, harga_modal: 1500, stok_sistem: 100, stok_awal: 100, terjual: 0, emoji: "🍵", description: "Teh wangi melati khas Tegal (bisa disajikan hangat atau menggunakan es)." },
    { id: 25, code: "WJ-12", name: "Air Es", category: "minuman", price: 2000, harga_modal: 500, stok_sistem: 80, stok_awal: 80, terjual: 0, emoji: "🧊", description: "Segelas air putih segar disajikan dingin dengan es batu." },
    { id: 26, code: "WJ-13", name: "Air Putih", category: "minuman", price: 1000, harga_modal: 200, stok_sistem: 80, stok_awal: 80, terjual: 0, emoji: "💧", description: "Segelas air putih bersih suhu ruang biasa." },
    { id: 27, code: "WJ-14", name: "Air Mineral", category: "minuman", price: 5000, harga_modal: 2500, stok_sistem: 50, stok_awal: 50, terjual: 0, emoji: "🍼", description: "Air putih dalam kemasan botol higienis dan praktis." }
];

const DEFAULT_SUPABASE_URL = "https://rtacieyyeeniruvepkfx.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_ACpE_lhJ8VYlBhD5hfwQ_A_RKZWMm1v";

const db = {
    _supabaseClient: null,
    _lastUrl: null,
    _lastKey: null,

    // Initialize Supabase Client
    getSupabase() {
        let url = localStorage.getItem("supabase_url");
        let key = localStorage.getItem("supabase_key");
        const isDisabled = localStorage.getItem("supabase_disabled") === "true";

        if (!isDisabled) {
            if (!url) url = DEFAULT_SUPABASE_URL;
            if (!key) key = DEFAULT_SUPABASE_KEY;
        }
        
        if (!url || !key || typeof supabase === "undefined") {
            this._supabaseClient = null;
            this._lastUrl = null;
            this._lastKey = null;
            return null;
        }

        if (this._supabaseClient && this._lastUrl === url && this._lastKey === key) {
            return this._supabaseClient;
        }

        try {
            this._supabaseClient = supabase.createClient(url, key);
            this._lastUrl = url;
            this._lastKey = key;
            return this._supabaseClient;
        } catch (err) {
            console.error("Failed to initialize Supabase client:", err);
            return null;
        }
    },

    // ----------------------------------------------------
    // 1. MENU ITEMS API
    // ----------------------------------------------------
    async getMenuItems() {
        const client = this.getSupabase();
        let items = [];
        let isSupabase = false;
        
        if (client) {
            try {
                const { data, error } = await client
                    .from("menu_items")
                    .select("*")
                    .order("id", { ascending: true });
                if (!error && data && data.length > 0) {
                    items = data;
                    isSupabase = true;
                }
                if (!error && (!data || data.length === 0)) {
                    console.log("Supabase table empty, seeding defaults...");
                    await this.seedSupabase(client);
                    const { data: refetched } = await client
                        .from("menu_items")
                        .select("*")
                        .order("id", { ascending: true });
                    items = refetched || DEFAULT_MENU_SEED;
                    isSupabase = true;
                }
            } catch (err) {
                console.error("Supabase getMenuItems error, falling back:", err);
            }
        }

        if (!isSupabase) {
            let localData = localStorage.getItem("angkringan_menu");
            if (!localData) {
                items = DEFAULT_MENU_SEED;
                localStorage.setItem("angkringan_menu", JSON.stringify(DEFAULT_MENU_SEED));
            } else {
                items = JSON.parse(localData);
            }
        }

        // Normalize all items to make sure no properties are undefined or null
        let normalized = false;
        const normalizedItems = items.map(item => {
            const defaultItem = DEFAULT_MENU_SEED.find(d => d.id === item.id) || {};
            let newItem = { ...item };
            
            if (newItem.code === undefined || newItem.code === null) {
                newItem.code = defaultItem.code !== undefined ? defaultItem.code : ("NK-" + newItem.id);
                normalized = true;
            }
            if (newItem.harga_modal === undefined || newItem.harga_modal === null) {
                newItem.harga_modal = defaultItem.harga_modal !== undefined ? defaultItem.harga_modal : 0;
                normalized = true;
            }
            if (newItem.stok_sistem === undefined || newItem.stok_sistem === null) {
                newItem.stok_sistem = defaultItem.stok_sistem !== undefined ? defaultItem.stok_sistem : 0;
                normalized = true;
            }
            if (newItem.stok_minimum === undefined || newItem.stok_minimum === null) {
                newItem.stok_minimum = defaultItem.stok_minimum !== undefined ? defaultItem.stok_minimum : 0;
                normalized = true;
            }
            if (newItem.stok_awal === undefined || newItem.stok_awal === null) {
                newItem.stok_awal = defaultItem.stok_awal !== undefined ? defaultItem.stok_awal : newItem.stok_sistem;
                normalized = true;
            }
            if (newItem.terjual === undefined || newItem.terjual === null) {
                newItem.terjual = defaultItem.terjual !== undefined ? defaultItem.terjual : 0;
                normalized = true;
            }
            
            return newItem;
        });

        if (normalized && !isSupabase) {
            localStorage.setItem("angkringan_menu", JSON.stringify(normalizedItems));
        }

        return normalizedItems;
    },

    async saveMenuItem(item) {
        const client = this.getSupabase();
        const payload = { ...item };

        // Only send columns that exist in the Supabase schema
        const supabasePayload = {
            code: payload.code || null,
            name: payload.name,
            category: payload.category,
            emoji: payload.emoji,
            image: payload.image || null,
            price: payload.price,
            harga_modal: payload.harga_modal || 0,
            stok_sistem: payload.stok_sistem || 0,
            stok_minimum: payload.stok_minimum || 5,
            stok_awal: payload.stok_awal !== undefined ? payload.stok_awal : (payload.stok_sistem || 0),
            terjual: payload.terjual || 0,
            description: payload.description || ""
        };

        if (client) {
            try {
                let error;
                if (payload.id) {
                    const { error: err } = await client
                        .from("menu_items")
                        .update(supabasePayload)
                        .eq("id", payload.id);
                    error = err;
                } else {
                    const { error: err } = await client
                        .from("menu_items")
                        .insert([supabasePayload]);
                    error = err;
                }
                if (!error) return { success: true, savedToCloud: true };
                console.error("Supabase saveMenuItem returned error:", error);
                return { success: false, error: error.message || JSON.stringify(error) };
            } catch (err) {
                console.error("Supabase saveMenuItem exception:", err);
                return { success: false, error: err.message || JSON.stringify(err) };
            }
        }

        // Fallback: save to localStorage only (won't sync to other devices)
        let localData = localStorage.getItem("angkringan_menu");
        let items = localData ? JSON.parse(localData) : [...DEFAULT_MENU_SEED];

        if (payload.id) {
            const index = items.findIndex(i => i.id === payload.id);
            if (index !== -1) items[index] = payload;
        } else {
            const nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
            payload.id = nextId;
            items.push(payload);
        }

        localStorage.setItem("angkringan_menu", JSON.stringify(items));
        return { success: true, savedToCloud: false, item: payload };
    },


    async updateMenuStocks(stockUpdates) {
        for (const update of stockUpdates) {
            const items = await this.getMenuItems();
            const item = items.find(i => i.id === update.id);
            if (item) {
                item.stok_sistem = update.newStock;
                await this.saveMenuItem(item);
            }
        }
        return { success: true };
    },

    async deleteMenuItem(id) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { error } = await client.from("menu_items").delete().eq("id", id);
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase deleteMenuItem error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_menu");
        if (localData) {
            let items = JSON.parse(localData);
            items = items.filter(i => i.id !== id);
            localStorage.setItem("angkringan_menu", JSON.stringify(items));
        }
        return { success: true };
    },

    async seedSupabase(client) {
        try {
            const cleanSeed = DEFAULT_MENU_SEED.map(({ id, ...rest }) => rest);
            await client.from("menu_items").insert(cleanSeed);
            console.log("Successfully seeded Supabase menu_items!");
        } catch (err) {
            console.error("Failed to seed Supabase:", err);
        }
    },

    // ----------------------------------------------------
    // 2. TRANSACTIONS API
    // ----------------------------------------------------
    async getTransactions() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from("transactions")
                    .select("*")
                    .order("id", { ascending: false });
                if (!error) return data;
            } catch (err) {
                console.error("Supabase getTransactions error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_transactions");
        return localData ? JSON.parse(localData) : [];
    },

    async saveTransaction(transaction) {
        const client = this.getSupabase();
        const payload = { ...transaction };
        
        if (client) {
            try {
                const insertPayload = { ...payload };
                delete insertPayload.id;
                const { error } = await client.from("transactions").insert([insertPayload]);
                if (!error) return { success: true };
                // Kembalikan error Supabase agar terlihat
                return { success: false, error: error.message || JSON.stringify(error) };
            } catch (err) {
                return { success: false, error: err.message || String(err) };
            }
        }

        // Tidak ada koneksi Supabase - simpan ke localStorage
        let localData = localStorage.getItem("angkringan_transactions");
        let transactions = localData ? JSON.parse(localData) : [];
        
        const nextId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id || 0)) + 1 : 1;
        payload.id = nextId;
        transactions.unshift(payload);
        
        localStorage.setItem("angkringan_transactions", JSON.stringify(transactions));
        return { success: false, error: "Tidak terhubung ke Supabase - tersimpan lokal saja" };
    },

    // ----------------------------------------------------
    // 3. BON HUTANG (DEBT) API
    // ----------------------------------------------------
    async getBons() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from("bon_hutang")
                    .select("*")
                    .order("id", { ascending: false });
                if (!error) return data;
            } catch (err) {
                console.error("Supabase getBons error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_bons");
        return localData ? JSON.parse(localData) : [];
    },

    async saveBon(bon) {
        const client = this.getSupabase();
        const payload = { ...bon };
        
        if (client) {
            try {
                let error;
                if (payload.id) {
                    const updatePayload = { ...payload };
                    delete updatePayload.id;
                    const { error: err } = await client
                        .from("bon_hutang")
                        .update(updatePayload)
                        .eq("id", payload.id);
                    error = err;
                } else {
                    const insertPayload = { ...payload };
                    delete insertPayload.id;
                    const { error: err } = await client
                        .from("bon_hutang")
                        .insert([insertPayload]);
                    error = err;
                }
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase saveBon error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_bons");
        let bons = localData ? JSON.parse(localData) : [];
        
        if (payload.id) {
            const index = bons.findIndex(b => b.id === payload.id);
            if (index !== -1) {
                bons[index] = payload;
            }
        } else {
            const nextId = bons.length > 0 ? Math.max(...bons.map(b => b.id || 0)) + 1 : 1;
            payload.id = nextId;
            bons.unshift(payload);
        }
        
        localStorage.setItem("angkringan_bons", JSON.stringify(bons));
        return { success: true, bon: payload };
    },

    // ----------------------------------------------------
    // 4. OPERATIONAL EXPENSES API
    // ----------------------------------------------------
    async getExpenses() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from("expenses")
                    .select("*")
                    .order("id", { ascending: false });
                if (!error) return data;
            } catch (err) {
                console.error("Supabase getExpenses error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_expenses");
        return localData ? JSON.parse(localData) : [];
    },

    async saveExpense(expense) {
        const client = this.getSupabase();
        const payload = { ...expense };
        
        if (client) {
            try {
                let error;
                if (payload.id) {
                    const updatePayload = { ...payload };
                    delete updatePayload.id;
                    const { error: err } = await client
                        .from("expenses")
                        .update(updatePayload)
                        .eq("id", payload.id);
                    error = err;
                } else {
                    const insertPayload = { ...payload };
                    delete insertPayload.id;
                    const { error: err } = await client
                        .from("expenses")
                        .insert([insertPayload]);
                    error = err;
                }
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase saveExpense error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_expenses");
        let expenses = localData ? JSON.parse(localData) : [];
        
        if (payload.id) {
            const index = expenses.findIndex(e => e.id === payload.id);
            if (index !== -1) {
                expenses[index] = payload;
            }
        } else {
            const nextId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id || 0)) + 1 : 1;
            payload.id = nextId;
            expenses.unshift(payload);
        }
        
        localStorage.setItem("angkringan_expenses", JSON.stringify(expenses));
        return { success: true, expense: payload };
    },

    async deleteExpense(id) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { error } = await client.from("expenses").delete().eq("id", id);
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase deleteExpense error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_expenses");
        if (localData) {
            let expenses = JSON.parse(localData);
            expenses = expenses.filter(e => e.id !== id);
            localStorage.setItem("angkringan_expenses", JSON.stringify(expenses));
        }
        return { success: true };
    },

    // ----------------------------------------------------
    // 5. FOOD WASTE (BAHAN BASI) API
    // ----------------------------------------------------
    async getFoodWaste() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from("food_waste")
                    .select("*")
                    .order("id", { ascending: false });
                if (!error) return data;
            } catch (err) {
                console.error("Supabase getFoodWaste error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_food_waste");
        return localData ? JSON.parse(localData) : [];
    },

    async saveFoodWaste(waste) {
        const client = this.getSupabase();
        const payload = { ...waste };

        if (client) {
            try {
                const insertPayload = { ...payload };
                delete insertPayload.id;
                const { error } = await client.from("food_waste").insert([insertPayload]);
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase saveFoodWaste error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_food_waste");
        let wastes = localData ? JSON.parse(localData) : [];

        const nextId = wastes.length > 0 ? Math.max(...wastes.map(w => w.id || 0)) + 1 : 1;
        payload.id = nextId;
        wastes.unshift(payload);

        localStorage.setItem("angkringan_food_waste", JSON.stringify(wastes));
        return { success: true, waste: payload };
    },

    // ----------------------------------------------------
    // 5.5 PELANGGAN (CUSTOMER LOYALTY & DEBT) API
    // ----------------------------------------------------
    async getPelanggan() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from("pelanggan")
                    .select("*")
                    .order("nama", { ascending: true });
                if (!error) return data;
            } catch (err) {
                console.error("Supabase getPelanggan error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_pelanggan");
        if (!localData) {
            // Seed default loyal customers matching wireframes
            const defaultPelanggan = [
                { id: 1, nama: "Budi S.", no_whatsapp: "082329547641", total_transaksi: 15, total_belanja: 245000, saldo_bon: 45000 },
                { id: 2, nama: "Rina W.", no_whatsapp: "081234567890", total_transaksi: 8, total_belanja: 120000, saldo_bon: 78000 },
                { id: 3, nama: "Pak Harto", no_whatsapp: "085712345678", total_transaksi: 22, total_belanja: 410000, saldo_bon: 32000 }
            ];
            localStorage.setItem("angkringan_pelanggan", JSON.stringify(defaultPelanggan));
            return defaultPelanggan;
        }
        return JSON.parse(localData);
    },

    async savePelanggan(pelanggan) {
        const client = this.getSupabase();
        const payload = { ...pelanggan };
        if (client) {
            try {
                let error;
                if (payload.id) {
                    const updatePayload = { ...payload };
                    delete updatePayload.id;
                    const { error: err } = await client
                        .from("pelanggan")
                        .update(updatePayload)
                        .eq("id", payload.id);
                    error = err;
                } else {
                    const insertPayload = { ...payload };
                    delete insertPayload.id;
                    const { error: err } = await client
                        .from("pelanggan")
                        .insert([insertPayload]);
                    error = err;
                }
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase savePelanggan error, falling back:", err);
            }
        }

        let localData = localStorage.getItem("angkringan_pelanggan");
        let list = localData ? JSON.parse(localData) : [];
        if (payload.id) {
            const idx = list.findIndex(p => p.id === payload.id);
            if (idx !== -1) list[idx] = payload;
        } else {
            const nextId = list.length > 0 ? Math.max(...list.map(p => p.id || 0)) + 1 : 1;
            payload.id = nextId;
            list.push(payload);
        }
        localStorage.setItem("angkringan_pelanggan", JSON.stringify(list));
        return { success: true, pelanggan: payload };
    },

    async deletePelanggan(id) {
        const client = this.getSupabase();
        if (client) {
            try {
                const { error } = await client.from("pelanggan").delete().eq("id", id);
                if (!error) return { success: true };
            } catch (err) {
                console.error("Supabase deletePelanggan error, falling back:", err);
            }
        }
        let localData = localStorage.getItem("angkringan_pelanggan");
        if (localData) {
            let list = JSON.parse(localData);
            list = list.filter(p => p.id !== id);
            localStorage.setItem("angkringan_pelanggan", JSON.stringify(list));
        }
        return { success: true };
    },

    // ----------------------------------------------------
    // 6. CONFIGURATION API
    // ----------------------------------------------------
    getSupabaseConfig() {
        const isDisabled = localStorage.getItem("supabase_disabled") === "true";
        if (isDisabled) {
            return { url: "", key: "" };
        }
        return {
            url: localStorage.getItem("supabase_url") || DEFAULT_SUPABASE_URL,
            key: localStorage.getItem("supabase_key") || DEFAULT_SUPABASE_KEY
        };
    },

    async saveSupabaseConfig(url, key) {
        const prevUrl = localStorage.getItem("supabase_url");
        const prevKey = localStorage.getItem("supabase_key");
        const prevDisabled = localStorage.getItem("supabase_disabled");

        if (!url || !key) {
            localStorage.setItem("supabase_disabled", "true");
            localStorage.removeItem("supabase_url");
            localStorage.removeItem("supabase_key");
            return { success: true, message: "Koneksi database di-reset ke LocalStorage." };
        }

        localStorage.removeItem("supabase_disabled");
        localStorage.setItem("supabase_url", url);
        localStorage.setItem("supabase_key", key);

        try {
            if (typeof supabase === "undefined") {
                throw new Error("Pustaka Supabase SDK CDN tidak terdeteksi.");
            }
            const testClient = supabase.createClient(url, key);
            const { error } = await testClient.from("menu_items").select("count").limit(1);
            
            if (error) {
                if (error.code === "PGRST116" || error.message.includes("does not exist")) {
                    return { 
                        success: true, 
                        warning: true, 
                        message: "Terhubung ke Supabase! Tetapi tabel 'menu_items' belum dibuat di database Anda. Silakan jalankan query SQL pembuatan tabel." 
                    };
                }
                throw error;
            }
            return { success: true, message: "Koneksi ke Supabase berhasil terhubung!" };
        } catch (err) {
            console.error("Supabase Connection Test failed:", err);
            if (prevDisabled === "true") localStorage.setItem("supabase_disabled", "true");
            else localStorage.removeItem("supabase_disabled");

            if (prevUrl) localStorage.setItem("supabase_url", prevUrl);
            else localStorage.removeItem("supabase_url");
            
            if (prevKey) localStorage.setItem("supabase_key", prevKey);
            else localStorage.removeItem("supabase_key");

            return { 
                success: false, 
                message: "Gagal terhubung: " + (err.message || "Periksa kembali URL dan Anon Key Anda.") 
            };
        }
    }
};
