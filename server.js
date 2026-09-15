require("dotenv").config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS ADA:", !!process.env.EMAIL_PASS);
console.log("EMAIL_PASS LENGTH:", process.env.EMAIL_PASS?.length);
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const postingRoutes = require("./routes/postingRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.use("/api", postingRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend Projectretalione berjalan!"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0',  () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});