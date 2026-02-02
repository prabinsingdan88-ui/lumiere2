import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFYubxSUHpP6g5Vvwt65gsWXDr5Ux535o",
    authDomain: "lumiere-erp.firebaseapp.com",
    projectId: "lumiere-erp",
    databaseURL: "https://lumiere-erp-default-rtdb.firebaseio.com",
    appId: "1:78622005633:web:c231e3862e13787686b080"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let state = { tables: [] };
let activeId = null;

const inventory = [
    { id: 1, name: "Arancini", price: 450, cat: "Starters" },
    { id: 2, name: "Wagyu Burger", price: 1250, cat: "Mains" },
    { id: 3, name: "Truffle Fries", price: 350, cat: "Sides" },
    { id: 4, name: "Chardonnay", price: 950, cat: "Drinks" },
    { id: 5, name: "Calamari", price: 550, cat: "Starters" },
    { id: 6, name: "Ribeye Steak", price: 2200, cat: "Mains" }
];

onValue(ref(db, 'lumiere_vwhite'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'available', cart: [] }));
    render();
});

function render() {
    renderTables();
    renderKDS();
    if(activeId) renderCart();
}

window.updateCart = (mId, change) => {
    const table = state.tables[activeId - 1];
    const item = inventory.find(i => i.id === mId);
    let entry = table.cart.find(c => c.id === mId);

    if (entry) {
        entry.qty += change;
        if(entry.qty <= 0) table.cart = table.cart.filter(c => c.id !== mId);
    } else if (change > 0) {
        table.cart.push({ ...item, qty: 1 });
    }
    
    table.status = table.cart.length > 0 ? 'ordering' : 'available';
    save();
};

window.fireOrder = () => {
    const table = state.tables[activeId - 1];
    if(table.cart.length === 0) return;
    table.status = 'cooking';
    table.orderMeta = {
        orderNo: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    save();
    window.closeDrawer();
};

function renderCart() {
    const table = state.tables[activeId - 1];
    let total = 0;
    document.getElementById('cart-list').innerHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="cart-row">
            <div class="item-info"><strong>${i.name}</strong><br><small>Rs. ${i.price}</small></div>
            <div class="qty-control">
                <button onclick="window.updateCart(${i.id}, -1)">-</button>
                <span>${i.qty}</span>
                <button onclick="window.updateCart(${i.id}, 1)">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

window.filterMenu = (category) => {
    const items = inventory.filter(item => item.cat === category);
    document.getElementById('menu-items').innerHTML = items.map(i => `
        <div class="menu-item" onclick="window.updateCart(${i.id}, 1)">
            <strong>${i.name}</strong>
            <span>Rs. ${i.price}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.cat-bar button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === category);
    });
};

function renderMenuUI() {
    const categories = [...new Set(inventory.map(item => item.cat))];
    document.getElementById('cat-bar').innerHTML = categories.map(cat => `
        <button onclick="window.filterMenu('${cat}')">${cat}</button>
    `).join('');
    window.filterMenu(categories[0]);
}

window.openTable = (id) => {
    activeId = id;
    document.getElementById('table-title').innerText = `TABLE ${id}`;
    document.getElementById('drawer').classList.add('active');
    renderMenuUI();
    renderCart();
};

window.showModule = (mod, btn) => {
    document.querySelectorAll('.module-view').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};

window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); activeId = null; };
window.serve = (id) => { state.tables[id-1].status = 'available'; state.tables[id-1].cart = []; save(); };
const save = () => set(ref(db, 'lumiere_vwhite'), state);
function renderTables() { document.getElementById('table-grid').innerHTML = state.tables.map(t => `<div class="table-card ${t.status}" onclick="window.openTable(${t.id})"><strong>${t.id}</strong></div>`).join(''); }
function renderKDS() {
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card">
            <div class="kds-header"><b>T-${t.id}</b> <span>${t.orderMeta.orderNo}</span></div>
            <div class="kds-time">${t.orderMeta.time}</div>
            <div class="kds-items">${t.cart.map(i => `<p>${i.qty}x ${i.name}</p>`).join('')}</div>
            <button class="done-btn" onclick="window.serve(${t.id})">READY</button>
        </div>`).join('');
}
