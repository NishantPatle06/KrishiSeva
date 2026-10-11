// Global Client State
let currentFarmer = null;
let currentSupplies = [];
let selectedKhasras = []; // Stores selected khasra numbers
let cart = []; // Cart array: [{ supplyId, name, category, quantity, subsidizedPrice, selectedDealer }]
let activeTab = 'fertilizers'; // Default supply tab
let currentLanguage = 'en'; // Bilingual toggle: 'en' or 'hi'

// Category Selection Actions
window.selectFarmerCategory = function(category) {
  if (category === 'regular') {
    document.querySelector('.categories-container').classList.add('hidden');
    document.getElementById('auth-panel-card').classList.remove('hidden');
  } else {
    const categoryNames = {
      sikmi: 'Tenant Farmer (Sikmi)',
      forest: 'Forest Lands (Patta)',
      disabled: 'Elderly / Disabled Farmer',
      deceased: 'Deceased Farmer Nominee'
    };
    alert(`📍 ${categoryNames[category]}:\n\nAccording to the Agricultural Department, physical verification for this category of farmers is conducted offline by the Sub-Divisional Officer (SDO). Allocation will be approved only post-verification.\n\nPlease select "Regular Farmer (Kisan)" to test the live online booking system demo.`);
  }
};

window.backToCategories = function() {
  gotoStep1Auth();
};

// Elements - Navigation / Headers
const wizardStepsHeader = document.getElementById('wizard-steps-header');
const stepProgressIndicator = document.getElementById('step-progress-indicator');
const stepNode1 = document.getElementById('step-node-1');
const stepNode2 = document.getElementById('step-node-2');
const stepNode3 = document.getElementById('step-node-3');

// Screen Containers
const loginSection = document.getElementById('login-section');
const landSelectionSection = document.getElementById('land-selection-section');
const suppliesSelectionSection = document.getElementById('supplies-selection-section');
const successReceiptSection = document.getElementById('success-receipt-section');

// Auth elements
const phoneInput = document.getElementById('phone-input');
const otpContainer = document.getElementById('otp-container');
const otpInput = document.getElementById('otp-input');
const otpHint = document.getElementById('otp-hint');
const btnLoginAction = document.getElementById('btn-login-action');

// Step 2 elements (Lands)
const landFarmerName = document.getElementById('land-farmer-name');
const landFarmerFather = document.getElementById('land-farmer-father');
const landFarmerAadhaar = document.getElementById('land-farmer-aadhaar');
const landTableBody = document.getElementById('land-table-body');
const selectedLandAcresEl = document.getElementById('selected-land-acres');
const btnProceedToSupplies = document.getElementById('btn-proceed-to-supplies');

// Step 3 elements (Supplies selector)
const tabBtnFertilizers = document.getElementById('tab-btn-fertilizers');
const tabBtnSeeds = document.getElementById('tab-btn-seeds');
const catalogGridEl = document.getElementById('catalog-grid');
const cartTableBody = document.getElementById('cart-table-body');
const cartTotalBar = document.getElementById('cart-total-bar');
const cartTotalPriceEl = document.getElementById('cart-total-price');
const cartQuotaWarningContainer = document.getElementById('cart-quota-warning-container');
const btnProceedPayment = document.getElementById('btn-proceed-payment');
const btnBackToLand = document.getElementById('btn-back-to-land');

