// SYSTEM SECURITY CREDENTIALS
const MASTER_SYSTEM_PASSCODE = "P2PADMIN2026"; // Change this string value to your desired system password

// Immediately evaluate authorization layer parameters as script initializes
(function initializeSecurityGatekeeper() {
    document.addEventListener("DOMContentLoaded", () => {
        const isUnlocked = sessionStorage.getItem("p2p_pos_authorized") === "true";
        const lockScreen = document.getElementById("master-lock-screen");
        const passwordField = document.getElementById("master-passcode-input");
        
        if (isUnlocked) {
            if (lockScreen) lockScreen.remove(); // Safely strip security barrier out entirely if verified
        } else {
            if (passwordField) {
                setTimeout(() => {
                    passwordField.focus(); // Snap focus directly into field for immediate keyboard entry
                }, 100);
            }
        }
    });
})();

// Evaluates user entry values against secure environment constants
function checkMasterPasscode() {
    const inputField = document.getElementById("master-passcode-input");
    const errorEl = document.getElementById("lock-screen-error");
    const lockScreen = document.getElementById("master-lock-screen");
    
    if (!inputField) return;
    
    const providedVal = inputField.value;
    
    if (providedVal === MASTER_SYSTEM_PASSCODE) {
        // Store verification inside session memory flags
        sessionStorage.setItem("p2p_pos_authorized", "true");
        
        // Dynamic clean fade exit
        if (lockScreen) {
            lockScreen.style.opacity = "0";
            lockScreen.style.transition = "opacity 0.25s ease";
            setTimeout(() => lockScreen.remove(), 250);
        }
    } else {
        if (errorEl) errorEl.innerText = "Access Denied: Invalid Passcode Provided.";
        inputField.value = "";
        inputField.focus();
        
        // Clear error notification after a small reading window delay
        setTimeout(() => {
            if (errorEl) errorEl.innerText = "";
        }, 3000);
    }
}


// Paste your copied Google Web App URL deployment here
const API_URL = "https://script.google.com/macros/s/AKfycbwfVRUa6uQG4255lkdvTCZQMzz8ZUBaPi97TKw7MiCTPqvK8Ns030xnNJKs6hs1Jj-h/exec";

// Fallback demo dataset while Google Sheets finishes loading
let appData = [];
let salesData = [];
// Global memory state tracking where the nav engine wants to route next
let intendedPageTarget = "pos-page";
// State boundaries tracking matrix table pagination controls
let currentMatrixPage = 1;
let itemsPerPageLimit = 10; // Default fallback view threshold configuration

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
        document.getElementById('admin-sales-page').classList.add('hidden');
    } else if (pageId === 'admin-page') {
        document.getElementById('pos-page').classList.add('hidden');
        document.getElementById('admin-page').classList.remove('hidden');
        document.getElementById('admin-sales-page').classList.add('hidden');
    } else if (pageId === 'admin-sales-page') {
        document.getElementById('admin-sales-page').classList.remove('hidden');
        document.getElementById('pos-page').classList.add('hidden');
        document.getElementById('admin-page').classList.add('hidden');
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
    const modal = document.getElementById("password-modal");
    const inputField = document.getElementById("modal-password-input");
    const errorField = document.getElementById("modal-password-error");
    const peekBtn = document.getElementById("peek-modal-password-btn");

    if (modal) modal.classList.add("hidden");
    
    if (inputField) {
        inputField.value = "";
        inputField.type = "password"; // Reset type mask safely
        inputField.style.letterSpacing = "0.125em";
    }
    if (errorField) errorField.innerText = "";
    if (peekBtn) {
        peekBtn.innerText = "PEEK";
        peekBtn.style.color = "#6b7280";
    }
}

// Refreshes the currently requested admin table data after access is granted
async function refreshProtectedPageData(pageId) {
    if (pageId === 'admin-page') {
        await fetchDatabaseRows();
    } else if (pageId === 'admin-sales-page') {
        await fetchSalesRecords();
    }
}

// Evaluates verification credential matrix values securely 
async function submitPasswordModal() {
    const passwordInput = document.getElementById("modal-password-input");
    const errorEl = document.getElementById("modal-password-error");
    if (!passwordInput) return;

    const enteredPassword = passwordInput.value;

    if (enteredPassword === "a") {
        // Correct password -> close modal and navigate to admin view panel cleanly
        if (errorEl) errorEl.innerText = "";
        document.getElementById("password-modal").classList.add("hidden");
        executePageTransition(intendedPageTarget);
        await refreshProtectedPageData(intendedPageTarget);
    } else {
        // NEW: Handles authentication failures completely within the inline panel
        passwordInput.value = ""; // Wipe text context fields
        
        if (errorEl) {
            errorEl.innerText = "❌ Invalid Password. Please try again.";
        }
        
        // Retain focus on the password box so the clerk can start typing immediately
        passwordInput.focus();
    }
}

