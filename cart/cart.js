// --------------------------------------------------
// Initialize Supabase
// --------------------------------------------------
const db = supabase.createClient(
  "https://dnmtwlnqeesubepyipsx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXR3bG5xZWVzdWJlcHlpcHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjc5MDAsImV4cCI6MjA3NzkwMzkwMH0.EluGCx_iZxFOv0PGF949vVD6BHeL6Tkh_LuiI9lFv8o"
);

const cartContainer = document.getElementById("cart-container");
const totalAmountBox = document.getElementById("totalAmount");
const checkoutBtn = document.getElementById("checkoutBtn");

// --------------------------------------------------
// Show Empty Cart UI
// --------------------------------------------------
function showEmptyCart() {
  cartContainer.innerHTML = `<h4>Your cart is empty.</h4>`;
  totalAmountBox.textContent = "0";
  checkoutBtn.disabled = true;
}

// --------------------------------------------------
// Helper: Get Logged-In User
// --------------------------------------------------
function getLoggedInUser() {
  const u = localStorage.getItem("loggedInUser");
  return u ? JSON.parse(u) : null;
}

// --------------------------------------------------
// DB: Get or Create Cart
// --------------------------------------------------
async function getOrCreateCart(userId) {
  const { data: existing } = await db
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await db
    .from("carts")
    .insert({ user_id: userId })
    .select()
    .single();

  return created.id;
}

// --------------------------------------------------
// Merge Guest Cart → DB Cart
// --------------------------------------------------
async function mergeLocalCartToDB(userId) {
  let localCart = JSON.parse(localStorage.getItem("cart")) || [];
  if (localCart.length === 0) return;

  const cartId = await getOrCreateCart(userId);

  for (let item of localCart) {
    const { data: existing } = await db
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", item.id)
      .maybeSingle();

    if (existing) {
      await db
        .from("cart_items")
        .update({ quantity: existing.quantity + item.qty })
        .eq("id", existing.id);
    } else {
      await db.from("cart_items").insert({
        cart_id: cartId,
        product_id: item.id,
        quantity: item.qty
      });
    }
  }

  localStorage.removeItem("cart");
}

// --------------------------------------------------
// Load Cart
// --------------------------------------------------
async function loadCart() {
  const user = getLoggedInUser();

  if (!user) {
    await renderLocalCart();
  } else {
    await mergeLocalCartToDB(user.id);
    await renderDBCart(user.id);
  }

  attachRemoveListeners();
}

// --------------------------------------------------
// Render Guest Cart
// --------------------------------------------------
async function renderLocalCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) return showEmptyCart();

  cartContainer.innerHTML = "";
  let total = 0;

  for (let item of cart) {
    const { data: product } = await db
      .from("items")
      .select("*")
      .eq("id", item.id)
      .single();

    if (!product || !product.id) continue;

    const itemTotal = product.price * item.qty;
    total += itemTotal;

    cartContainer.innerHTML += cartItemHTML(product, item.qty, itemTotal, false, null);
  }

  totalAmountBox.textContent = total;
}

// --------------------------------------------------
// Render DB Cart
// --------------------------------------------------
async function renderDBCart(userId) {
  const cartId = await getOrCreateCart(userId);

  const { data: items, error } = await db
    .from("cart_items")
    .select(`
      id,
      quantity,
      product_id,
      items(id, name, price, quantity, image_url)
    `)
    .eq("cart_id", cartId);

  if (error) {
    console.error("Supabase fetch error:", error);
    return showEmptyCart();
  }

  if (!items || items.length === 0) return showEmptyCart();

  cartContainer.innerHTML = "";
  let total = 0;

  items.forEach(row => {
    const p = row.items;
    if (!p || !p.id) return;

    const qty = row.quantity;
    const itemTotal = p.price * qty;

    const cartItemId = row.id; // UUID string

    console.log("DB CART PRODUCT:", p, "cartItemId:", cartItemId);

    cartContainer.innerHTML += cartItemHTML(p, qty, itemTotal, true, cartItemId);
    total += itemTotal;
  });

  totalAmountBox.textContent = total;
}

// --------------------------------------------------
// Cart Item HTML
// --------------------------------------------------
function cartItemHTML(product, qty, itemTotal, isDB, cartItemId = null) {
  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-3">
        <div class="row">
          <div class="col-3">
            <img src="${product.image_url}" class="img-fluid rounded">
          </div>
          <div class="col-6">
            <h5>${product.name}</h5>
            <p class="text-muted">${product.quantity}</p>
            <strong>₹${product.price} × ${qty} = ₹${itemTotal}</strong>
          </div>
          <div class="col-3 text-end">
            <button class="btn btn-danger btn-sm remove-btn"
                    data-product-id="${product.id}"
                    data-cart-item-id="${cartItemId !== null ? cartItemId : ''}"
                    data-is-db="${isDB}">
              – Remove 1
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

// --------------------------------------------------
// Attach Remove Button Event Listeners
// --------------------------------------------------
function attachRemoveListeners() {
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const productId = Number(btn.dataset.productId);
      const cartItemId = btn.dataset.cartItemId || null; // Keep UUID string
      const isDB = btn.dataset.isDb === 'true';
      console.log("Remove clicked:", { productId, isDB, cartItemId });
      await removeItem(productId, isDB, cartItemId);
    });
  });
}

// --------------------------------------------------
// Remove Item Logic
// --------------------------------------------------
async function removeItem(productId, isDB, cartItemId) {
  const user = getLoggedInUser();

  // ------------------ Guest cart ------------------
  if (!user) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let item = cart.find(c => Number(c.id) === Number(productId));
    if (!item) return;

    item.qty = Number(item.qty) - 1;
    if (item.qty <= 0) cart = cart.filter(c => Number(c.id) !== Number(productId));

    localStorage.setItem("cart", JSON.stringify(cart));
    return loadCart();
  }

  // ------------------ DB cart ---------------------
  if (isDB) {
    if (!cartItemId) {
      console.warn("Cannot remove DB item: invalid cartItemId");
      return loadCart();
    }

    const { data: existing, error } = await db
      .from("cart_items")
      .select("id, quantity")
      .eq("id", cartItemId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return;
    }

    if (!existing) return loadCart();

    if (existing.quantity > 1) {
      await db.from("cart_items")
        .update({ quantity: existing.quantity - 1 })
        .eq("id", cartItemId);
    } else {
      await db.from("cart_items").delete().eq("id", cartItemId);
    }

    return loadCart();
  }
}

// --------------------------------------------------
checkoutBtn.addEventListener("click", () => {
  window.location.href = "../checkout/checkout.html";
});

// --------------------------------------------------
loadCart();
