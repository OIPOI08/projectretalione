const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
    login,
    forgotPassword,
    verifyOTP,
    resetPassword
} = require("../controllers/authController");

// Public routes (tanpa auth)
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Protected routes (pake authMiddleware)
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        // Dapatkan user dari req.user (hasil authMiddleware)
        const { data: userData, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", req.user.id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        return res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil data profile"
        });
    }
});

// Contoh route protected lain
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        const { data, error } = await supabase
            .from("users")
            .update({ name, phone })
            .eq("id", req.user.id)
            .select();

        if (error) {
            return res.status(400).json({
                success: false,
                message: "Gagal update profile"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile berhasil diupdate",
            data: data[0]
        });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal update profile"
        });
    }
});

module.exports = router;