// Handles switching tabs on the main navigation panel
function switchPage(pageId) {
    if (pageId === 'admin-page' || pageId === 'admin-sales-page') {
        intendedPageTarget = pageId;
        const modal = document.getElementById("password-modal");
        const passwordInput = document.getElementById("modal-password-input");
        const errorEl = document.getElementById("modal-password-error");
        
        if (modal && passwordInput) {
            if (errorEl) errorEl.innerText = ""; // Clear out stale error states
            passwordInput.value = ""; // Clear string data inputs
            modal.classList.remove("hidden");
            
            // NEW: Add event listener so pressing Enter triggers the verification function
            passwordInput.onkeydown = function(event) {
                if (event.key === "Enter") {
                    event.preventDefault(); // Stop standard browser behaviors
                    submitPasswordModal();
                }
            };
            
            setTimeout(() => {
                passwordInput.focus();
            }, 50);
        }
        return;
    }
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
        option.innerText = `${formattedPrice} - ${item.description} (${item.paper_size})`;
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

    const modal = document.getElementById("confirm-clear-modal");
    const yesBtn = document.getElementById("confirm-clear-yes-btn");
    
    if (!modal || !yesBtn) return;

    // Reveal modal frame element layer
    modal.classList.remove("hidden");

    // Automatically focus the dangerous action button ("Yes, Clear Cart")
    // Pressing Enter or Spacebar will immediately clear it
    setTimeout(() => {
        yesBtn.focus();
    }, 50);
}

// NEW: Executes the clear action if the operator confirms
function executeClearCart() {
    transactionCart = []; // Empty memory array

    // Reset inputs
    const discountInput = document.getElementById("custom-discount-input");
    if (discountInput) discountInput.value = "";

    // Close modal window
    closeClearModal();

    // Re-render empty placeholder layouts & zero out totals
    renderCart();
}