// Elements - Payment Modal & Phased Views
const paymentModal = document.getElementById('payment-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalCartItemsList = document.getElementById('modal-cart-items-list');
const modalLands = document.getElementById('modal-lands');
const modalTotalPrice = document.getElementById('modal-total-price');

const paymentCardDetailsView = document.getElementById('payment-card-details-view');
const btnProceedCardDetails = document.getElementById('btn-proceed-card-details');

const paymentOtpVerificationView = document.getElementById('payment-otp-verification-view');
const btnCancelOtpView = document.getElementById('btn-cancel-otp-view');
const btnSubmitBankingPayment = document.getElementById('btn-submit-banking-payment');
const paymentOtpInput = document.getElementById('payment-otp-input');
const paymentBankOtpHint = document.getElementById('payment-bank-otp-hint');

const paymentStatusMessage = document.getElementById('payment-status-message');
const paymentStatusText = document.getElementById('payment-status-text');

// Elements - Receipt Screen
const receiptTokenId = document.getElementById('receipt-token-id');
const receiptFarmerName = document.getElementById('receipt-farmer-name');
const receiptFarmerFather = document.getElementById('receipt-farmer-father');
const receiptFarmerDob = document.getElementById('receipt-farmer-dob');
const receiptFarmerAadhaar = document.getElementById('receipt-farmer-aadhaar');
const receiptFarmerPhone = document.getElementById('receipt-farmer-phone');
const receiptFarmerAddress = document.getElementById('receipt-farmer-address');
const receiptDeliveryAddress = document.getElementById('receipt-delivery-address');
const receiptPincode = document.getElementById('receipt-pincode');
const receiptLands = document.getElementById('receipt-lands');
const receiptItemsBody = document.getElementById('receipt-items-body');
const btnBackToLandsReceipt = document.getElementById('btn-back-to-lands-receipt');
const btnPrintReceipt = document.getElementById('btn-print-receipt');
const receiptSmsPhone = document.getElementById('receipt-sms-phone');

// Elements - Feature 1 & 2 additions
const btnToggleLang = document.getElementById('btn-toggle-lang');
const paymentMethodSelect = document.getElementById('payment-method-select');
const paymentUpiView = document.getElementById('payment-upi-view');
const btnConfirmUpiPay = document.getElementById('btn-confirm-upi-pay');
const upiStatusMessage = document.getElementById('upi-status-message');
const upiStatusText = document.getElementById('upi-status-text');

let isOtpStage = false;
let quotaStatus = { seeds: { remaining: 0 }, fertilizers: { remaining: 0 } };
let simulatedBankOtp = null; // Generated banking transaction OTP

const API_BASE = '/api';

// --- STAGE SWITCHING FUNCTIONS ---
function gotoStep1Auth() {
  wizardStepsHeader.classList.add('hidden');
  loginSection.classList.remove('hidden');
  landSelectionSection.classList.add('hidden');
  suppliesSelectionSection.classList.add('hidden');
  successReceiptSection.classList.add('hidden');
  
  document.getElementById('auth-panel-card').classList.add('hidden');
  document.querySelector('.categories-container').classList.remove('hidden');
  otpContainer.classList.add('hidden');
  isOtpStage = false;
  btnLoginAction.textContent = currentLanguage === 'en' ? 'Request OTP' : 'ओटीपी अनुरोध करें';
}

function gotoStep2Lands() {
  wizardStepsHeader.classList.remove('hidden');
  stepProgressIndicator.style.width = '0%';
  stepNode1.className = 'step-node active';
  stepNode2.className = 'step-node';
  stepNode3.className = 'step-node';

  loginSection.classList.add('hidden');
  landSelectionSection.classList.remove('hidden');
  suppliesSelectionSection.classList.add('hidden');
  successReceiptSection.classList.add('hidden');

  renderLandTable();
}

function gotoStep3Supplies() {
  wizardStepsHeader.classList.remove('hidden');
  stepProgressIndicator.style.width = '50%';
  stepNode1.className = 'step-node completed';
  stepNode2.className = 'step-node active';
  stepNode3.className = 'step-node';

  loginSection.classList.add('hidden');
  landSelectionSection.classList.add('hidden');
  suppliesSelectionSection.classList.remove('hidden');
  successReceiptSection.classList.add('hidden');

  updateSuppliesUI();
  updateCartUI();
}

function gotoStep4Payment() {
  stepProgressIndicator.style.width = '100%';
  stepNode1.className = 'step-node completed';
  stepNode2.className = 'step-node completed';
  stepNode3.className = 'step-node active';
}

window.logoutFarmer = function() {
  currentFarmer = null;
  selectedKhasras = [];
  cart = [];
  gotoStep1Auth();
};

// --- FEATURE 1: BILINGUAL TOGGLE HANDLER ---
btnToggleLang.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
  translatePage();
});

function translatePage() {
  const elements = document.querySelectorAll('[data-en]');
  elements.forEach(el => {
    const text = currentLanguage === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-hi');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else {
      // Preserve child structures like spans or badge numbers if applicable
      const spanTag = el.querySelector('span');
      const smallTag = el.querySelector('small');
      const strongTag = el.querySelector('strong');
      if (!spanTag && !smallTag && !strongTag) {
        el.textContent = text;
      }
    }
  });

  // Dynamic values
  if (btnLoginAction) {
    if (!isOtpStage) {
      btnLoginAction.textContent = currentLanguage === 'en' ? 'Request OTP' : 'ओटीपी अनुरोध करें';
    } else {
      btnLoginAction.textContent = currentLanguage === 'en' ? 'Verify & Login' : 'ओटीपी सत्यापित एवं लॉगिन';
    }
  }

  // Refresh current step lists
  if (currentFarmer) {
    landFarmerFather.textContent = currentLanguage === 'en' ? `Father's Name: ${currentFarmer.fatherName}` : `पिता का नाम: ${currentFarmer.fatherName}`;
    landFarmerAadhaar.textContent = currentLanguage === 'en' ? `Aadhaar Number: ${currentFarmer.aadhaar}` : `आधार संख्या: ${currentFarmer.aadhaar}`;
    if (!landSelectionSection.classList.contains('hidden')) {
      renderLandTable();
    }
    if (!suppliesSelectionSection.classList.contains('hidden')) {
      updateSuppliesUI();
      updateCartUI();
    }
  }
}

// --- FEATURE 2: UPI PAYMENT TOGGLE AND QR FORM PINGS ---
paymentMethodSelect.addEventListener('change', () => {
  const method = paymentMethodSelect.value;
  if (method === 'upi') {
    paymentCardDetailsView.classList.add('hidden');
    paymentUpiView.classList.remove('hidden');
  } else {
    paymentCardDetailsView.classList.remove('hidden');
    paymentUpiView.classList.add('hidden');
  }
});

