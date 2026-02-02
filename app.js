import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFYubxSUHpP6g5Vvwt65gsWXDr5Ux535o",
    databaseURL: "https://lumiere-erp-default-rtdb.firebaseio.com",
    projectId: "lumiere-erp"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let state = { tables: [] };
let activeId = null;

const inventory = [
    { id: 1, name: "Escargot de Bourgogne", price: 850, cat: "Starters" },
    { id: 2, name: "Pan-Seared Scallops", price: 1200, cat: "Starters" },
    { id: 3, name: "Filet Mignon", price: 3400, cat: "Mains" },
    { id: 4, name: "Lobster Thermidor", price: 4200, cat: "Mains" },
    { id: 5, name: "Truffle Mash", price: 650, cat: "Sides" },
    { id: 6, name: "Vintage Champagne", price: 8500, cat: "Drinks" }
];

// Database Listener
onValue(ref(db, 'lumiere_v_final_pro'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 30}, (_, i) => ({ id: i+1, status: 'available', cart: [] }));
    render();
});

function render() {
    // Floor Render
    document.getElementById('table-grid').innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status}" onclick="openTable(${t.id})">
            <b>${t.id}</b>
            ${t.cart.length > 0 ? `<span class="cart-tag">${t.cart.length}</span>` : ''}
        </div>`).join('');

    // KDS Render
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card">
            <div class="kds-meta"><b>Table ${t.id}</b> <span>${t.orderTime}</span></div>
            <div class="kds-body">${t.cart.map(i => `<p>${i.qty}x ${i.name}</p>`).join('')}</div>
            <button class="done-btn" onclick="updateStatus(${t.id}, 'served')">SERVE</button>
        </div>`).join('');

    // Billing Render
    const activeBills = state.tables.filter(t => t.cart.length > 0 && t.status !== 'ordering');
    document.getElementById('bill-grid').innerHTML = activeBills.map(t => `
        <div class="bill-card">
            <h4>Table ${t.id}</h4>
            <p>Total: Rs. ${t.cart.reduce((s, i) => s + (i.price * i.qty), 0)}</p>
            <button onclick="settle(${t.id})">SETTLE BILL</button>
        </div>`).join('');

    if (activeId) renderCart();
}

window.openTable = (id) => {
    activeId = id;
    document.getElementById('active-table-title').innerText = `Table ${id}`;
    document.getElementById('drawer').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    renderMenu();
    renderCart();
};

window.renderMenu = () => {
    const cats = [...new Set(inventory.map(i => i.cat))];
    document.getElementById('cat-bar').innerHTML = cats.map(c => `<button onclick="filterMenu('${c}')">${c}</button>`).join('');
    filterMenu(cats[0]);
};

window.filterMenu = (cat) => {
    const items = inventory.filter(i => i.cat === cat);
    document.getElementById('menu-items').innerHTML = items.map(i => `
        <div class="menu-btn" onclick="updateQty(${i.id}, 1)">
            <strong>${i.name}</strong><br>Rs. ${i.price}
        </div>`).join('');
};

window.updateQty = (mid, change) => {
    const table = state.tables[activeId - 1];
    let entry = table.cart.find(c => c.id === mid);
    if (entry) {
        entry.qty += change;
        if (entry.qty <= 0) table.cart = table.cart.filter(c => c.id !== mid);
    } else if (change > 0) {
        const item = inventory.find(i => i.id === mid);
        table.cart.push({ ...item, qty: 1 });
    }
    if(table.status === 'available') table.status = 'ordering';
    save();
};

window.fireOrder = () => {
    const table = state.tables[activeId - 1];
    if (table.cart.length === 0) return;
    table.status = 'cooking';
    table.orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    save();
    closeDrawer();
};

function renderCart() {
    const table = state.tables[activeId - 1];
    let total = table.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('cart-list').innerHTML = table.cart.map(i => `
        <div class="cart-row">
            <span>${i.name}</span>
            <div class="qty-group">
                <button onclick="updateQty(${i.id}, -1)">-</button>
                <span>${i.qty}</span>
                <button onclick="updateQty(${i.id}, 1)">+</button>
            </div>
        </div>`).join('');
    document.getElementById('sub-total').innerText = `Rs. ${total}`;
    document.getElementById('grand-total').innerText = `Rs. ${total}`;
}

window.updateStatus = (id, status) => { state.tables[id-1].status = status; save(); };
window.settle = (id) => { if(confirm(`Settle Bill for Table ${id}?`)) { state.tables[id-1].status = 'available'; state.tables[id-1].cart = []; save(); } };
const save = () => set(ref(db, 'lumiere_v_final_pro'), state);
window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); document.getElementById('overlay').classList.remove('active'); activeId = null; };
window.showMod = (mod, btn) => {
    document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};
setInterval(() => { document.getElementById('sys-clock').innerText = new Date().toLocaleTimeString(); }, 1000);
