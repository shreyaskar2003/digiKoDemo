// server.js
console.log("✅ server.js is running...");

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Authkey + Supabase setup
const AUTHKEY_API_KEY = "a56f565971835b1c"; // ⚠️ Keep safe in production
const SENDER_ID = "29124"; // ✅ Active Authkey sender ID
const COMPANY_NAME = "digiKo"; // ✅ Appears in the SMS

// Supabase client (use service_role key for insert)
const supabase = createClient(
  "https://dnmtwlnqeesubepyipsx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXR3bG5xZWVzdWJlcHlpcHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMyNzkwMCwiZXhwIjoyMDc3OTAzOTAwfQ.x8o6d2AoY-j2jlEcl9cAwZ6HGmUhdVH_DXjbNKBUvhA"
);

// Temporary OTP store (for demo)
const otpStore = {};

// =====================================================
// 🚀 1️⃣ Send OTP — shared for signup & login
// =====================================================
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.json({ type: "error", message: "Phone number is required" });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[phone] = { otp, createdAt: Date.now() };

  try {
    const url = `https://api.authkey.io/request?authkey=${AUTHKEY_API_KEY}&mobile=${phone}&country_code=91&sid=${SENDER_ID}&company=${encodeURIComponent(
      COMPANY_NAME
    )}&otp=${otp}`;

    console.log("📤 Sending OTP to:", `+91${phone}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log("📩 Authkey Response:", data);

    if (
      data.Message?.toLowerCase().includes("submitted") ||
      data.success === true
    ) {
      res.json({ type: "success", message: "OTP sent successfully via SMS!" });
    } else {
      res.json({
        type: "error",
        message: data.Message || "Failed to send OTP via SMS.",
      });
    }
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.json({
      type: "error",
      message: "Server error while sending OTP.",
    });
  }
});

// =====================================================
// 🚀 2️⃣ Verify OTP (Signup)
// =====================================================
app.post("/verify-otp", async (req, res) => {
  const { name, phone, otp } = req.body;

  if (!phone || !otp || !name) {
    return res.json({
      type: "error",
      message: "Name, phone, and OTP are required",
    });
  }

  const entry = otpStore[phone];
  if (!entry) {
    return res.json({ type: "error", message: "OTP expired or not sent" });
  }

  const isExpired = Date.now() - entry.createdAt > 5 * 60 * 1000;
  if (isExpired) {
    delete otpStore[phone];
    return res.json({ type: "error", message: "OTP expired, please resend" });
  }

  if (entry.otp.toString() !== otp.toString()) {
    return res.json({ type: "error", message: "Invalid OTP, please try again" });
  }

  try {
    // 🧠 Prevent duplicate user registration
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("phone", "+91" + phone)
      .single();

    if (existingUser) {
      delete otpStore[phone];
      return res.json({
        type: "error",
        message: "User already exists. Please log in instead.",
      });
    }

    // ✅ Insert new user into Supabase
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, phone: "+91" + phone }])
      .select();

    if (error) {
      console.error("❌ Supabase Insert Error:", error);
      return res.json({
        type: "error",
        message: error.message || "Failed to save user in Supabase.",
      });
    }

    console.log("✅ Supabase Inserted:", data);
    delete otpStore[phone];
    res.json({ type: "success", message: "Signup successful!", user: data[0] });
  } catch (err) {
    console.error("❌ Supabase Error:", err);
    return res.json({ type: "error", message: "Database error." });
  }
});

// =====================================================
// 🚀 3️⃣ Check User (before login)
// =====================================================
app.post("/check-user", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.json({ type: "error", message: "Phone is required" });

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", "+91" + phone)
      .single();

    if (error || !data) {
      return res.json({
        type: "error",
        message: "User not found. Please sign up first.",
      });
    }

    res.json({ type: "success", message: "User exists", user: data });
  } catch (err) {
    res.json({ type: "error", message: "Error checking user." });
  }
});

// =====================================================
// 🚀 4️⃣ Verify OTP (Login)
// =====================================================
app.post("/verify-login-otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp)
    return res.json({ type: "error", message: "Phone and OTP required" });

  const entry = otpStore[phone];
  if (!entry)
    return res.json({ type: "error", message: "OTP expired or not sent" });

  const isExpired = Date.now() - entry.createdAt > 5 * 60 * 1000;
  if (isExpired) {
    delete otpStore[phone];
    return res.json({ type: "error", message: "OTP expired, please resend" });
  }

  if (entry.otp.toString() !== otp.toString()) {
    return res.json({ type: "error", message: "Invalid OTP, please try again" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id","name", "phone")
      .eq("phone", "+91" + phone)
      .single();

    if (error || !data) {
      return res.json({
        type: "error",
        message: "User not found. Please sign up first.",
      });
    }

    delete otpStore[phone];
    res.json({
      type: "success",
      message: "Login successful!",
      user: data,
    });
  } catch (err) {
    console.error("❌ Verify Login Error:", err);
    res.json({ type: "error", message: "Server error while verifying OTP." });
  }
});

// =====================================================
// 🚀 5️⃣ Start Server
// =====================================================
app.listen(3000, () =>
  console.log("🚀 Authkey + Supabase backend running on http://localhost:3000")
);
