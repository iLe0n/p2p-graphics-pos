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

// In-Memory Global Transaction Cart Array Storage
let transactionCart = [];

// Renders options into the selection dropdown elements
function renderPOSDropdown() {
    const select = document.getElementById("matrix-item-select");
    if (!select) return;

    // Preserve the clean layout template prompt
    select.innerHTML = '<option value="">-- Select Print Item --</option>';

    appData.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        
        // Formats price to decimals cleanly (e.g., ₱2.00)
        const itemPrice = parseFloat(item.price) || 0;
        const formattedPrice = `₱${itemPrice.toFixed(2)}`;

        // UPDATED: Replaced [ID: X] with the price format at the front
        option.innerText = `${formattedPrice} - ${item.print_type} (${item.color_category}, ${item.paper_size})`;
        select.appendChild(option);
    });
}

// Controls the individual single-item selection preview box field parameters
function calculateLivePrice() {
    const itemId = document.getElementById("matrix-item-select").value;
    const previewInput = document.getElementById("unit-price-preview");
    if (!previewInput) return;

    const matchedItem = appData.find(i => String(i.id) === String(itemId));
    if (matchedItem) {
        const price = parseFloat(matchedItem.price) || 0;
        previewInput.value = `₱${price.toFixed(2)}`;
    } else {
        previewInput.value = "₱0.00";
    }
}

// NEW: Adds configured element variables to the global multi-item array matrix
function addItemToCart() {
    const itemId = document.getElementById("matrix-item-select").value;
    const qtyInput = document.getElementById("order-qty");
    const qty = parseInt(qtyInput.value) || 0;

    if (!itemId) {
        alert("Please choose a valid Print print item.");
        return;
    }
    if (qty <= 0) {
        alert("Quantity must be 1 or greater.");
        return;
    }

    const matchedItem = appData.find(i => String(i.id) === String(itemId));
    if (!matchedItem) return;

    const basePrice = parseFloat(matchedItem.price) || 0;

    // ADJUSTMENT: Check if the exact same item ID is already sitting in the cart
    const existingCartItem = transactionCart.find(item => String(item.id) === String(itemId));

    if (existingCartItem) {
        // If it exists, add the new quantity to the existing quantity
        existingCartItem.quantity += qty;
        // Recalculate the subtotal for this item row
        existingCartItem.subtotal = existingCartItem.quantity * existingCartItem.basePrice;
    } else {
        // If it's a completely new item, push it to the cart array normally
        const itemTotal = basePrice * qty;
        const productDesc = `${matchedItem.print_type} (${matchedItem.color_category}, ${matchedItem.paper_size})`;
        
        transactionCart.push({
            id: matchedItem.id,
            product: productDesc,
            basePrice: basePrice,
            quantity: qty,
            subtotal: itemTotal
        });
    }

    // Reset entry choices back to default guidelines
    document.getElementById("matrix-item-select").value = "";
    qtyInput.value = "1";
    document.getElementById("unit-price-preview").value = "₱0.00";

    // Update the layout view matrix and recalculate grand totals
    renderCart();
}

// NEW: Wipes all current array variables to entirely cancel an open transaction
function clearFullTransactionCart() {
    if (transactionCart.length === 0) return; // Nothing to clear
    
    const confirmation = confirm("Are you sure you want to cancel this entire transaction and clear the cart?");
    if (confirmation) {
        transactionCart = []; // Empty memory array
        
        // Reset inputs
        const discountInput = document.getElementById("custom-discount-input");
        if (discountInput) discountInput.value = "";
        
        renderCart(); // Re-render empty placeholder layouts & zero out totals
    }
}

// NEW: Removes an individual job position line object from the active checkout basket
function removeItemFromCart(index) {
    transactionCart.splice(index, 1);
    renderCart();
}