btnConfirmUpiPay.addEventListener('click', async () => {
  const deliveryAddressVal = document.getElementById('pay-delivery-address').value.trim();
  const pincodeVal = document.getElementById('pay-pincode').value.trim();

  if (!deliveryAddressVal || !pincodeVal) {
    return alert('Please enter delivery address and pincode values.');
  }

  upiStatusMessage.classList.remove('hidden');
  btnConfirmUpiPay.disabled = true;

  upiStatusText.textContent = currentLanguage === 'en' ? 'Detecting phone scan event...' : 'मोबाइल स्कैन इवेंट का पता लगाया जा रहा है...';
  await sleep(1000);

  upiStatusText.textContent = currentLanguage === 'en' ? 'Requesting dynamic DBT authorization...' : 'रासायनिक आवंटन स्वीकृति का सत्यापन किया जा रहा है...';
  await sleep(1000);

  upiStatusText.textContent = currentLanguage === 'en' ? 'Processing transaction response...' : 'वितरण खाता सत्यापित किया जा रहा है...';
  await sleep(600);

  try {
    const res = await fetch(`${API_BASE}/book/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId: currentFarmer._id,
        items: cart.map(i => ({ supplyId: i.supplyId, quantity: i.quantity, selectedDealer: i.selectedDealer })),
        selectedKhasras,
        pincode: pincodeVal,
        deliveryAddress: deliveryAddressVal
      })
    });
    const data = await res.json();
    
    if (data.success) {
      upiStatusText.innerHTML = `✅ <span style="color: #34d399">${currentLanguage === 'en' ? 'Payment Verified!' : 'भुगतान स्वीकृत!'}</span>`;
      await sleep(1000);
      paymentModal.classList.add('hidden');

      // Clear UPI form variables
      upiStatusMessage.classList.add('hidden');
      btnConfirmUpiPay.disabled = false;

      renderSuccessReceipt(data.bookings, deliveryAddressVal, pincodeVal);
    } else {
      upiStatusText.innerHTML = `❌ <span style="color: #f87171">${currentLanguage === 'en' ? 'Failed: ' : 'त्रुटि: '}</span> ${data.error}`;
      await sleep(2500);
      paymentModal.classList.add('hidden');
      upiStatusMessage.classList.add('hidden');
      btnConfirmUpiPay.disabled = false;
      gotoStep3Supplies();
    }
  } catch (err) {
    upiStatusText.innerHTML = `❌ Network Error: ${err.message}`;
    await sleep(2000);
    paymentModal.classList.add('hidden');
    upiStatusMessage.classList.add('hidden');
    btnConfirmUpiPay.disabled = false;
    gotoStep3Supplies();
  }
});

// --- AUTH & LOGIN PROCESS ---
btnLoginAction.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  if (!phone) return alert('Please enter a registered mobile number.');

  if (!isOtpStage) {
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        isOtpStage = true;
        otpContainer.classList.remove('hidden');
        btnLoginAction.textContent = currentLanguage === 'en' ? 'Verify & Login' : 'ओटीपी सत्यापित एवं लॉगिन';
        otpHint.textContent = `🔑 Simulated OTP: ${data.mockOtp} (check server console logs)`;
        otpHint.style.color = '#34d399';
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Connection error: ' + e.message);
    }
  } else {
    const otp = otpInput.value.trim();
    if (!otp) return alert('Please enter the OTP.');

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (data.success) {
        currentFarmer = data.farmer;
        
        landFarmerName.textContent = currentFarmer.name;
        landFarmerFather.textContent = currentLanguage === 'en' ? `Father's Name: ${currentFarmer.fatherName}` : `पिता का नाम: ${currentFarmer.fatherName}`;
        landFarmerAadhaar.textContent = currentLanguage === 'en' ? `Aadhaar Number: ${currentFarmer.aadhaar}` : `आधार संख्या: ${currentFarmer.aadhaar}`;

        const suppliesRes = await fetch(`${API_BASE}/supplies`);
        const suppliesData = await suppliesRes.json();
        currentSupplies = suppliesData.supplies;

        gotoStep2Lands();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Verification failed: ' + e.message);
    }
  }
});

// --- STEP 2: LAND TABLE RENDERING & LOGIC ---
function renderLandTable() {
  landTableBody.innerHTML = '';
  selectedKhasras = [];

  if (currentFarmer.landParcels.length > 0) {
    selectedKhasras.push(currentFarmer.landParcels[0].khasraNo);
  }

  currentFarmer.landParcels.forEach(parcel => {
    const isChecked = selectedKhasras.includes(parcel.khasraNo);
    const row = `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" value="${parcel.khasraNo}" ${isChecked ? 'checked' : ''} onchange="toggleTableLand(this)">
        </td>
        <td><strong class="highlight-val">Khasra No. ${parcel.khasraNo}</strong></td>
        <td>${parcel.location}</td>
        <td style="text-align: right; font-weight: 600;">${parcel.sizeAcres} ${currentLanguage === 'en' ? 'Acres' : 'एकड़'}</td>
      </tr>
    `;
    landTableBody.insertAdjacentHTML('beforeend', row);
  });

  recalculateAcreage();
}

window.toggleTableLand = function(checkbox) {
  const khasra = checkbox.value;
  if (checkbox.checked) {
    if (!selectedKhasras.includes(khasra)) selectedKhasras.push(khasra);
  } else {
    selectedKhasras = selectedKhasras.filter(s => s !== khasra);
  }
  recalculateAcreage();
};

