alert("Working");

// ------------------------------------------------------
// 1. FIX SUPABASE CLIENT INITIALIZATION
// ------------------------------------------------------
const { createClient } = supabase;
const supabaseClient = createClient(
    "https://dnmtwlnqeesubepyipsx.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXR3bG5xZWVzdWJlcHlpcHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjc5MDAsImV4cCI6MjA3NzkwMzkwMH0.EluGCx_iZxFOv0PGF949vVD6BHeL6Tkh_LuiI9lFv8o"
);

// ------------------------------------------------------
// 2. SIGNUP + LOGIN BUTTONS
// ------------------------------------------------------
function signUp() {
    window.location.href = "./login and signup/signup.html";
}
function logIn() {
    window.location.href = "./login and signup/login.html";
}

document.querySelector("button.btn.btn-primary").addEventListener("click", signUp);
document.querySelector(".btn-light").addEventListener("click", logIn);

// ------------------------------------------------------
// 3. NAVBAR DROPDOWN
// ------------------------------------------------------
const productsLink = document.getElementById("productsNavLink");
const dropdown = document.getElementById("productsDropdown");

productsLink.addEventListener("click", function(e) {
    e.preventDefault();
    dropdown.classList.toggle("show");
});

document.addEventListener("click", function(e) {
    if (!e.target.closest(".products-nav-item")) {
        dropdown.classList.remove("show");
    }
});

dropdown.addEventListener("click", function(e) {
    e.stopPropagation();
});

// ------------------------------------------------------
// 4. FIXED SEARCH BAR CODE
// ------------------------------------------------------
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const query = searchInput.value.trim();
        if (!query) return;

        window.location.href = `/dropdown/search.html?q=${encodeURIComponent(query)}`;
    });
}

// ------------------------------------------------------
// 5. SUGGESTIONS DROPDOWN (FUNCTIONAL, YOU MUST ADD HTML BOX)
// ------------------------------------------------------
searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim();
    if (q.length < 2) return;

    const { data } = await supabaseClient
        .from("products")
        .select("name, category, id")
        .ilike("name", `%${q}%`)
        .limit(5);

    console.log("Suggestions:", data);
});
