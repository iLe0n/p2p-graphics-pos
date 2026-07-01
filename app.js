// Paste your copied Google Web App URL deployment here
const API_URL = "https://script.google.com/macros/s/AKfycbwEbDDpjNX0L5WjYC7WMbhSmWb6eONC1OWI3lV86uqtuTDb8XLUDM4AZXvW3qwiAe0V/exec";

// Fallback demo dataset while Google Sheets finishes loading
let appData = [];
// Global memory state tracking where the nav engine wants to route next
let intendedPageTarget = "pos-page";

// Helper function to dynamically alter status display variables
function updateStatus(state, message) {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (!dot || !text) return;

    // Reset indicator classes
    dot.className = "dot " + state;
    text.innerText = message;
}

// Dispatches physical active/hidden element visual shifts
function executePageTransition(pageId) {
    if (pageId === 'pos-page') {
        document.getElementById('pos-page').classList.remove('hidden');
        document.getElementById('admin-page').classList.add('hidden');
    } else if (pageId === 'admin-page') {
        document.getElementById('pos-page').classList.add('hidden');
        document.getElementById('admin-page').classList.remove('hidden');
    }

    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.classList.remove('active-nav');
        const onClickAttr = btn.getAttribute('onclick') || '';
        if (onClickAttr.includes(pageId)) {
            btn.classList.add('active-nav');
        }
    });
}

// Closes verification screen without saving changes
function cancelPasswordModal() {
    document.getElementById("password-modal").classList.add("hidden");
}

// Evaluates verification credential matrix values securely 
function submitPasswordModal() {
    const enteredPassword = document.getElementById("modal-password-input").value;
    
    if (enteredPassword === "P2PAdmin2026") {
        document.getElementById("password-modal").classList.add("hidden");
        executePageTransition(intendedPageTarget);
    } else {
        alert("Access Denied: Invalid credentials.");
        document.getElementById("modal-password-input").value = "";
        document.getElementById("modal-password-input").focus();
    }
}

// Handles switching tabs on the main navigation panel
function switchPage(pageId) {
    if (pageId === 'admin-page') {
        intendedPageTarget = 'admin-page';
        
        // Open custom theme modal and focus input field cleanly
        const modal = document.getElementById("password-modal");
        const passwordInput = document.getElementById("modal-password-input");
        if (modal && passwordInput) {
            passwordInput.value = "";
            modal.classList.remove("hidden");
            passwordInput.focus();
            
            // Allow clicking Enter key inside text input field box to verify instantly
            passwordInput.onkeydown = function(e) {
                if (e.key === "Enter") submitPasswordModal();
            };
        }
        return; 
    }

    // Standard public page execution routing mechanics
    executePageTransition(pageId);
}

// Pulls real-time prices from the sheet middleware
async function fetchSheetData() {
    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER" || API_URL === "" || API_URL.includes("PLACEHOLDER")) {
        updateStatus("error", "URL Missing");
        return;
    }
    
    // Set status to yellow (busy) when starting a fetch loop
    updateStatus("busy", "Syncing Sheets...");
    
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Network status invalid");
        
        appData = await res.json();
        
        renderPOSDropdowns();
        renderAdminDashboard();
        calculateLivePrice();
        
        // Set status to green (ready) upon successful injection parsing
        updateStatus("ready", "Connected");
    } catch (err) { 
        console.error("Error connecting to Google Script API: ", err); 
        // Set status to red (error) if an exception event fires
        updateStatus("error", "Read Timeout / Error");
    }
}

// Populates the drop downs on the register view screen
function renderPOSDropdowns() {
    const itemSel = document.getElementById("matrix-item-select");
    if (!itemSel) return;

    itemSel.innerHTML = "";

    appData.forEach(item => {
        // Build an explicit visual label representing the unique configuration matrix row
        const labelText = `${item.print_type} | ${item.color_category} | ${item.description} [Size: ${item.paper_size}]`;
        const basePrice = parseFloat(item.price) || 0;
        
        itemSel.innerHTML += `<option value="${item.id}">₱${basePrice.toFixed(2)} - ${labelText}</option>`;
    });
}

