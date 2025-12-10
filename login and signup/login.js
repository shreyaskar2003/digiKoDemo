alert("Working");

const loginForm = document.getElementById("loginForm");
const phoneInput = document.getElementById("phone");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const rememberCheckbox = document.getElementById("remember");
const otpSection = document.getElementById("otpSection");
const otpInputs = document.querySelectorAll("#otpInputs input");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

const BACKEND_URL = "http://localhost:3000";

// --- Helper: Allow only digits in phone input ---
phoneInput.addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");
  e.target.value = value.slice(0, 10);
});

// --- Helper: OTP Input Navigation ---
otpInputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    if (e.target.value && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      otpInputs[index - 1].focus();
    }
  });
});

// --- Step 1: Send OTP ---
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  errorMessage.style.display = "none";
  successMessage.style.display = "none";

  const phone = phoneInput.value.trim();

  if (phone.length !== 10) {
    showError("Please enter a valid 10-digit phone number");
    return;
  }

  try {
    // Check if user exists in Supabase before sending OTP
    const response = await fetch(`${BACKEND_URL}/check-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const result = await response.json();
    if (result.type === "error") {
      showError(result.message);
      return;
    }

    // Send OTP
    const sendResponse = await fetch(`${BACKEND_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const sendData = await sendResponse.json();
    console.log("📩 OTP Sent:", sendData);

    if (sendData.type === "success") {
      showSuccess("OTP sent to your phone!");
      otpSection.style.display = "block";
      loginForm.querySelector("button").style.display = "none";
      otpInputs[0].focus();
    } else {
      showError(sendData.message || "Failed to send OTP.");
    }
  } catch (err) {
    console.error("❌ Login Send OTP Error:", err);
    showError("Server error while sending OTP.");
  }
});

// --- Step 2: Verify OTP ---
verifyOtpBtn.addEventListener("click", async () => {
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")
    .trim();

  if (otp.length !== 6) {
    showError("Please enter the full 6-digit OTP.");
    return;
  }

  const phone = phoneInput.value.trim();

  verifyOtpBtn.disabled = true;
  verifyOtpBtn.textContent = "Verifying...";

  try {
    const response = await fetch(`${BACKEND_URL}/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await response.json();
    console.log("✅ OTP Verify Response:", data);

    if (data.type === "success") {
      showSuccess("🎉 Login successful!");
      localStorage.setItem("loggedInUser", JSON.stringify(data.user)); // save user session

      setTimeout(() => {
        window.location.href = "../index.html"; // or wherever you want
      }, 1500);
    } else {
      showError(data.message || "Invalid OTP. Try again.");
    }
  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    showError("Server error while verifying OTP.");
  }

  verifyOtpBtn.disabled = false;
  verifyOtpBtn.textContent = "Verify OTP";
});

// --- Helper functions ---
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}
