const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  }),
});


const db = admin.firestore();
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

/**
 * ✅ Signup - Add user
 */
app.post("/add-user", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existing = await db.collection("users").where("email", "==", email).get();
    if (!existing.empty) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const docRef = await db.collection("users").add({ name, email, password });
    res.status(201).json({ message: "User registered", id: docRef.id });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * ✅ Login - Check credentials
 */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const snapshot = await db.collection("users")
      .where("email", "==", email)
      .where("password", "==", password)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const userData = snapshot.docs[0].data();
    res.status(200).json({ message: "Login successful", user: userData });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * 📬 Contact Us - Save user message
 */
app.post("/contact-us", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const contactRef = await db.collection("contacts").add({ name, email, message });
    res.status(201).json({ message: "Message received", id: contactRef.id });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * 🚗 Book Car Wash
 */
app.post("/book-car-wash", async (req, res) => {
  const {
    title,
    duration,
    price,
    date,
    time,
    address1,
    address2,
    city,
    state,
    pinCode,
    fullName,
    email,
    contactNumber,
    status
  } = req.body;

  if (
    !title || !duration || !price || !date || !time ||
    !address1 || !city || !state || !pinCode ||
    !fullName || !email || !contactNumber
  ) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  try {
    const bookingData = {
      title,
      duration,
      price,
      date,
      time,
      address1,
      address2: address2 || "",
      city,
      state,
      pinCode,
      fullName,
      email,
      contactNumber,
      status: "pending", // ✅ default status
      createdAt: new Date()
    };

    const docRef = await db.collection("bookings").add(bookingData);
    res.status(201).json({ message: "Booking confirmed", bookingId: docRef.id });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Add this route to backend/index.js

// Backend route in Express (Node.js)
app.put("/bookings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const bookingRef = db.collection("bookings").doc(id);
    const doc = await bookingRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await bookingRef.update({ status });

    const updatedDoc = await bookingRef.get();
    res.json({ message: "Status updated", booking: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error("Update Error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});


/**
 * 📋 Get All Car Wash Bookings
 */
app.get("/bookings", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Fetching bookings for email:", email);

    let snapshot;

    if (email === "testadmin@gmail.com") {
      // Admin gets all bookings
      snapshot = await db
        .collection("bookings")
        .orderBy("createdAt", "desc")
        .get();
    } else {
      // Regular user gets their bookings only
      snapshot = await db
        .collection("bookings")
        .where("email", "==", email)
        .orderBy("createdAt", "desc")
        .get();
    }

    if (snapshot.empty) {
      return res
        .status(200)
        .json({ message: "No bookings found", bookings: [] });
    }

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

  
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

module.exports = app;

