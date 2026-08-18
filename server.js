require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Backend Projectretalione berjalan!"
    });
});

app.get("/test-db", async (req, res) => {
    try {
        const supabase = require("./config/supabase");

        const { data, error } = await supabase
            .from("users")
            .select("id, name, email, role")
            .limit(1);

        if (error) throw error;

        res.json({
            message: "Supabase berhasil terhubung!",
            data
        });
    } catch (error) {
        console.error("SUPABASE ERROR:", error);

        res.status(500).json({
            message: "Supabase gagal terhubung",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di port ${PORT}`);
});