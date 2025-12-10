// ------------------------------------------------------
// 1. SUPABASE CLIENT
// ------------------------------------------------------
const supabaseClient = supabase.createClient(
    "https://dnmtwlnqeesubepyipsx.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXR3bG5xZWVzdWJlcHlpcHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjc5MDAsImV4cCI6MjA3NzkwMzkwMH0.EluGCx_iZxFOv0PGF949vVD6BHeL6Tkh_LuiI9lFv8o"
);


// ------------------------------------------------------
// 2. BUTTON ELEMENTS
// ------------------------------------------------------
const loginBtn = document.querySelector(".btn-light");   // Login button
const signupBtn = document.querySelector(".btn-primary"); // Sign-up button


// ------------------------------------------------------
// 3. LOGIN / SIGNUP REDIRECTS
// ------------------------------------------------------
function redirectToLogin() {
    window.location.href = "./login and signup/login.html";
}

function redirectToSignup() {
    window.location.href = "./login and signup/signup.html";
}


// ------------------------------------------------------
// 4. LOGOUT FUNCTIONALITY
// ------------------------------------------------------
function logoutUser() {
    localStorage.removeItem("loggedInUser");
    alert("Logged out successfully!");
    location.reload(); // refresh UI
}


// ------------------------------------------------------
// 5. TOGGLE LOGIN → LOGOUT BASED ON USER STATUS
// ------------------------------------------------------
function updateAuthButtons() {
    const savedUser = localStorage.getItem("loggedInUser");

    if (savedUser) {
        // USER IS LOGGED IN → Convert Login → Logout
        loginBtn.textContent = "Logout";
        loginBtn.onclick = logoutUser;

        // Hide signup button after login
        signupBtn.style.display = "none";

    } else {
        // USER NOT LOGGED IN → Normal behaviour
        loginBtn.textContent = "Login";
        loginBtn.onclick = redirectToLogin;

        signupBtn.style.display = "inline-block";
        signupBtn.onclick = redirectToSignup;
    }
}

updateAuthButtons();


// ------------------------------------------------------
// 6. PRODUCTS DROPDOWN
// ------------------------------------------------------
const productsLink = document.getElementById("productsNavLink");
const dropdown = document.getElementById("productsDropdown");

productsLink.addEventListener("click", function (e) {
    e.preventDefault();
    dropdown.classList.toggle("show");
});

document.addEventListener("click", function (e) {
    if (!e.target.closest(".products-nav-item")) {
        dropdown.classList.remove("show");
    }
});

dropdown.addEventListener("click", function (e) {
    e.stopPropagation();
});


// ------------------------------------------------------
// 7. SEARCH BAR + LIVE SUGGESTIONS
// ------------------------------------------------------
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchForm) {
    searchForm.addEventListener("submit", e => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        window.location.href = `./dropdown/search.html?q=${encodeURIComponent(query)}`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const suggestionsBox = document.getElementById("suggestionsBox");
    if (!searchInput || !suggestionsBox) return;

    searchInput.addEventListener("input", async function () {
        const text = searchInput.value.trim();

        if (text.length < 1) {
            suggestionsBox.style.display = "none";
            suggestionsBox.innerHTML = "";
            return;
        }

        const { data, error } = await supabaseClient
            .from("items")
            .select("name, type")
            .ilike("name", `%${text}%`)
            .limit(8);

        if (error || !data) return;

        suggestionsBox.innerHTML = "";

        if (data.length === 0) {
            suggestionsBox.innerHTML = `<div class="suggestion-item">No results found</div>`;
        } else {
            data.forEach(item => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = item.name;

                div.onclick = () => {
                    window.location.href =
                        `./dropdown/search.html?q=${encodeURIComponent(item.name)}`;
                };

                suggestionsBox.appendChild(div);
            });
        }

        suggestionsBox.style.display = "block";
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".suggestions-list") && e.target !== searchInput) {
            suggestionsBox.style.display = "none";
        }
    });
});


// ------------------------------------------------------
// 8. OPTIONAL: GREETING MESSAGE (if you enable)
// ------------------------------------------------------
function showGreeting() {
    const savedUser = localStorage.getItem("loggedInUser");
    if (!savedUser) return;

    const user = JSON.parse(savedUser);
    const name = user.name || "User";

    const hours = new Date().getHours();
    let msg = "Hello";

    if (hours < 12) msg = "Good Morning";
    else if (hours < 17) msg = "Good Afternoon";
    else msg = "Good Evening";

    const greetBox = document.getElementById("greetingBox");
    if (greetBox) greetBox.textContent = `${msg}, ${name}!`;
}

showGreeting();
