// -------------------- SUPABASE SETUP --------------------
const supabaseUrl = "https://dnmtwlnqeesubepyipsx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXR3bG5xZWVzdWJlcHlpcHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjc5MDAsImV4cCI6MjA3NzkwMzkwMH0.EluGCx_iZxFOv0PGF949vVD6BHeL6Tkh_LuiI9lFv8o";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentCartItems = []; // Stores items for order + WhatsApp


// -------------------- ON PAGE LOAD --------------------
document.addEventListener("DOMContentLoaded", loadCheckout);

async function loadCheckout() {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) {
        alert("Please login to continue.");
        window.location.href = "login.html";
        return;
    }

    // Fetch user's cart
    const { data: cart, error: cartErr } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (cartErr || !cart) {
        console.warn("Cart not found for this user.");
        updateTotals(0);
        return;
    }

    const cartId = cart.id;

    // Fetch cart items + product info
    const { data: cartItems, error: itemsErr } = await supabase
        .from("cart_items")
        .select(`
            id,
            quantity,
            items:product_id (
                id,
                name,
                price,
                mrp,
                discount,
                image_url
            )
        `)
        .eq("cart_id", cartId);

    if (itemsErr) {
        console.error("Error fetching cart items:", itemsErr);
        return;
    }

    currentCartItems = cartItems;
    renderItems(cartItems);
}


// -------------------- RENDER CHECKOUT ITEMS --------------------
function renderItems(cartItems) {
    const container = document.querySelector(".order-summary");
    container.querySelectorAll(".summary-item").forEach(e => e.remove());

    let subtotal = 0;

    cartItems.forEach(ci => {
        const product = ci.items;
        const qty = ci.quantity;
        const totalPrice = product.price * qty;

        subtotal += totalPrice;

        const div = document.createElement("div");
        div.classList.add("summary-item");

        div.innerHTML = `
            <div class="d-flex gap-3 flex-grow-1">

                <div class="item-image">
                    <img src="${product.image_url}"
                         width="50" height="50"
                         style="border-radius:8px;">
                </div>

                <div class="flex-grow-1">
                    <div class="fw-semibold">${product.name}</div>
                    <div class="text-muted small">Qty: ${qty}</div>
                </div>

                <div class="fw-semibold text-primary">
                    ₹${totalPrice}
                </div>

            </div>
        `;

        container.insertBefore(div, container.querySelector(".mt-3"));
    });

    updateTotals(subtotal);

    // Update cart badge
    document.querySelector(".cart-badge").innerText =
        `🛍️ ${cartItems.length} items`;
}


// -------------------- UPDATE TOTAL PRICE --------------------
function updateTotals(subtotal) {
    document.querySelector(".price-row span:last-child").innerText = `₹${subtotal}`;
    document.querySelector(".total-amount").innerText = `₹${subtotal}`;
}


// -------------------- GENERATE UPI QR (DESKTOP) --------------------
function generateUpiQr() {
    const amount = document.querySelector(".total-amount").innerText.replace("₹", "");
    const upiId = "7007267032@ybl";
    const name = "digiKo";
    const note = "digiKo Order Payment";

    const upiString =
        `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&tn=${note}&cu=INR`;

    document.getElementById("upiQr").innerHTML = ""; // Clear previous QR

    new QRCode(document.getElementById("upiQr"), {
        text: upiString,
        width: 200,
        height: 200,
    });
}


// -------------------- PAYMENT SELECTION --------------------
function selectPayment(method, element) {
    document.querySelectorAll(".payment-method").forEach(el =>
        el.classList.remove("selected")
    );

    element.classList.add("selected");
    element.querySelector("input[type='radio']").checked = true;

    // CARD visibility
    document.getElementById("cardDetails").style.display =
        method === "card" ? "block" : "none";

    const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);

    if (method === "upi") {

        if (isMobile) {
            // Mobile → show deep link button
            document.getElementById("upiPayBtn").style.display = "block";
            document.getElementById("upiQrContainer").style.display = "none";
        } else {
            // Desktop → show QR
            document.getElementById("upiPayBtn").style.display = "none";
            document.getElementById("upiQrContainer").style.display = "block";
            generateUpiQr();
        }

        document.getElementById("confirmUpiPayment").style.display = "block";

    } else {
        // Hide UPI sections
        document.getElementById("upiPayBtn").style.display = "none";
        document.getElementById("upiQrContainer").style.display = "none";
        document.getElementById("confirmUpiPayment").style.display = "none";
    }
}


// -------------------- MOBILE UPI DEEP LINK --------------------
function startUpiPayment() {
    const amount = document.querySelector(".total-amount").innerText.replace("₹", "");

    const upiId = "7007267032@ybl";
    const name = "digiKo";
    const note = "digiKo Order Payment";

    const upiLink =
        `upi://pay?pa=${upiId}&pn=${name}&tn=${note}&am=${amount}&cu=INR`;

    window.location.href = upiLink;
}

document.getElementById("upiPayBtn").addEventListener("click", startUpiPayment);


// -------------------- CONFIRM UPI PAYMENT --------------------
document.getElementById("confirmUpiPayment").addEventListener("click", () => {
    completeOrder("UPI Payment");
});


// -------------------- PLACE ORDER HANDLER --------------------
document.getElementById("checkoutForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const method = document.querySelector("input[name='paymentMethod']:checked").value;

    if (method === "upi") {
        alert("Please complete payment using UPI or scan QR, then press 'I Have Completed Payment'");
        return;
    }

    completeOrder(method);
});


// -------------------- COMPLETE ORDER + SEND WHATSAPP --------------------
async function completeOrder(paymentMethod) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    const orderDetails = {
        user,
        items: currentCartItems,
        paymentMethod,
    };

    // Send to backend
    await fetch("http://localhost:3000/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderDetails)
    });

    alert("Order placed successfully! 🎉");
    window.location.href = "ordersuccess.html";
}