// NEW: Closes the confirmation modal safely without changing cart data
function closeClearModal() {
    const modal = document.getElementById("confirm-clear-modal");
    if (modal) modal.classList.add("hidden");

    // Return focus back onto item select menu to continue working smoothly
    const selectBox = document.getElementById("matrix-item-select");
    if (selectBox) selectBox.focus();
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

let currentSalesPage = 1;
let salesProductFilter = "";
let salesTimestampStartFilter = "";
let salesTimestampEndFilter = "";

function getFilteredSalesList() {
    const salesList = salesData || [];
    const productFilter = salesProductFilter.trim().toLowerCase();
    const startFilter = salesTimestampStartFilter.trim();
    const endFilter = salesTimestampEndFilter.trim();

    return salesList.filter(sale => {
        const productText = String(sale.product || "").toLowerCase();
        const orderIdText = String(sale.order_id || "").toLowerCase();
        const productMatch = !productFilter || productText.includes(productFilter) || orderIdText.includes(productFilter);

        let timestampMatch = true;
        if (startFilter || endFilter) {
            const saleDate = sale.sale_ts ? new Date(sale.sale_ts) : null;
            const startDate = startFilter ? new Date(startFilter) : null;
            const endDate = endFilter ? new Date(endFilter) : null;

            if (saleDate && !isNaN(saleDate.getTime())) {
                const afterStart = !startDate || saleDate >= startDate;
                const beforeEnd = !endDate || saleDate <= endDate;
                timestampMatch = afterStart && beforeEnd;
            } else {
                timestampMatch = false;
            }
        }

        return productMatch && timestampMatch;
    });
}

function updateSalesFilters() {
    const productInput = document.getElementById("sales-product-filter");
    const startInput = document.getElementById("sales-timestamp-start-filter");
    const endInput = document.getElementById("sales-timestamp-end-filter");

    salesProductFilter = productInput ? productInput.value : "";
    salesTimestampStartFilter = startInput ? startInput.value : "";
    salesTimestampEndFilter = endInput ? endInput.value : "";
    currentSalesPage = 1;
    renderSalesTable();
}

function clearSalesFilters() {
    const productInput = document.getElementById("sales-product-filter");
    const startInput = document.getElementById("sales-timestamp-start-filter");
    const endInput = document.getElementById("sales-timestamp-end-filter");

    if (productInput) productInput.value = "";
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    salesProductFilter = "";
    salesTimestampStartFilter = "";
    salesTimestampEndFilter = "";
    currentSalesPage = 1;
    renderSalesTable();
}

function exportSalesTable() {
    const rows = getFilteredSalesList();

    if (!rows.length) {
        alert("No sales records to export.");
        return;
    }

    const header = ["Order ID", "Sale Timestamp", "Product", "Base Price", "Quantity", "Total Paid"];
    const csvRows = [header.join(",")];

    rows.forEach(sale => {
        const values = [
            `"${String(sale.order_id || "").replace(/"/g, '""')}"`,
            `"${String(sale.sale_ts || "").replace(/"/g, '""')}"`,
            `"${String(sale.product || "").replace(/"/g, '""')}"`,
            parseFloat(sale.base_price || 0).toFixed(2),
            parseInt(sale.quantity || 0, 10),
            parseFloat(sale.total_pd || 0).toFixed(2)
        ];
        csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function renderSalesTable() {
    const tbody = document.getElementById("sales-table-body");
    const paginationControls = document.getElementById("sales-pagination-controls");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filteredSalesList = getFilteredSalesList();

    // Calculate structural pagination slicing bounds metrics
    const totalItemsCount = filteredSalesList.length;
    const totalPagesCount = Math.ceil(totalItemsCount / itemsPerPageLimit) || 1;
    
    // Ensure active page pointer doesn't fall out-of-bounds after deleting records
    if (currentSalesPage > totalPagesCount) {
        currentSalesPage = totalPagesCount;
    }

    const startIndex = (currentSalesPage - 1) * itemsPerPageLimit;
    const endIndex = startIndex + itemsPerPageLimit;
    const paginatedItemsList = filteredSalesList.slice(startIndex, endIndex);

    // If no data exists, display a clean fallback placeholder row
    if (totalItemsCount === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #6b7280; padding: 16px;">No matching transaction records found.</td></tr>`;
        if (paginationControls) {
            paginationControls.innerHTML = "";
            paginationControls.style.borderTop = "none";
        }
        return;
    }

    // 1. Loop and display sliced dataset records matching the current page
    paginatedItemsList.forEach(sale => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td><strong>${sale.order_id || 'N/A'}</strong></td>
            <td>${
            sale.sale_ts
                ? (() => {
                    const d = new Date(sale.sale_ts);

                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const yy = String(d.getFullYear()).slice(-2);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    const ss = String(d.getSeconds()).padStart(2, '0');

                    return `${mm}/${dd}/${yy} ${hh}:${min}:${ss}`;
                })()
                : 'N/A'
            }</td>
            <td>${sale.product || 'N/A'}</td>
            <td>₱${parseFloat(sale.base_price || 0).toFixed(2)}</td>
            <td>${sale.quantity || 0}</td>
            <td>₱${parseFloat(sale.total_pd || 0).toFixed(2)}</td>
            <td>
                <div style="display: inline-flex; gap: 4px; align-items: center;">
                    <button onclick="deleteSaleRecord('${sale.order_id}')" title="Delete Sale Record" 
                            style="margin: 0; background: #ef4444; color: white; border: 1px solid #dc2626; border-radius: 4px; padding: 6px 10px; font-size: 1rem; cursor: pointer; line-height: 1.2;">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Render the dynamic Pagination Button Controls layout area
    if (paginationControls) {
        if (totalItemsCount <= itemsPerPageLimit) {
            // Hide pagination controls entirely if all records fit comfortably on one page
            paginationControls.innerHTML = "";
            paginationControls.style.borderTop = "none";
        } else {
            paginationControls.style.borderTop = "1px dashed #e5e7eb";
            paginationControls.innerHTML = `
                <button onclick="changeSalesPage(${currentSalesPage - 1})" ${currentSalesPage === 1 ? 'disabled' : ''} 
                        style="padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; opacity: ${currentSalesPage === 1 ? 0.4 : 1};">
                    ◀ Prev
                </button>
                <span style="font-weight: 500; color: #374151;">
                    Page <strong>${currentSalesPage}</strong> of <strong>${totalPagesCount}</strong> 
                    <span style="color: #9ca3af; font-weight: normal; margin-left: 4px;">(${totalItemsCount} matching sales)</span>
                </span>
                <button onclick="changeSalesPage(${currentSalesPage + 1})" ${currentSalesPage === totalPagesCount ? 'disabled' : ''} 
                        style="padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; opacity: ${currentSalesPage === totalPagesCount ? 0.4 : 1};">
                    Next ▶
                </button>
            `;
        }
    }
}

// 3. Companion function to switch pages inside the sales ledger
function changeSalesPage(targetPage) {
    const filteredSalesList = getFilteredSalesList();
    const totalPagesCount = Math.ceil(filteredSalesList.length / itemsPerPageLimit) || 1;
    
    if (targetPage < 1 || targetPage > totalPagesCount) return;
    
    currentSalesPage = targetPage;
    renderSalesTable();
}

// Tracks row layout active edits
let activeEditItemId = null;

function renderPricingTable() {
    const tbody = document.getElementById("pricing-table-body");
    const paginationControls = document.getElementById("table-pagination-controls");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Calculate structural pagination slicing bounds metrics
    const totalItemsCount = appData.length;
    const totalPagesCount = Math.ceil(totalItemsCount / itemsPerPageLimit) || 1;
    
    // Ensure active page pointer doesn't fall out-of-bounds after deleting records
    if (currentMatrixPage > totalPagesCount) {
        currentMatrixPage = totalPagesCount;
    }

    const startIndex = (currentMatrixPage - 1) * itemsPerPageLimit;
    const endIndex = startIndex + itemsPerPageLimit;
    const paginatedItemsList = appData.slice(startIndex, endIndex);

    // 1. Loop and display sliced dataset records matching the current page
    paginatedItemsList.forEach(item => {
        const tr = document.createElement("tr");
        const isEditing = (String(item.id) === String(activeEditItemId));

        if (isEditing) {
            tr.style.backgroundColor = "rgba(245, 158, 11, 0.05)";
            tr.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td><input type="text" id="edit-type-${item.id}" value="${item.print_type || ''}" class="form-control" style="padding: 4px; margin: 0;"></td>
                <td><input type="text" id="edit-color-${item.id}" value="${item.color_category || ''}" class="form-control" style="padding: 4px; margin: 0;"></td>
                <td><input type="text" id="edit-desc-${item.id}" value="${item.description || ''}" class="form-control" style="padding: 4px; margin: 0;"></td>
                <td><input type="text" id="edit-size-${item.id}" value="${item.paper_size || ''}" class="form-control" style="padding: 4px; margin: 0;"></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span>₱</span>
                        <input type="number" step="0.01" min="0" id="edit-price-${item.id}" value="${parseFloat(item.price).toFixed(2)}" class="form-control" style="width: 80px; padding: 4px; margin: 0;">
                    </div>
                </td>
                <td>
                    <div style="display: inline-flex; gap: 4px; align-items: center;">
                        <button onclick="saveInlineRowChanges('${item.id}')" title="Save Changes" 
                                style="margin: 0; background: #10b981; color: white; border: 1px solid #059669; border-radius: 4px; padding: 6px 10px; font-size: 1rem; cursor: pointer; line-height: 1.2;">
                            💾
                        </button>
                        <button onclick="cancelRowEditing()" title="Cancel" 
                                style="margin: 0; background: #6b7280; color: white; border: 1px solid #4b5563; border-radius: 4px; padding: 6px 10px; font-size: 1rem; cursor: pointer; line-height: 1.2;">
                            ❌
                        </button>
                    </div>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.print_type}</td>
                <td>${item.color_category}</td>
                <td>${item.description || ''}</td>
                <td>${item.paper_size}</td>
                <td>₱${parseFloat(item.price).toFixed(2)}</td>
                <td>
                    <div style="display: inline-flex; gap: 4px; align-items: center;">
                        <button onclick="enterRowEditMode('${item.id}')" class="btn btn-update" title="Edit Item" 
                                style="margin: 0; padding: 6px 10px; font-size: 1rem; background: #f59e0b; color: white; border-color: #d97706; cursor: pointer; line-height: 1.2;">
                            ✏️
                        </button>
                        <button onclick="deleteMatrixItemRow('${item.id}', '${item.print_type}')" title="Delete Item" 
                                style="margin: 0; background: #ef4444; color: white; border: 1px solid #dc2626; border-radius: 4px; padding: 6px 10px; font-size: 1rem; cursor: pointer; line-height: 1.2;">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
        }
        tbody.appendChild(tr);
    });

    // 2. Append the entry creation box row directly beneath the current paginated records list
    const formTr = document.createElement("tr");
    formTr.style.backgroundColor = "rgba(37, 99, 235, 0.06)";
    
    formTr.innerHTML = `
        <td><input type="text" id="new-item-id" placeholder="ID" class="form-control" style="padding: 4px; margin: 0; min-width: 60px;"></td>
        <td><input type="text" id="new-print-type" placeholder="Print Type" class="form-control" style="padding: 4px; margin: 0;"></td>
        <td><input type="text" id="new-color-cat" placeholder="Color Specs" class="form-control" style="padding: 4px; margin: 0;"></td>
        <td><input type="text" id="new-description" placeholder="Description/Material" class="form-control" style="padding: 4px; margin: 0;"></td>
        <td><input type="text" id="new-paper-size" placeholder="Size Specs" class="form-control" style="padding: 4px; margin: 0;"></td>
        <td>
            <div style="display: flex; align-items: center; gap: 4px;">
                <span>₱</span>
                <input type="number" step="0.01" min="0" id="new-base-price" placeholder="0.00" class="form-control" style="padding: 4px; margin: 0; width: 80px;">
            </div>
        </td>
        <td>
            <button onclick="submitInlineNewItem()" class="btn btn-submit" title="Save New Stock Item" style="margin: 0; background: #10b981; padding: 6px 12px; font-size: 1.1rem;">
                💾
            </button>
        </td>
    `;
    tbody.appendChild(formTr);

    // 3. Render the dynamic Pagination Button Controls layout area
    if (paginationControls) {
        if (totalItemsCount <= itemsPerPageLimit) {
            // Hide pagination controls entirely if all records fit comfortably on one page
            paginationControls.innerHTML = "";
            paginationControls.style.borderTop = "none";
        } else {
            paginationControls.style.borderTop = "1px dashed #e5e7eb";
            paginationControls.innerHTML = `
                <button onclick="changeMatrixPage(${currentMatrixPage - 1})" ${currentMatrixPage === 1 ? 'disabled' : ''} 
                        style="padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; opacity: ${currentMatrixPage === 1 ? 0.4 : 1};">
                    ◀ Prev
                </button>
                <span style="font-weight: 500; color: #374151;">Page <strong>${currentMatrixPage}</strong> of <strong>${totalPagesCount}</strong> <span style="color: #9ca3af; font-weight: normal; margin-left: 4px;">(${totalItemsCount} total items)</span></span>
                <button onclick="changeMatrixPage(${currentMatrixPage + 1})" ${currentMatrixPage === totalPagesCount ? 'disabled' : ''} 
                        style="padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; opacity: ${currentMatrixPage === totalPagesCount ? 0.4 : 1};">
                    Next ▶
                </button>
            `;
        }
    }
}

// Handler function to safely update page indicators
function changeMatrixPage(targetPageNumber) {
    currentMatrixPage = targetPageNumber;
    cancelRowEditing(); // Cleanly exit active row edit inputs state parameters on step navigation shifts
}

// NEW: Submits modified values for an existing row upstream to Google Sheets
async function saveInlineRowChanges(id) {
    const typeVal = document.getElementById(`edit-type-${id}`).value.trim();
    const colorVal = document.getElementById(`edit-color-${id}`).value.trim();
    const descVal = document.getElementById(`edit-desc-${id}`).value.trim();
    const sizeVal = document.getElementById(`edit-size-${id}`).value.trim();
    const priceVal = parseFloat(document.getElementById(`edit-price-${id}`).value) || 0;

    if (!typeVal || !colorVal || !sizeVal) {
        alert("Validation Error: Product details cannot be left blank.");
        return;
    }

    updateStatus("busy", "Updating matrix row properties...");

    const payload = {
        action: "updateFullItem",
        id: id,
        print_type: typeVal,
        color_category: colorVal,
        description: descVal,
        paper_size: sizeVal,
        price: priceVal
    };

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        // Handle mock data simulation
        const idx = appData.findIndex(item => String(item.id) === String(id));
        if (idx !== -1) appData[idx] = payload;
        activeEditItemId = null;
        renderPOSDropdown();
        renderPricingTable();
        updateStatus("ready", "Simulation Connected");
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });
        
        activeEditItemId = null; // Reset editing state
        await fetchDatabaseRows(); // Re-fetch fully refreshed data
    } catch (error) {
        console.error("Full item update network exception: ", error);
        updateStatus("error", "Network sync broken");
        alert("Failed communicating target row configuration adjustments upstream.");
    }
}

// Global placeholder to store row data while the modal is open
let pendingDeleteItemId = null;
let pendingDeleteSaleOrderId = null;

// UPDATED: Opens the themed verification modal window instead of using browser confirm()
function deleteMatrixItemRow(id, label) {
    pendingDeleteItemId = id; // Store target context references

    const modal = document.getElementById("confirm-delete-modal");
    const messageEl = document.getElementById("delete-modal-message");
    const yesBtn = document.getElementById("confirm-delete-yes-btn");
    
    if (!modal || !yesBtn) return;

    if (messageEl) {
        messageEl.innerText = `Are you absolutely sure you want to permanently remove [ID: ${id}] "${label}" from your live spreadsheet database?`;
    }

    // Set up the confirmation button's click behavior dynamically for this specific item
    yesBtn.onclick = function() {
        executeDeleteRowAction(id);
    };

    // Reveal modal frame element layer
    modal.classList.remove("hidden");

    // Automatically focus the dangerous action button ("Yes, Delete") for quick keyboard workflow
    setTimeout(() => {
        yesBtn.focus();
    }, 50);
}

// NEW: Opens the themed verification modal window for sales records
function deleteSaleRecord(orderId) {
    pendingDeleteSaleOrderId = orderId;

    const modal = document.getElementById("confirm-delete-modal");
    const messageEl = document.getElementById("delete-modal-message");
    const yesBtn = document.getElementById("confirm-delete-yes-btn");

    if (!modal || !yesBtn) return;

    if (messageEl) {
        messageEl.innerText = `Are you sure you want to permanently delete sale record ${orderId} from the sales ledger?`;
    }

    yesBtn.onclick = function() {
        executeDeleteSaleRecord(orderId);
    };

    modal.classList.remove("hidden");

    setTimeout(() => {
        yesBtn.focus();
    }, 50);
}

// NEW: Processes the actual network erasure execution sequence for sales records
async function executeDeleteSaleRecord(orderId) {
    closeDeleteModal();
    updateStatus("busy", "Removing sales record from ledger...");

    const payload = {
        action: "deleteSale",
        orderId: orderId
    };

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER" || API_URL.includes("MOCK_CONTEXT")) {
        salesData = salesData.filter(sale => String(sale.order_id) !== String(orderId));
        renderSalesTable();
        updateStatus("ready", "Simulation Connected");
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });

        await fetchSalesRecords();
    } catch (error) {
        console.error("Delete sale record exception trace: ", error);
        updateStatus("error", "Sales delete failed");
        alert("Failed communicating target sales record deletion upstream.");
    }
}