// NEW: Renders the structured multi-item layout rows inside the costing panel card
function renderCart() {
    const container = document.getElementById("cart-items-container");
    if (!container) return;

    if (transactionCart.length === 0) {
        container.innerHTML = '<p class="empty-cart-text">No items added to this transaction yet.</p>';
        calculateCartTotals();
        return;
    }

    container.innerHTML = "";
    transactionCart.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "cart-item-row";
        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-title">${item.product}</span>
                <span class="cart-item-meta">Qty: ${item.quantity} × ₱${item.basePrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600;">₱${item.subtotal.toFixed(2)}</span>
                <button type="button" onclick="removeItemFromCart(${index})" class="btn-delete-cart" title="Remove Item">✕</button>
            </div>
        `;
        container.appendChild(row);
    });

    calculateCartTotals();
}

// NEW: Computes pricing structures over the full multi-item cart elements
function calculateCartTotals() {
    let subtotal = 0;
    transactionCart.forEach(item => subtotal += item.subtotal);

    const discountInput = document.getElementById("custom-discount-input").value;
    let discountPercent = parseFloat(discountInput) || 0;
    if (discountPercent < 0) discountPercent = 0;
    if (discountPercent > 100) discountPercent = 100;

    const discountedTotal = subtotal * (1 - (discountPercent / 100));

    document.getElementById("summary-subtotal").innerText = `₱${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("summary-total").innerText = `₱${discountedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// UPDATED: Dispatches all added items back-to-back under a matching Order ID link
async function submitOrder() {
    if (transactionCart.length === 0) {
        alert("Cannot process checkout transaction: Your order cart is empty.");
        return;
    }

    updateStatus("busy", "Logging transaction data...");

    // 1. Generate ONE absolute unified Order ID for the whole transaction group
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);               
    const mm = String(now.getMonth() + 1).padStart(2, '0');       
    const hh = String(now.getHours()).padStart(2, '0');           
    const mins = String(now.getMinutes()).padStart(2, '0');       
    const ss = String(now.getSeconds()).padStart(2, '0');         
    const sharedOrderId = `P2P-${yy}${mm}${hh}${mins}${ss}`;

    // Get the global transaction discount rate to distribute proportionally among line rows
    const discountPercent = parseFloat(document.getElementById("custom-discount-input").value) || 0;

    let submissionSuccess = true;

    // 2. Loop through every single cart object and append rows to Google Sheets
    for (const item of transactionCart) {
        // Compute individual row total proportional value after discount
        const calculatedRowTotalPaid = item.subtotal * (1 - (discountPercent / 100));

        const payload = {
            action: "addSale",
            orderId: sharedOrderId, 
            product: item.product,
            basePrice: item.basePrice,
            quantity: item.quantity,
            totalPaid: calculatedRowTotalPaid
        };

        // Handle simulation/mock context boundary checks seamlessly
        if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER" || API_URL.includes("MOCK_CONTEXT")) {
            console.log("Mock submission context line row logged: ", payload);
            continue;
        }

        try {
            await fetch(API_URL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(payload)
            });
        } catch(e) { 
            console.error("Row log error context: ", e);
            submissionSuccess = false;
        }
    }

    // 3. Clear data configurations on final execution response
    updateStatus("ready", "Connected");

    if (submissionSuccess) {
        // Build the informative text string matching what you had before
        const briefDetails = `Saved ${transactionCart.length} print job item(s) under Unified Order ID Link: ${sharedOrderId}`;
        
        // Wipe cart tracking arrays clean
        transactionCart = [];
        const discountInput = document.getElementById("custom-discount-input");
        if (discountInput) discountInput.value = "";
        renderCart();
        
        // NEW: Launch the themed popup instead of using alert()
        showSuccessModal(briefDetails);
    } else {
        alert("Warning: Some line row entries failed pushing cleanly to your destination Google Sheet.");
    }
}

// Generates layout itemizations dynamically inside control boards
function renderPricingTable() {
    const tbody = document.getElementById("pricing-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    appData.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><span class="badge">${item.print_type}</span></td>
            <td>${item.color_category}</td>
            <td class="text-muted" style="font-size: 0.813rem;">${item.description || 'No alternative stock material description notes configured.'}</td>
            <td><code>${item.paper_size}</code></td>
            <td>
                <div class="input-group">
                    <span class="input-group-text">₱</span>
                    <input type="number" id="price-input-${item.id}" value="${item.price}" step="0.01" min="0" class="form-control" style="max-width: 100px;">
                </div>
            </td>
            <td>
                <button onclick="updatePriceField('${item.id}')" class="btn btn-update">Update</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Pushes localized price mutations upstream to master sheets environment 
async function updatePriceField(id) {
    const inputField = document.getElementById(`price-input-${id}`);
    if (!inputField) return;

    const parsedNewValue = parseFloat(inputField.value);
    if (isNaN(parsedNewValue) || parsedNewValue < 0) {
        alert("Please output a valid positive pricing entry standard.");
        return;
    }

    updateStatus("busy", "Updating master pricing matrix...");

    const payload = {
        action: "updatePrice",
        id: String(id),
        newValue: parsedNewValue
    };

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        const itemIndex = appData.findIndex(i => String(i.id) === String(id));
        if (itemIndex !== -1) appData[itemIndex].price = parsedNewValue;
        renderPOSDropdown();
        updateStatus("ready", "Connected");
        alert(`[Simulation Mode Check] Mutated ID pricing structure to: ₱${parsedNewValue}`);
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });
        
        // Refetch and reinitialize frontend state variables automatically
        await fetchDatabaseRows();
        alert("Master data matrix parameters successfully written to remote sheets rows!");
    } catch (error) {
        console.error(error);
        updateStatus("error", "Network sync handshake broken");
        alert("Failed communicating target configuration adjustments upstream.");
    }
}

// Queries real-time parameters straight out from Spreadsheet source components
async function fetchDatabaseRows() {
    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        // Fallback production simulation data
        appData = [
            { id: "101", print_type: "Document Print", color_category: "Black & White", description: "70gsm Bond Paper", paper_size: "A4 Short", price: 2.00 },
            { id: "102", print_type: "Document Print", color_category: "Full CMYK Color", description: "80gsm Premium Bond", paper_size: "A4 Short", price: 5.00 },
            { id: "201", print_type: "Photo Print", color_category: "High Gloss Color", description: "230gsm Premium Photo Stock", paper_size: "4R Size", price: 15.00 },
            { id: "301", print_type: "Sticker Sheet", color_category: "Full CMYK Color", description: "Matte Vinyl Waterproof", paper_size: "A4 Size", price: 45.00 }
        ];
        renderPOSDropdown();
        renderPricingTable();
        updateStatus("ready", "Simulation Data Connected");
        return;
    }

    try {
        const response = await fetch(`${API_URL}?action=getData`);
        const jsonResult = await response.json();
        
        appData = jsonResult;
        renderPOSDropdown();
        renderPricingTable();
        updateStatus("ready", "Connected");
    } catch (err) {
        console.error("Retrieval Matrix Error Context: ", err);
        updateStatus("error", "Data load timeout failure");
    }
}

// Alternates app appearance layouts 
function toggleDarkMode() {
    const checkbox = document.getElementById('checkbox');
    const label = document.querySelector('.switch-label');
    
    if (checkbox.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (label) label.innerText = '☀️ Mode';
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (label) label.innerText = '🌙 Mode';
    }
}

// UPDATE: Real-time Clock Initialization
function startLiveClock() {
    const clockEl = document.getElementById("live-clock");
    if (!clockEl) return;

    function updateTime() {
        const now = new Date();
        const options = { 
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true 
        };
        clockEl.innerText = now.toLocaleString('en-US', options);
    }
    updateTime();
    setInterval(updateTime, 1000);
}

// NEW: Opens the themed success window and explicitly captures keyboard input focus
function showSuccessModal(messageText) {
    const modal = document.getElementById("success-modal");
    const msgEl = document.getElementById("success-modal-message");
    const okBtn = document.getElementById("success-modal-ok-btn");
    
    if (!modal || !okBtn) return;
    
    if (msgEl) msgEl.innerText = messageText;
    
    // Reveal modal frame element layer
    modal.classList.remove("hidden");
    
    // Explicitly focus the OK button immediately so Spacebar/Enter closes it instantly
    setTimeout(() => {
        okBtn.focus();
    }, 50);
}

// NEW: Closes the success modal and returns focus back to item entry fields
function closeSuccessModal() {
    const modal = document.getElementById("success-modal");
    if (modal) modal.classList.add("hidden");
    
    // Refocus back onto item select menu to prepare for the next transaction loop automatically
    const selectBox = document.getElementById("matrix-item-select");
    if (selectBox) selectBox.focus();
}

// Entry lifecycle attachment systems
document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById('checkbox');
    const label = document.querySelector('.switch-label');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (checkbox) checkbox.checked = true;
        if (label) label.innerText = '☀️ Mode';
    }

    startLiveClock();
    fetchDatabaseRows();
});