// Calculates dynamic totals with tier-break discounts instantly
function calculateLivePrice() {
    const itemSelect = document.getElementById("matrix-item-select");
    if (!itemSelect || !itemSelect.value) {
        // Safe defaults if sheet hasn't loaded data yet
        document.getElementById("summary-base").innerText = "₱0.00";
        document.getElementById("summary-discount").innerText = "No discount applied";
        document.getElementById("summary-total").innerText = "₱0.00";
        return;
    }

    const itemId = itemSelect.value;
    const qty = parseInt(document.getElementById("order-qty").value) || 0;

    // 1. Parse your new manual discount text input field (defaults to 0 if empty/non-numeric)
    const discountInput = document.getElementById("custom-discount-input").value;
    let discountPercent = parseFloat(discountInput) || 0;

    // Clamp the percentage strictly between 0% and 100%
    if (discountPercent < 0) discountPercent = 0;
    if (discountPercent > 100) discountPercent = 100;

    const matchedItem = appData.find(i => String(i.id) === String(itemId));
    const unitPrice = matchedItem ? parseFloat(matchedItem.price) : 0;

    // 2. Updated Cost Calculation Matrix
    const baseCost = unitPrice * qty;
    const discountMultiplier = discountPercent / 100;
    const absoluteTotal = baseCost * (1 - discountMultiplier);

    // 3. Update the UI fields (Notice summary-mods is removed)
    document.getElementById("summary-base").innerText = `₱${unitPrice.toFixed(2)}`;
    document.getElementById("summary-qty").innerText = qty.toLocaleString();
    
    // Updates the display indicator
    const discountDisplay = document.getElementById("summary-discount");
    if (discountDisplay) {
        discountDisplay.innerText = discountPercent > 0 ? `${discountPercent}%` : "0%";
    }

    document.getElementById("summary-total").innerText = `₱${absoluteTotal.toFixed(2)}`;
}

// Populates the editable backend config console data rows
function renderAdminDashboard() {
    const tbody = document.getElementById("pricing-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    appData.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="font-family: monospace; color: #9ca3af; font-size: 0.75rem;">${item.id}</td>
                <td style="font-weight: 500;">${item.print_type || ''}</td>
                <td><span class="badge badge-prod">${item.color_category || ''}</span></td>
                <td>${item.description || ''}</td>
                <td><span class="badge badge-attr">${item.paper_size || ''}</span></td>
                <td><input type="number" step="0.01" id="input-${item.id}" value="${item.price}" class="table-input"></td>
                <td><button onclick="savePriceInline('${item.id}')" class="btn btn-update">Update</button></td>
            </tr>
        `;
    });
}

// Pushes updated price adjustments back up to GSheets row parameters
async function savePriceInline(id) {
    const newVal = parseFloat(document.getElementById(`input-${id}`).value);
    const target = appData.find(i => i.id === id);
    if (target) target.value = newVal;

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER" || API_URL === "" || API_URL.includes("PLACEHOLDER")) { 
        alert("Local matrix updated! (Provide your App Script URL link to execute remote writes)."); 
        calculateLivePrice();
        return; 
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ action: "updatePrice", id: id, newValue: newVal })
        });
        alert("Success! Master matrix synced.");
        calculateLivePrice();
    } catch (e) { 
        alert("Network update drop occurred."); 
    }
}

// Registers transaction payloads directly down into your explicit Sales sheet schema headers
async function submitOrder() {
    const itemId = document.getElementById("matrix-item-select").value;
    const qty = document.getElementById("order-qty").value;
    const price = document.getElementById("summary-total").innerText;
    const randId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

    const matchedItem = appData.find(i => i.id === itemId);
    const orderDetails = matchedItem ? `${matchedItem.print_type} (${matchedItem.color_category}, ${matchedItem.paper_size})` : "Custom Job";

    const payload = {
        action: "addSale",
        orderId: randId,
        product: orderDetails,
        quantity: qty,
        totalPaid: price
    };

    if (API_URL === "https://script.google.com/macros/s/AKfycbzYlZRBZ3MBVgk0NIIzKPk6xTemnQzzm6XWCbxH-atpyZM8kIXYc8hfDKyDxyCElHp3/exec") {
        console.log("Mock submission context: ", payload);
        alert(`POS Simulation Clear!\nItem: ${payload.product}\nQuantity: ${payload.quantity}\nOrder Code generated: ${payload.orderId}`);
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });
        alert(`Transaction successfully processed & dispatched!\nSaved to 'Sales' tab under Order ID: ${randId}`);
    } catch(e) { 
        alert("Failed logging transaction schema to destination sheet."); 
    }
}

// UPDATE: Dark mode toggler function
function toggleDarkMode() {
    const checkbox = document.getElementById('checkbox');
    const label = document.querySelector('.switch-label');
    
    if (checkbox.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        label.innerText = '☀️ Mode';
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        label.innerText = '🌙 Mode';
    }
}

// UPDATE: Added Real-time Clock Function
function startLiveClock() {
    const clockEl = document.getElementById("live-clock");
    if (!clockEl) return;

    function updateTime() {
        const now = new Date();
        
        // Formats date nicely (e.g., "July 1, 2026, 4:24:00 PM")
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        };
        
        clockEl.innerText = now.toLocaleString('en-US', options);
    }

    // Run instantly on layout generation, then update every single second
    updateTime();
    setInterval(updateTime, 1000);
}

// Initial script execution sequences
document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById('checkbox');
    const label = document.querySelector('.switch-label');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (checkbox) checkbox.checked = true;
        if (label) label.innerText = '☀️ Mode';
    }

    // Initialize application templates
    renderPOSDropdowns();
    renderAdminDashboard();
    
    // UPDATE: Ignite the ticking background process for the live clock
    startLiveClock();
    
    // Run the spreadsheet remote pipeline call
    fetchSheetData();
});