// NEW: Processes the actual network erasure execution sequence
async function executeDeleteRowAction(id) {
    closeDeleteModal();
    updateStatus("busy", "Removing matrix row from database...");

    const payload = {
        action: "deleteItem",
        id: id
    };

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        appData = appData.filter(item => String(item.id) !== String(id));
        renderPOSDropdown();
        renderPricingTable();
        updateStatus("ready", "Simulation Connected");
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });
        
        await fetchDatabaseRows(); // Refresh dataset arrays instantly
    } catch (error) {
        console.error("Delete operation exception network trace: ", error);
        updateStatus("error", "Handshake broken");
        alert("Failed communicating target data erasure context adjustments upstream.");
    }
}

// NEW: Closes the custom delete confirmation modal safely
function closeDeleteModal() {
    const modal = document.getElementById("confirm-delete-modal");
    if (modal) modal.classList.add("hidden");
    pendingDeleteItemId = null;
    pendingDeleteSaleOrderId = null;
}

// Sets the target row ID to editing mode and re-renders
function enterRowEditMode(id) {
    activeEditItemId = id;
    renderPricingTable();
}

// Cancels out of editing state cleanly
function cancelRowEditing() {
    activeEditItemId = null;
    renderPricingTable();
}

// UPDATED: Submits data pulled directly out from the spreadsheet bottom inline row parameters
async function submitInlineNewItem() {
    const idInput = document.getElementById("new-item-id");
    const typeInput = document.getElementById("new-print-type");
    const colorInput = document.getElementById("new-color-cat");
    const sizeInput = document.getElementById("new-paper-size");
    const descInput = document.getElementById("new-description");
    const priceInput = document.getElementById("new-base-price");

    const id = idInput.value.trim();
    const price = parseFloat(priceInput.value) || 0;

    // Direct validation checks
    if (!id || !typeInput.value.trim() || !colorInput.value.trim() || !sizeInput.value.trim() || !priceInput.value) {
        alert("Validation Error: Please fill in all item properties completely before saving.");
        return;
    }

    const checkDuplicate = appData.find(item => String(item.id) === String(id));
    if (checkDuplicate) {
        alert(`Configuration Error: An item with ID [ ${id} ] already exists.`);
        return;
    }

    updateStatus("busy", "Adding item inline directly to sheet...");

    const payload = {
        action: "addItem",
        id: id,
        print_type: typeInput.value.trim(),
        color_category: colorInput.value.trim(),
        paper_size: sizeInput.value.trim(),
        description: descInput.value.trim() || "No alternative description notes configured.",
        price: price
    };

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        appData.push(payload);
        renderPOSDropdown();
        renderPricingTable();
        updateStatus("ready", "Simulation Connected");
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(payload)
        });
        
        // Refresh local memory and table components entirely
        await fetchDatabaseRows();
    } catch (error) {
        console.error("Inline save exception trace: ", error);
        updateStatus("error", "Handshake execution broken");
        alert("Failed communicating target configuration adjustments upstream.");
    }
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
        const response = await fetch(`${API_URL}?action=pricelist`);
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