function recalculateAcreage() {
  let totalAcres = 0;
  currentFarmer.landParcels.forEach(p => {
    if (selectedKhasras.includes(p.khasraNo)) {
      totalAcres += p.sizeAcres;
    }
  });
  selectedLandAcresEl.textContent = totalAcres.toFixed(1);
}

btnProceedToSupplies.addEventListener('click', async () => {
  if (selectedKhasras.length === 0) {
    return alert('Please select at least one land Khasra record to allocate quotas.');
  }
  
  await updateQuotas();
  gotoStep3Supplies();
});

// --- STEP 3: SUPPLY SELECTOR & TAB INTERACTION ---
window.switchCategoryTab = function(category) {
  activeTab = category;
  tabBtnFertilizers.classList.toggle('active', category === 'fertilizers');
  tabBtnSeeds.classList.toggle('active', category === 'seeds');
  updateSuppliesUI();
};

btnBackToLand.addEventListener('click', () => {
  gotoStep2Lands();
});

function updateSuppliesUI() {
  catalogGridEl.innerHTML = '';
  
  const filteredSupplies = currentSupplies.filter(s => s.category === activeTab);

  filteredSupplies.forEach(item => {
    const isLowStock = item.stock <= 100;
    const cardHtml = `
      <div class="catalog-item">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="pricing-info">
            <span class="price-market">₹${item.marketPrice}</span>
            <span class="price-subsidized">₹${item.subsidizedPrice} <small>${currentLanguage === 'en' ? 'Subsidized' : 'रियायती'}</small></span>
          </div>
          <div class="stock-info">
            ${currentLanguage === 'en' ? 'Available: ' : 'उपलब्ध स्टॉक: '} <span class="stock-count ${isLowStock ? 'stock-low' : ''}">${item.stock} KG</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <input type="number" id="qty-${item._id}" min="10" step="10" value="10" style="width: 60px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color:#fff; border-radius: 4px; padding: 4px; text-align: center;">
          <button class="btn btn-primary btn-sm" onclick="addToCart('${item._id}')" style="flex-grow: 1;">${currentLanguage === 'en' ? 'Add to List' : 'सूची में जोड़ें'}</button>
        </div>
      </div>
    `;
    catalogGridEl.insertAdjacentHTML('beforeend', cardHtml);
  });
}

async function updateQuotas() {
  if (selectedKhasras.length === 0) {
    quotaStatus = { seeds: { remaining: 0 }, fertilizers: { remaining: 0 } };
    return;
  }

  try {
    const seedsRes = await fetch(`${API_BASE}/farmer/${currentFarmer._id}/quota-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedKhasras, category: 'seeds' })
    });
    const seedsData = await seedsRes.json();
    if (seedsData.success) {
      const q = seedsData.quota;
      setQuotaUI('seeds', q.used, q.maxAllowed);
      quotaStatus.seeds = q;
    }

    const ureaRes = await fetch(`${API_BASE}/farmer/${currentFarmer._id}/quota-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedKhasras, category: 'fertilizers' })
    });
    const ureaData = await ureaRes.json();
    if (ureaData.success) {
      const q = ureaData.quota;
      setQuotaUI('urea', q.used, q.maxAllowed);
      quotaStatus.fertilizers = q;
    }
  } catch (e) {
    console.error('Quota fetch error:', e);
  }
}

function setQuotaUI(type, used, max) {
  const progressEl = type === 'seeds' ? document.getElementById('seeds-progress') : document.getElementById('urea-progress');
  const statusEl = type === 'seeds' ? document.getElementById('seeds-quota-text') : document.getElementById('urea-quota-text');

  const pct = max === 0 ? 0 : (used / max) * 100;
  progressEl.style.width = `${pct}%`;
  statusEl.textContent = `${used} / ${max} KG Used`;
}

// --- CART TABLE HANDLING LOGIC ---
window.addToCart = function(supplyId) {
  if (selectedKhasras.length === 0) {
    return alert('Please select at least one land Khasra record.');
  }

  const supply = currentSupplies.find(s => s._id === supplyId);
  const qtyInput = document.getElementById(`qty-${supplyId}`);
  const quantity = parseInt(qtyInput.value) || 10;

  const existingItem = cart.find(i => i.supplyId === supplyId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      supplyId,
      name: supply.name,
      category: supply.category,
      quantity,
      subsidizedPrice: supply.subsidizedPrice,
      selectedDealer: 'PACS Rampur (Cooperative Society - Govt)' // Default regional dealer
    });
  }

  updateCartUI();
};

window.removeFromCart = function(supplyId) {
  cart = cart.filter(i => i.supplyId !== supplyId);
  updateCartUI();
};

window.updateCartQty = function(supplyId, newQty) {
  const item = cart.find(i => i.supplyId === supplyId);
  if (item) {
    item.quantity = parseInt(newQty) || 10;
  }
  updateCartUI();
};

window.updateCartDealer = function(supplyId, newDealer) {
  const item = cart.find(i => i.supplyId === supplyId);
  if (item) {
    item.selectedDealer = newDealer;
  }
  updateCartUI();
};

