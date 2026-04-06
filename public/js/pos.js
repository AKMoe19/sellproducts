var socket = io();
let cart = [];

// ၁။ ပစ္စည်းကို Cart ထဲသို့ ထည့်ခြင်း
function addToCart(id, name, price) {
    const stockEl = document.getElementById(`stock-${id}`);
    if (parseInt(stockEl.innerText) <= 0) return alert('Out of stock!');
    
    const item = cart.find(i => i.id === id);
    if (item) {
        // လက်ရှိ Stock ထက် ပိုမထည့်နိုင်အောင် စစ်ဆေးခြင်း
        if (item.qty >= parseInt(stockEl.innerText)) {
            return alert('Cannot add more than available stock!');
        }
        item.qty++;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    renderCart();
}

// ၂။ ပစ္စည်းကို Cart ထဲမှ ပြန်ဖြုတ်ခြင်း
function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
}

// ၃။ Cart UI ကို Update လုပ်ခြင်း
function renderCart() {
    const list = document.getElementById('cart-items');
    let total = 0;
    
    list.innerHTML = cart.map(item => {
        const sub = item.price * item.qty;
        total += sub;
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-start-0 border-end-0">
                <div>
                    <strong class="d-block text-truncate" style="max-width: 150px;">${item.name}</strong>
                    <small class="text-muted">${item.price.toLocaleString()} x ${item.qty}</small>
                </div>
                <div class="text-end">
                    <span class="me-2 fw-bold">${sub.toLocaleString()}</span>
                    <button class="btn btn-sm text-danger border-0" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>`;
    }).join('') || '<li class="text-center text-muted py-5"><i class="fas fa-shopping-basket fa-2x mb-2 d-block opacity-25"></i>Cart is empty</li>';
    
    document.getElementById('total-amount').innerText = total.toLocaleString() + ' MMK';
}

// ၄။ ငွေချေခြင်းနှင့် ပြေစာပြသခြင်း
// function checkout() {
//     if (!cart.length) return alert('Cart is empty!');
    
//     if (confirm('Confirm Sale & Print Receipt?')) {
//         // --- ပြေစာ Modal ထဲသို့ Data များ ထည့်သွင်းခြင်း ---
//         const receiptItems = document.getElementById('receipt-items');
//         const receiptDate = document.getElementById('receipt-date');
//         const receiptTotal = document.getElementById('receipt-total');
//         let total = 0;

//         // ရက်စွဲ ထည့်ခြင်း
//         receiptDate.innerText = new Date().toLocaleString();

//         // ပစ္စည်းစာရင်း ထည့်ခြင်း
//         receiptItems.innerHTML = cart.map(item => {
//             const sub = item.price * item.qty;
//             total += sub;
//             return `
//                 <div class="d-flex justify-content-between mb-1">
//                     <span>${item.name} x ${item.qty}</span>
//                     <span>${sub.toLocaleString()}</span>
//                 </div>`;
//         }).join('');
        
//         // Total Amount
//         receiptTotal.innerText = total.toLocaleString() + " MMK";

//         // ပြေစာ Modal ကို ဖွင့်ခြင်း (Bootstrap Modal)
//         const myModal = new bootstrap.Modal(document.getElementById('receiptModal'));
//         myModal.show();

//         // Server ဆီသို့ Socket မှတဆင့် အရောင်းစာရင်း ပို့ခြင်း
//         socket.emit('process-sale', cart);
        
//         // Cart ကို ရှင်းထုတ်ခြင်း
//         cart = [];
//         renderCart();
//     }
// }

// ၄။ ငွေချေခြင်းနှင့် ပြေစာပြသခြင်း
// function checkout() {
//     if (!cart.length) return alert('Cart is empty!');
    
//     if (confirm('Confirm Sale & Print Receipt?')) {
//         // --- ပြေစာ Modal ထဲသို့ Data များ ထည့်သွင်းခြင်း ---
//         const receiptItems = document.getElementById('receipt-items');
//         const receiptDate = document.getElementById('receipt-date');
//         const receiptTotal = document.getElementById('receipt-total');
//         let total = 0;

//         // ရက်စွဲ ထည့်ခြင်း
//         receiptDate.innerText = new Date().toLocaleString();

//         // ပစ္စည်းစာရင်း ထည့်ခြင်း
//         receiptItems.innerHTML = cart.map(item => {
//             const sub = item.price * item.qty;
//             total += sub;
//             return `
//                 <div class="d-flex justify-content-between mb-1">
//                     <span>${item.name} x ${item.qty}</span>
//                     <span>${sub.toLocaleString()}</span>
//                 </div>`;
//         }).join('');
        
//         // Total Amount
//         receiptTotal.innerText = total.toLocaleString() + " MMK";

//         // ပြေစာ Modal ကို ဖွင့်ခြင်း (Bootstrap Modal)
//         const myModal = new bootstrap.Modal(document.getElementById('receiptModal'));
//         myModal.show();

//         // --- ပြင်ဆင်လိုက်သောအပိုင်း: Server ဆီသို့ Data အစုံပို့ခြင်း ---
//         const seller = "<%= user.username %>"; // EJS မှ လက်ရှိ Login User ကိုယူသည်
        
//         socket.emit('process-sale', {
//             cart: cart,
//             discount: 0,
//             tax: 0,
//             sellerName: seller // ဒီမှာ sellerName ပါသွားပါပြီ
//         });
//         // --------------------------------------------------
        
//         // Cart ကို ရှင်းထုတ်ခြင်း
//         cart = [];
//         renderCart();
//     }
// }

// ၄။ ငွေချေခြင်းနှင့် ပြေစာပြသခြင်း (Updated Version)
function checkout() {
    if (!cart.length) return alert('Cart is empty!');
    
    if (confirm('Confirm Sale & Print Receipt?')) {
        // --- ပြေစာ Modal ထဲသို့ Data များ ထည့်သွင်းခြင်း ---
        const receiptItems = document.getElementById('receipt-items');
        const receiptDate = document.getElementById('receipt-date');
        const receiptTotal = document.getElementById('receipt-total');
        
        // (A) Payment Method ကို UI မှ ရယူခြင်း
        const selectedPayment = document.getElementById('paymentMethodSelect').value;
        const receiptPayment = document.getElementById('receipt-payment'); // Receipt Modal ထဲမှာ ပြချင်ရင်
        if(receiptPayment) receiptPayment.innerText = selectedPayment;

        let total = 0;

        // ရက်စွဲ ထည့်ခြင်း
        receiptDate.innerText = new Date().toLocaleString();

        // ပစ္စည်းစာရင်း ထည့်ခြင်း
        receiptItems.innerHTML = cart.map(item => {
            const sub = item.price * item.qty;
            total += sub;
            return `
                <div class="d-flex justify-content-between mb-1">
                    <span>${item.name} x ${item.qty}</span>
                    <span>${sub.toLocaleString()}</span>
                </div>`;
        }).join('');
        
        // Total Amount
        receiptTotal.innerText = total.toLocaleString() + " MMK";

        // ပြေစာ Modal ကို ဖွင့်ခြင်း (Bootstrap Modal)
        const myModal = new bootstrap.Modal(document.getElementById('receiptModal'));
        myModal.show();

        // (B) Server ဆီသို့ Data အစုံပို့ခြင်း (Payment Method ပါဝင်သည်)
        const seller = "<%= user.username %>"; 
        
        socket.emit('process-sale', {
            cart: cart,
            totalAmount: total, // စုစုပေါင်းငွေ
            paymentMethod: selectedPayment, // ရွေးချယ်လိုက်သော Payment (Cash, Kpay, etc.)
            sellerName: seller,
            discount: 0,
            tax: 0
        });
        
        // Cart ကို ရှင်းထုတ်ခြင်း
        cart = [];
        renderCart();
    }
}


// ၅။ ပြေစာကို Print ထုတ်ခြင်း
function printReceipt() {
    const printContent = document.getElementById('printableReceipt').innerHTML;
    const originalContent = document.body.innerHTML;

    // လက်ရှိ Window ထဲတွင် ပြေစာကိုသာ ထည့်ပြီး Print ထုတ်ခြင်း
    document.body.innerHTML = printContent;
    window.print();
    
    // Print ပြီးလျှင် မူလစာမျက်နှာသို့ ပြန်သွားရန် (Reload)
    location.reload();
}

// ၆။ Real-time Stock Update (အခြား Terminal များအတွက်)
socket.on('stock-updated', (updates) => {
    updates.forEach(u => {
        const el = document.getElementById(`stock-${u.id}`);
        if (el) {
            el.innerText = u.newStock;
            // Stock နည်းသွားလျှင် အရောင်ပြောင်းရန်
            if (u.newStock < 10) el.className = 'badge bg-danger';
        }
    });
});

// ၇။ ပစ္စည်းရှာဖွေခြင်း
function searchProduct() {
    let filter = document.getElementById('productSearch').value.toUpperCase();
    let rows = document.getElementById('productTable').getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        let text = rows[i].innerText.toUpperCase();
        rows[i].style.display = text.includes(filter) ? "" : "none";
    }
}