async function fetchSalesRecords() {
    // Fallback production simulation data if no real App Script URL is bound
    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        salesData = [
            { sale_ts: "2026-07-01 09:15:22", order_id: "P2P-984321", product: "Document Print (Black & White - A4 Short)", base_price: 2.00, quantity: 50, total_pd: 100.00 },
            { sale_ts: "2026-07-01 11:42:10", order_id: "P2P-984322", product: "Sticker Sheet (Full CMYK Color - A4 Size)", base_price: 45.00, quantity: 10, total_pd: 450.00 },
            { sale_ts: "2026-07-02 14:05:05", order_id: "P2P-984323", product: "Photo Print (High Gloss Color - 4R Size)", base_price: 15.00, quantity: 4, total_pd: 60.00 }
        ];
        renderSalesTable();
        updateStatus("ready", "Simulation Sales Logs Connected");
        return;
    }

    try {
        const response = await fetch(`${API_URL}?action=sales`);
        
        // 1. Log the exact raw status text from the server
        // console.log("HTTP Response Status:", response.status, response.statusText);
        
        const jsonResult = await response.json();
        
        // 2. DIAGNOSTIC: See what the Google Apps Script actually wrapped your array inside
        // console.log("CRITICAL DIAGNOSTIC - Raw JSON result received:", jsonResult);

        // 3. FIXED OBJECT UNWRAPPING ROUTINE:
        if (Array.isArray(jsonResult)) {
            salesData = jsonResult;
        } else if (jsonResult && Array.isArray(jsonResult.data)) {
            salesData = jsonResult.data;
        } else if (jsonResult && Array.isArray(jsonResult.records)) {
            salesData = jsonResult.records;
        } else if (jsonResult && typeof jsonResult === 'object') {
            // If the script sent an object where one of the keys holds your rows, 
            // find the first key that contains an array and extract it.
            const foundKey = Object.keys(jsonResult).find(key => Array.isArray(jsonResult[key]));
            if (foundKey) {
                salesData = jsonResult[foundKey];
                // console.log(`Extracted array automatically from property key: "${foundKey}"`);
            } else {
                salesData = [];
                // console.error("An object was received, but no array property could be found inside it.");
            }
        } else {
            salesData = [];
        }
        
        renderSalesTable();
        updateStatus("ready", "Connected");
    } catch (err) {
        console.error("Retrieval Sales Log Error Context: ", err);
        updateStatus("error", "Sales ledger retrieval failure");
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

// NEW: Opens display limit popup setting focus metrics safely
function openSettingsModal() {
    const modal = document.getElementById("settings-config-modal");
    const inputField = document.getElementById("settings-per-page-input");
    if (!modal || !inputField) return;

    inputField.value = itemsPerPageLimit;
    modal.classList.remove("hidden");

    setTimeout(() => {
        inputField.focus();
        inputField.select();
    }, 50);
}

// NEW: Closes the layout setting modal configuration view safely
function closeSettingsModal() {
    const modal = document.getElementById("settings-config-modal");
    if (modal) modal.classList.add("hidden");
}

// NEW: Saves pagination variables resetting tracking index pointers securely
function saveSettingsModalConfiguration() {
    const inputField = document.getElementById("settings-per-page-input");
    if (!inputField) return;

    const parsedLimit = parseInt(inputField.value, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        alert("Configuration Input Error: Please supply a valid row threshold number count of 1 or greater.");
        return;
    }

    itemsPerPageLimit = parsedLimit;
    currentMatrixPage = 1; // Always snap back to page 1 safely to protect slicing indices boundary rules
    
    closeSettingsModal();
    renderPricingTable(); // Instantly trigger the table rendering system
}

// NEW: Triggers a full manual pull request syncing POS dropdown choices & Pricing matrices
async function manualDatabaseRefresh() {
    const refreshBtn = document.getElementById("manual-refresh-btn");
    
    // Visual feedback: spin the refresh icon while processing
    if (refreshBtn) {
        refreshBtn.style.transform = "rotate(360deg)";
        refreshBtn.style.transition = "transform 0.6s ease";
    }

    updateStatus("busy", "Synchronizing spreadsheet entries...");
    
    // Reset any open row edit properties to prevent formatting conflicts
    if (typeof activeEditItemId !== 'undefined') {
        activeEditItemId = null;
    }

    if (API_URL === "APP_SCRIPT_URL_PLACEHOLDER") {
        // Mock Simulation mode behavior
        setTimeout(() => {
            if (refreshBtn) refreshBtn.style.transform = "rotate(0deg)";
            renderPOSDropdown();
            renderPricingTable();
            updateStatus("ready", "Simulation Connected");
        }, 500);
        return;
    }

    try {
        // Re-execute your global database pull routines
        // This function fetches your spreadsheet data and calls renderPricingTable() + renderPOSDropdown()
        await fetchDatabaseRows(); 
        await fetchSalesRecords();
        
    } catch (error) {
        console.error("Manual sync handshake broken: ", error);
        updateStatus("error", "Network sync broken");
    } finally {
        // Reset animation layout strings safely
        setTimeout(() => {
            if (refreshBtn) {
                refreshBtn.style.transition = "none";
                refreshBtn.style.transform = "rotate(0deg)";
            }
        }, 600);
    }
}

// NEW: Instantly logs out the operator, purges session storage tokens, and brings up the cover lock modal frame
function manualLockTerminal() {
    // 1. Invalidate system authorization token flags instantly
    sessionStorage.removeItem("p2p_pos_authorized");

    // 2. Safely verify if the overlay structure already exists to avoid redundant markup insertions
    if (document.getElementById("master-lock-screen")) return;

    // 3. Reconstruct and inject the secure gatekeeper modal frame directly to the viewport layer
    const lockScreenModal = document.createElement("div");
    lockScreenModal.id = "master-lock-screen";
    lockScreenModal.className = "modal-overlay";
    lockScreenModal.style.cssText = "z-index: 99999; background: #111827; display: flex; align-items: center; justify-content: center; position: fixed; inset: 0;";
    
    lockScreenModal.innerHTML = `
        <div class="card card-small" style="max-width: 340px; width: 100%; text-align: center; border-top: 4px solid #2563eb; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🔐</div>
            <h2 class="card-title" style="margin-bottom: 4px;">P2P Graphics POS</h2>
            <p style="font-size: 0.813rem; color: #9ca3af; margin-bottom: 20px;">Authorized Access Personnel Only</p>
            
            <div class="form-group" style="margin-bottom: 16px; text-align: left;">
                <label class="form-label" style="color: #d1d5db;">Enter System Master Passcode</label>
                <input type="password" id="master-passcode-input" placeholder="••••••••" class="form-control" 
                       style="text-align: center; font-size: 1.25rem; letter-spacing: 4px; padding: 10px; background: #1f2937; color: white; border-color: #374151;"
                       onkeydown="if(event.key === 'Enter') checkMasterPasscode()">
            </div>
            
            <button onclick="checkMasterPasscode()" class="btn btn-submit" style="width: 100%; margin: 0; background: #2563eb; padding: 10px;">
                Unlock System
            </button>
            <p id="lock-screen-error" style="color: #ef4444; font-size: 0.75rem; margin-top: 10px; min-height: 16px; font-weight: 500;"></p>
        </div>
    `;

    document.body.appendChild(lockScreenModal);

    // 4. Force focus straight into input string arrays for direct keyboard inputs
    setTimeout(() => {
        const passwordField = document.getElementById("master-passcode-input");
        if (passwordField) passwordField.focus();
    }, 50);
}

// Toggles input masking type on mouse click-and-hold configurations (Minimal Text Style)
function togglePasswordVisibility(shouldShowPlaintext) {
    const passwordField = document.getElementById("master-passcode-input");
    const peekBtn = document.getElementById("peek-password-btn");
    if (!passwordField) return;

    if (shouldShowPlaintext) {
        passwordField.type = "text";
        passwordField.style.letterSpacing = "normal"; // Clears dot-spacing constraints for readable text
        if (peekBtn) {
            peekBtn.innerText = "SHOW";
            peekBtn.style.color = "#3b82f6"; // Dynamic highlight color while holding down
        }
    } else {
        passwordField.type = "password";
        passwordField.style.letterSpacing = "4px";    // Restores structural dot separation
        if (peekBtn) {
            peekBtn.innerText = "PEEK";
            peekBtn.style.color = "#6b7280"; // Returns to baseline neutral gray
        }
    }
}

// NEW: Toggles input masking type on mouse click-and-hold for the admin matrix console entrance prompt
function toggleModalPasswordVisibility(shouldShowPlaintext) {
    const passwordField = document.getElementById("modal-password-input");
    const peekBtn = document.getElementById("peek-modal-password-btn");
    if (!passwordField) return;

    if (shouldShowPlaintext) {
        passwordField.type = "text";
        passwordField.style.letterSpacing = "normal"; // Clears letter spacing so plaintext is completely readable
        if (peekBtn) {
            peekBtn.innerText = "SHOW";
            peekBtn.style.color = "#3b82f6";          // Subtle blue highlight while holding down
        }
    } else {
        passwordField.type = "password";
        passwordField.style.letterSpacing = "0.125em"; // Restores your initial structural letter spacing rules
        if (peekBtn) {
            peekBtn.innerText = "PEEK";
            peekBtn.style.color = "#6b7280";          // Returns to neutral fallback gray color
        }
    }
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
    fetchSalesRecords();
});