// --- FEATURE 4: DEALER STOCK ALLOCATIONS ---
function getDealerStock(supplyDoc, dealerName) {
  const globalStock = supplyDoc.stock;
  if (dealerName.includes('PACS Rampur')) {
    return Math.floor(globalStock * 0.40);
  } else if (dealerName.includes('Huzur Tehsil')) {
    return Math.floor(globalStock * 0.30);
  } else {
    // Private shops: Sharma Krishi, Patel Agro, Bhopal Depot get 10% each
    return Math.floor(globalStock * 0.10);
  }
}

function updateCartUI() {
  cartTableBody.innerHTML = '';
  
  if (cart.length === 0) {
    cartTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="placeholder-text" style="text-align: center; padding: 30px 10px;">
          ${currentLanguage === 'en' ? 'No items added to the list yet. Use the catalog above.' : 'सूची खाली है। कृपया ऊपर दिए गए कैटलॉग से सामग्री जोड़ें।'}
        </td>
      </tr>
    `;
    cartTotalBar.classList.add('hidden');
    // Reset progress bars back to baseline booked amounts when cart is cleared
    if (quotaStatus.seeds) {
      setQuotaUI('seeds', quotaStatus.seeds.used, quotaStatus.seeds.maxAllowed);
    }
    if (quotaStatus.fertilizers) {
      setQuotaUI('urea', quotaStatus.fertilizers.used, quotaStatus.fertilizers.maxAllowed);
    }
    return;
  }

  let totalCost = 0;
  let seedsSum = 0;
  let fertSum = 0;
  let dealerStockLimitExceeded = false; // Feature 4 block validation check
  let exceededMsg = '';

  cart.forEach((item, index) => {
    const supply = currentSupplies.find(s => s._id === item.supplyId);
    
    // Calculate dealer specific stock levels
    const dealerStock = getDealerStock(supply, item.selectedDealer);
    const exceedsDealerStock = item.quantity > dealerStock;
    if (exceedsDealerStock) {
      dealerStockLimitExceeded = true;
      exceededMsg = `Exceeds available dealer stock for ${item.name} (${dealerStock} KG left).`;
    }

    const isPrivate = item.selectedDealer && item.selectedDealer.includes('(Private Shop)');
    const itemPrice = isPrivate ? Math.round(item.subsidizedPrice * 1.30) : item.subsidizedPrice;
    totalCost += item.quantity * itemPrice;
    if (item.category === 'seeds') seedsSum += item.quantity;
    if (item.category === 'fertilizers') fertSum += item.quantity;

    const row = `
      <tr>
        <td style="text-align: center; font-weight: 600;">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>
          <select onchange="updateCartDealer('${item.supplyId}', this.value)" style="width: 100%;">
            <option value="PACS Rampur (Cooperative Society - Govt)" ${item.selectedDealer === 'PACS Rampur (Cooperative Society - Govt)' ? 'selected' : ''}>PACS Rampur (Cooperative Society - Govt)</option>
            <option value="Huzur Tehsil Cooperative Union (Govt)" ${item.selectedDealer === 'Huzur Tehsil Cooperative Union (Govt)' ? 'selected' : ''}>Huzur Tehsil Cooperative Union (Govt)</option>
            <option value="Sharma Krishi Kendra (Private Shop)" ${item.selectedDealer === 'Sharma Krishi Kendra (Private Shop)' ? 'selected' : ''}>Sharma Krishi Kendra (Private Shop)</option>
            <option value="Patel Agro Agencies (Private Shop)" ${item.selectedDealer === 'Patel Agro Agencies (Private Shop)' ? 'selected' : ''}>Patel Agro Agencies (Private Shop)</option>
            <option value="Bhopal Fertilizer Depot (Private Shop)" ${item.selectedDealer === 'Bhopal Fertilizer Depot (Private Shop)' ? 'selected' : ''}>Bhopal Fertilizer Depot (Private Shop)</option>
          </select>
          <span class="dealer-stock-sub ${exceedsDealerStock ? 'dealer-stock-low' : ''}">
            ${currentLanguage === 'en' ? 'Dealer Stock: ' : 'संस्था स्टॉक: '} <strong>${dealerStock} KG</strong> ${exceedsDealerStock ? '⚠️ Exceeded!' : 'left'}
          </span>
        </td>
        <td style="text-align: right; font-weight: 700;">₹${itemPrice}</td>
        <td style="text-align: center;">
          <input type="number" min="10" step="10" value="${item.quantity}" onchange="updateCartQty('${item.supplyId}', this.value)">
        </td>
        <td style="text-align: center;">
          <button onclick="removeFromCart('${item.supplyId}')">&times;</button>
        </td>
      </tr>
    `;
    cartTableBody.insertAdjacentHTML('beforeend', row);
  });

  // Dynamically update progress bar and status text on cart additions
  if (quotaStatus.seeds) {
    const seedsTotal = quotaStatus.seeds.used + seedsSum;
    setQuotaUI('seeds', seedsTotal, quotaStatus.seeds.maxAllowed);
  }
  if (quotaStatus.fertilizers) {
    const fertTotal = quotaStatus.fertilizers.used + fertSum;
    setQuotaUI('urea', fertTotal, quotaStatus.fertilizers.maxAllowed);
  }

  cartQuotaWarningContainer.innerHTML = '';
  const seedsExceeded = seedsSum > quotaStatus.seeds.remaining;
  const fertExceeded = fertSum > quotaStatus.fertilizers.remaining;

  if (seedsExceeded || fertExceeded || dealerStockLimitExceeded) {
    let warningText = '⚠️ Warning: Selected quantities exceed your remaining quota limit. Proceed to payment is disabled.';
    if (dealerStockLimitExceeded) {
      warningText = `⚠️ Warning: ${exceededMsg} Reduce quantity or choose a different dealer.`;
    }
    const warning = `
      <div class="quota-warning-banner" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 10px; font-size: 0.8rem; color: var(--danger-accent); font-weight: 600;">
        ${warningText}
      </div>
    `;
    cartQuotaWarningContainer.insertAdjacentHTML('beforeend', warning);
    
    btnProceedPayment.disabled = true;
    btnProceedPayment.style.opacity = '0.5';
    btnProceedPayment.style.cursor = 'not-allowed';
  } else {
    btnProceedPayment.disabled = false;
    btnProceedPayment.style.opacity = '1';
    btnProceedPayment.style.cursor = 'pointer';
  }

  cartTotalPriceEl.textContent = `₹${totalCost}`;
  cartTotalBar.classList.remove('hidden');
}

// --- MULTI-PHASE SECURE PAYMENT GATEWAY ---
btnProceedPayment.addEventListener('click', () => {
  if (cart.length === 0) return alert('Your booking list is empty.');

  gotoStep4Payment();

  // Populate Modal Summary
  modalCartItemsList.innerHTML = '';
  let totalCost = 0;
  cart.forEach(item => {
    const isPrivate = item.selectedDealer && item.selectedDealer.includes('(Private Shop)');
    const itemPrice = isPrivate ? Math.round(item.subsidizedPrice * 1.30) : item.subsidizedPrice;
    totalCost += item.quantity * itemPrice;
    const row = `
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px;">
        <span>${item.name} (${item.selectedDealer}) (x${item.quantity} KG)</span>
        <span>₹${item.quantity * itemPrice}</span>
      </div>
    `;
    modalCartItemsList.insertAdjacentHTML('beforeend', row);
  });

  modalLands.textContent = selectedKhasras.join(', ');
  modalTotalPrice.textContent = `₹${totalCost}`;

  // Default to Stage 1: Card Input View & reset select
  paymentMethodSelect.value = 'rupay';
  paymentCardDetailsView.classList.remove('hidden');
  paymentUpiView.classList.add('hidden');
  paymentOtpVerificationView.classList.add('hidden');
  paymentModal.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => {
  paymentModal.classList.add('hidden');
  gotoStep3Supplies();
});

// Proceed from Card form to Bank OTP form
btnProceedCardDetails.addEventListener('click', () => {
  const payName = document.getElementById('pay-name').value.trim();
  const payCard = document.getElementById('pay-card-number').value.trim();
  const payExpiry = document.getElementById('pay-expiry').value.trim();
  const payCvv = document.getElementById('pay-cvv').value.trim();
  const deliveryAddressVal = document.getElementById('pay-delivery-address').value.trim();
  const pincodeVal = document.getElementById('pay-pincode').value.trim();

  if (!payName || !payCard || !payExpiry || !payCvv || !deliveryAddressVal || !pincodeVal) {
    return alert('Please fill in card detail and delivery entries (Address and Pincode) to request OTP verification.');
  }

  // Generate simulated 6-digit transaction bank OTP
  simulatedBankOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Transition to Stage 2: OTP Entry screen
  paymentCardDetailsView.classList.add('hidden');
  paymentOtpVerificationView.classList.remove('hidden');
  paymentOtpInput.value = '';
  paymentStatusMessage.classList.add('hidden');
  
  paymentBankOtpHint.textContent = `🔑 Secure Bank Transaction OTP: ${simulatedBankOtp}`;
});

btnCancelOtpView.addEventListener('click', () => {
  paymentOtpVerificationView.classList.add('hidden');
  paymentCardDetailsView.classList.remove('hidden');
});

// Final Submit Bank OTP & Trigger DB Commit
btnSubmitBankingPayment.addEventListener('click', async () => {
  const enteredOtp = paymentOtpInput.value.trim();
  const deliveryAddressVal = document.getElementById('pay-delivery-address').value.trim();
  const pincodeVal = document.getElementById('pay-pincode').value.trim();

  if (!enteredOtp) return alert('Please enter the 6-digit banking OTP.');

  if (enteredOtp !== simulatedBankOtp) {
    return alert('Invalid Banking OTP. Please enter the correct code shown on-screen.');
  }

  // Hide button, show loading spinners
  paymentStatusMessage.classList.remove('hidden');
  
  paymentStatusText.textContent = 'Contacting issuing bank to acquire payment token...';
  await sleep(1000);

  paymentStatusText.textContent = 'Verifying Land record quotas & DBT Eligibility...';
  await sleep(800);

  paymentStatusText.textContent = 'Updating secure land inventory records...';
  
  try {
    const res = await fetch(`${API_BASE}/book/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerId: currentFarmer._id,
        items: cart.map(i => ({ supplyId: i.supplyId, quantity: i.quantity, selectedDealer: i.selectedDealer })),
        selectedKhasras,
        pincode: pincodeVal,
        deliveryAddress: deliveryAddressVal
      })
    });
    const data = await res.json();
    
    if (data.success) {
      paymentStatusText.innerHTML = `✅ <span style="color: #34d399">Payment Success!</span> Generating Invoice...`;
      await sleep(1000);
      paymentModal.classList.add('hidden');

      // RENDER DETAILED SUCCESS RECEIPT PAGE
      renderSuccessReceipt(data.bookings, deliveryAddressVal, pincodeVal);
    } else {
      paymentStatusText.innerHTML = `❌ <span style="color: #f87171">Booking Denied:</span> ${data.error}`;
      await sleep(2500);
      paymentModal.classList.add('hidden');
      gotoStep3Supplies();
    }
  } catch (err) {
    paymentStatusText.innerHTML = `❌ Network failure: ${err.message}`;
    await sleep(2000);
    paymentModal.classList.add('hidden');
    gotoStep3Supplies();
  }
});

