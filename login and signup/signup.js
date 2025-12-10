// signup.js
console.log("Working");

const BACKEND_URL = "http://localhost:3000";

// DOM Elements
const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const termsCheckbox = document.getElementById("terms");
const signupBtn = document.getElementById("signupBtn");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const otpSection = document.getElementById("otpSection");
const otpInputs = document.querySelectorAll("#otpInputs input");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

// --- Helper: Allow only digits in phone input ---
phoneInput.addEventListener("input", (e) => {
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

// --- Helper functions for showing messages ---
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

// --- Step 1: Send OTP ---
signupForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  errorMessage.style.display = "none";
  successMessage.style.display = "none";

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const terms = termsCheckbox.checked;

  if (name.length < 3) {
    return showError("Name must be at least 3 characters long");
  }
  if (phone.length !== 10) {
    return showError("Please enter a valid 10-digit phone number");
  }
  if (!terms) {
    return showError("Please accept the terms and conditions");
  }

  signupBtn.disabled = true;
  signupBtn.textContent = "Sending OTP...";

  try {
    const response = await fetch(`${BACKEND_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();
    console.log("📩 OTP Sent:", data);

    if (data.type === "success") {
      showSuccess("OTP sent to your phone!");
      otpSection.style.display = "block";
      signupBtn.style.display = "none";
      otpInputs[0].focus();
    } else {
      showError(data.message || "Failed to send OTP. Try again.");
      signupBtn.disabled = false;
      signupBtn.textContent = "Send OTP";
    }
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    showError("Server error while sending OTP. Check if backend is running.");
    signupBtn.disabled = false;
    signupBtn.textContent = "Send OTP";
  }
});

// --- Step 2: Verify OTP ---
verifyOtpBtn.addEventListener("click", async () => {
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")
    .trim();

  if (otp.length !== 6) {
    return showError("Please enter the complete 6-digit OTP.");
  }

  const phone = phoneInput.value.trim();
  const name = nameInput.value.trim();

  verifyOtpBtn.disabled = true;
  verifyOtpBtn.textContent = "Verifying...";

  try {
    const response = await fetch(`${BACKEND_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, name }),
    });

    const data = await response.json();
    console.log("✅ OTP Verify Response:", data);

    if (data.type === "success") {
      showSuccess("🎉 Account created successfully!");
      verifyOtpBtn.textContent = "Verified ✅";
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1500);
    } else {
      showError(data.message || "Invalid OTP. Please try again.");
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.textContent = "Verify OTP";
    }
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    showError("Server error while verifying OTP. Check backend connection.");
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.textContent = "Verify OTP";
  }
});
