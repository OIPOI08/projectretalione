const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { sendOTP } = require("../services/emailService");


// =========================
// REGISTER
// =========================
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({
                message: "Nama, email, dan password wajib diisi"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password minimal 6 karakter"
            });
        }

        // Cek email
        const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (existingUser) {
            return res.status(409).json({
                message: "Email sudah terdaftar"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: "user"
            })
            .select("id, name, email, role")
            .single();

        if (insertError) {
            throw insertError;
        }

        return res.status(201).json({
            message: "Registrasi berhasil",
            user: newUser
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan server"
        });
    }
};


// =========================
// LOGIN
// =========================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                message: "Email dan password wajib diisi"
            });
        }

        // Cari user
        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, password, role")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

        // Cek password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Email atau password salah"
            });
        }

        // JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            message: "Login berhasil",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan server"
        });
    }
};


// =========================
// FORGOT PASSWORD
// =========================
const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                message: "Email wajib diisi"
            });
        }

        // Cek user
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return res.status(404).json({
                message: "Email tidak ditemukan"
            });
        }

        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // OTP berlaku 5 menit
        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        ).toISOString();

        // Hapus OTP lama
        const { error: deleteError } = await supabase
            .from("password_resets")
            .delete()
            .eq("email", email);

        if (deleteError) {
            throw deleteError;
        }

        // Simpan OTP
        const { error: insertError } = await supabase
            .from("password_resets")
            .insert({
                email,
                otp,
                expires_at: expiresAt,
                verified: false
            });

        if (insertError) {
            throw insertError;
        }

        // Kirim OTP
        await sendOTP(email, otp);

        return res.status(200).json({
            message: "OTP berhasil dikirim ke email"
        });

    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);

        return res.status(500).json({
            message: "Gagal mengirim OTP"
        });
    }
};


// =========================
// VERIFY OTP
// =========================
const verifyOTP = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const otp = req.body.otp?.trim();

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email dan OTP wajib diisi"
            });
        }

        // Ambil OTP terbaru
        const { data: resetData, error } = await supabase
            .from("password_resets")
            .select("*")
            .eq("email", email)
            .eq("otp", otp)
            .eq("verified", false)
            .gt("expires_at", new Date().toISOString())
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!resetData) {
            return res.status(400).json({
                message: "OTP salah atau sudah expired"
            });
        }

        // Tandai verified
        const { error: updateError } = await supabase
            .from("password_resets")
            .update({
                verified: true
            })
            .eq("id", resetData.id);

        if (updateError) {
            throw updateError;
        }

        return res.status(200).json({
            message: "OTP berhasil diverifikasi"
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            message: "Gagal memverifikasi OTP"
        });
    }
};


// =========================
// RESET PASSWORD
// =========================
const resetPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const { newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email dan password baru wajib diisi"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password minimal 6 karakter"
            });
        }

        // Cek OTP sudah diverifikasi
        const { data: resetData, error: resetError } = await supabase
            .from("password_resets")
            .select("*")
            .eq("email", email)
            .eq("verified", true)
            .gt("expires_at", new Date().toISOString())
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (resetError) {
            throw resetError;
        }

        if (!resetData) {
            return res.status(400).json({
                message: "OTP belum diverifikasi atau sudah expired"
            });
        }

        // Hash password baru
        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );

        // Update password
        const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
                password: hashedPassword
            })
            .eq("email", email)
            .select("id, name, email, role")
            .maybeSingle();

        if (updateError) {
            throw updateError;
        }

        if (!updatedUser) {
            return res.status(404).json({
                message: "User tidak ditemukan"
            });
        }

        // Hapus OTP
        const { error: deleteError } = await supabase
            .from("password_resets")
            .delete()
            .eq("email", email);

        if (deleteError) {
            throw deleteError;
        }

        return res.status(200).json({
            message: "Password berhasil diubah"
        });

    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);

        return res.status(500).json({
            message: "Gagal mengubah password"
        });
    }
};


// =========================
// EXPORT
// =========================
module.exports = {
    register,
    login,
    forgotPassword,
    verifyOTP,
    resetPassword
};