// Render dynamic success invoice receipt page
function renderSuccessReceipt(bookings, address, pincode) {
  // Hide headers & sections
  wizardStepsHeader.classList.add('hidden');
  loginSection.classList.add('hidden');
  landSelectionSection.classList.add('hidden');
  suppliesSelectionSection.classList.add('hidden');
  successReceiptSection.classList.remove('hidden');

  // Set reference details
  receiptTokenId.textContent = `TRANSACTION ID: EV-REC-${bookings[0]._id.substring(12).toUpperCase()}`;
  receiptFarmerName.textContent = currentFarmer.name;
  receiptFarmerFather.textContent = currentLanguage === 'en' ? `Father: ${currentFarmer.fatherName}` : `पिता का नाम: ${currentFarmer.fatherName}`;
  receiptFarmerDob.textContent = `DOB: ${currentFarmer.dob || '15/08/1980'}`;
  receiptFarmerAadhaar.textContent = `Aadhaar: ${currentFarmer.aadhaar}`;
  receiptFarmerPhone.textContent = `Phone: ${currentFarmer.phone}`;
  receiptFarmerAddress.textContent = `Reg. Address: ${currentFarmer.address || 'Village Rampur, Bhopal, MP'}`;
  receiptDeliveryAddress.textContent = address;
  receiptPincode.textContent = `Pincode Area: ${pincode}`;
  receiptLands.textContent = `Allocated Khasras: ${selectedKhasras.join(', ')}`;
  receiptSmsPhone.textContent = currentFarmer.phone;

  // Populate Table Items
  receiptItemsBody.innerHTML = '';
  let subtotal = 0;

  bookings.forEach((booking, index) => {
    // Find the item details from local supplies list
    const supply = currentSupplies.find(s => s._id === booking.supplyId);
    const materialName = supply ? supply.name : 'Subsidized Material';
    subtotal += booking.totalPrice;

    const row = `
      <tr>
        <td style="text-align: center; font-weight: 600;">${index + 1}</td>
        <td><strong>${materialName}</strong></td>
        <td>${booking.selectedDealer}</td>
        <td style="text-align: right; font-weight: 700;">₹${Math.round(booking.totalPrice / booking.quantity)}</td>
        <td style="text-align: center;">${booking.quantity} KG</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary-accent);">₹${booking.totalPrice}</td>
      </tr>
    `;
    receiptItemsBody.insertAdjacentHTML('beforeend', row);
  });

  // Append Total Row at the bottom
  const totalRowHtml = `
    <tr style="border-top: 2px solid var(--border-color); background: rgba(16, 185, 129, 0.05);">
      <td colspan="4" style="text-align: right; font-weight: 700; font-size: 1.05rem;">${currentLanguage === 'en' ? 'Invoice Total:' : 'कुल देय राशि:'}</td>
      <td colspan="2" style="text-align: right; font-weight: 800; font-size: 1.25rem; color: var(--primary-accent);">₹${subtotal}</td>
    </tr>
  `;
  receiptItemsBody.insertAdjacentHTML('beforeend', totalRowHtml);

  // Apply translations to receipt if language is Hindi
  if (currentLanguage === 'hi') {
    translatePage();
  }
}

// Print Receipt Action
btnPrintReceipt.addEventListener('click', () => {
  window.print();
});

// Back to land button on success page
btnBackToLandsReceipt.addEventListener('click', async () => {
  cart = []; // clear cart
  window.logoutFarmer(); // logs out and goes back to Step 1 Auth Home Page
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Chatbot Elements
const chatbotBubble = document.getElementById('chatbot-bubble');
const chatbotWindow = document.getElementById('chatbot-window');
const btnCloseChatbot = document.getElementById('btn-close-chatbot');
const chatbotInput = document.getElementById('chatbot-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatbotMessages = document.getElementById('chatbot-messages');

chatbotBubble.addEventListener('click', () => {
  chatbotWindow.classList.toggle('hidden');
  chatbotInput.focus();
});

btnCloseChatbot.addEventListener('click', () => {
  chatbotWindow.classList.add('hidden');
});

btnSendChat.addEventListener('click', () => {
  handleChatSubmit();
});

chatbotInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleChatSubmit();
  }
});

function handleChatSubmit() {
  const text = chatbotInput.value.trim();
  if (!text) return;

  // Append User Message
  appendMessage(text, 'user');
  chatbotInput.value = '';

  // Simulate AI Thinking
  setTimeout(() => {
    const response = getBotResponse(text.toLowerCase());
    appendMessage(response, 'bot');
  }, 600);
}

function appendMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender} animate-msg`;
  msgDiv.innerHTML = `<p>${text}</p>`;
  chatbotMessages.appendChild(msgDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function getBotResponse(query) {
  const responsesEn = {
    quota: "Your booking limit is calculated dynamically based on selected khasra acreage: Seeds are allowed up to 50 KG/acre, and fertilizers are allowed up to 100 KG/acre.",
    urea: "Government Neem-Coated Urea is fully subsidized at ₹240 per 50 KG bag. SSP is available at ₹270, and NPK complex at ₹390.",
    seed: "Certified Seeds HD-2967 (Wheat) and IR-64 (Paddy) are available at subsidized rates of ₹300 and ₹350 per bag.",
    dealer: "You can buy from government cooperative societies (PACS Rampur, Huzur Union) at standard subsidized prices, or from private shops (Sharma Krishi Kendra, Patel Agro) with a 30% price markup.",
    payment: "We accept secure payments via local RuPay Debit Card details or UPI App Scan (PhonePe, GPay, BHIM QR codes).",
    token: "Once payment completes, your E-Token receipt is generated on-screen, and an SMS is sent to your registered mobile number for pick-up verification."
  };

  const responsesHi = {
    quota: "आपका बुकिंग कोटा चयनित खसरा रकबे के आधार पर तय किया जाता है: प्रति एकड़ अधिकतम 50 किलोग्राम बीज और 100 किलोग्राम उर्वरक (खाद) की अनुमति है।",
    urea: "सरकारी नीम-लेपित यूरिया ₹240 प्रति बैग पर सब्सिडी दर पर उपलब्ध है। SSP ₹270 में और NPK ₹390 में उपलब्ध है।",
    seed: "प्रमाणित बीज जैसे गेहूं (HD-2967) और धान (IR-64) क्रमशः ₹300 और ₹350 प्रति बैग की रियायती दर पर उपलब्ध हैं।",
    dealer: "आप सरकारी संस्थाओं (PACS रामपुर, हुजूर यूनियन) से रियायती दर पर या निजी दुकानों (शर्मा कृषि केंद्र, पटेल एग्रो) से 30% अधिक मूल्य पर खरीद सकते हैं।",
    payment: "हम रुपे डेबिट कार्ड या यूपीआई ऐप स्कैन (PhonePe, GPay, BHIM क्यूआर कोड) के माध्यम से भुगतान स्वीकार करते हैं।",
    token: "भुगतान पूर्ण होने के बाद, आपकी स्क्रीन पर ई-टोकन रसीद प्रदर्शित होगी, और आपके पंजीकृत मोबाइल नंबर पर पिक-अप के लिए एसएमएस भेजा जाएगा।"
  };

  const dict = currentLanguage === 'en' ? responsesEn : responsesHi;

  if (query.includes('quota') || query.includes('limit') || query.includes('कोटा') || query.includes('सीमा') || query.includes('रकबा')) {
    return dict.quota;
  }
  if (query.includes('urea') || query.includes('fertilizer') || query.includes('npk') || query.includes('ssp') || query.includes('यूरिया') || query.includes('उर्वरक') || query.includes('खाद') || query.includes('dap') || query.includes('डीएपी')) {
    return dict.urea;
  }
  if (query.includes('seed') || query.includes('wheat') || query.includes('paddy') || query.includes('बीज') || query.includes('गेहूं') || query.includes('धान') || query.includes('मक्का')) {
    return dict.seed;
  }
  if (query.includes('dealer') || query.includes('shop') || query.includes('pacs') || query.includes('वितरक') || query.includes('दुकान') || query.includes('सोसायटी')) {
    return dict.dealer;
  }
  if (query.includes('payment') || query.includes('pay') || query.includes('rupay') || query.includes('upi') || query.includes('card') || query.includes('भुगतान') || query.includes('कार्ड') || query.includes('पैसा')) {
    return dict.payment;
  }
  if (query.includes('token') || query.includes('receipt') || query.includes('sms') || query.includes('टोकन') || query.includes('रसीद') || query.includes('एसएमएस')) {
    return dict.token;
  }

  return currentLanguage === 'en'
    ? "I can assist you with dynamic quotas, dealer stock levels, product advice, or payments. Try asking: 'What is the seed limit?' or 'Which dealer has stock?'"
    : "मैं आपको आवंटन सीमा, वितरक स्टॉक, फसल सलाह या भुगतान विकल्पों में सहायता कर सकता हूँ। कृपया पूछें: 'बीज की सीमा क्या है?' या 'यूरिया की दर क्या है?'";
}

gotoStep1Auth();
