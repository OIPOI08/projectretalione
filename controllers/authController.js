const supabase = require("../config/supabase");

const { sendOTP } = require("../services/emailService");

// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email dan password wajib diisi"
            });
        }

        // LOGIN KE SUPABASE AUTH
        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("LOGIN ERROR:", error);

            return res.status(401).json({
                success: false,
                message: "Email atau password salah",
                error: error.message
            });
        }

        if (!data.user || !data.session) {
            return res.status(401).json({
                success: false,
                message: "Login gagal"
            });
        }

        // TOKEN UNTUK DIGUNAKAN FE -> BE
        console.log("=================================");
        console.log("LOGIN BERHASIL");
        console.log("USER ID:", data.user.id);
        console.log("EMAIL:", data.user.email);
        console.log("ACCESS TOKEN:", data.session.access_token);
        console.log("=================================");

        return res.status(200).json({
            success: true,
            message: "Login berhasil",

            user: {
                id: data.user.id,
                email: data.user.email
            },

            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                expires_in: data.session.expires_in
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// =====================================================
// FORGOT PASSWORD - KIRIM OTP
// =====================================================

const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email wajib diisi"
            });
        }

        const {
            data: user,
            error: userError
        } = await supabase
            .from("users")
            .select("id, email, auth_id")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            console.error("CHECK USER ERROR:", userError);

            return res.status(500).json({
                success: false,
                message: "Gagal memeriksa user",
                error: userError.message
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email tidak ditemukan"
            });
        }

        if (!user.auth_id) {
            return res.status(400).json({
                success: false,
                message: "User belum terhubung dengan Supabase Auth"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        ).toISOString();

        console.log("=================================");
        console.log("FORGOT PASSWORD");
        console.log("EMAIL:", email);
        console.log("OTP:", otp);
        console.log("EXPIRES AT:", expiresAt);
        console.log("=================================");

        const {
            error: deleteError
        } = await supabase
            .from("password_resets")
            .delete()
            .eq("email", email);

        if (deleteError) {
            console.error("DELETE OTP ERROR:", deleteError);

            return res.status(500).json({
                success: false,
                message: "Gagal menghapus OTP lama",
                error: deleteError.message
            });
        }

        const {
            data: resetData,
            error: insertError
        } = await supabase
            .from("password_resets")
            .insert({
                user_id: user.id,
                email,
                otp,
                expires_at: expiresAt,
                verified: false
            })
            .select()
            .single();

        if (insertError) {
            console.error("INSERT OTP ERROR:", insertError);

            return res.status(500).json({
                success: false,
                message: "Gagal menyimpan OTP",
                error: insertError.message
            });
        }

        try {
            await sendOTP(email, otp);

            console.log(
                "OTP BERHASIL DIKIRIM KE:",
                email
            );

        } catch (emailError) {
            console.error(
                "SEND OTP EMAIL ERROR:",
                emailError
            );

            await supabase
                .from("password_resets")
                .delete()
                .eq("id", resetData.id);

            return res.status(500).json({
                success: false,
                message: "OTP gagal dikirim ke email",
                error: emailError.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP berhasil dikirim ke email"
        });

    } catch (error) {
        console.error(
            "FORGOT PASSWORD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Gagal mengirim OTP",
            error: error.message
        });
    }
};

// =====================================================
// VERIFY OTP
// =====================================================

const verifyOTP = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const otp = req.body.otp?.trim();

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email dan OTP wajib diisi"
            });
        }

        const {
            data: resetData,
            error
        } = await supabase
            .from("password_resets")
            .select("*")
            .eq("email", email)
            .eq("otp", otp)
            .eq("verified", false)
            .gt(
                "expires_at",
                new Date().toISOString()
            )
            .order("id", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error(
                "VERIFY OTP QUERY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Gagal memverifikasi OTP",
                error: error.message
            });
        }

        if (!resetData) {
            return res.status(400).json({
                success: false,
                message: "OTP salah atau sudah expired"
            });
        }

        const {
            data: updatedReset,
            error: updateError
        } = await supabase
            .from("password_resets")
            .update({
                verified: true
            })
            .eq("id", resetData.id)
            .select()
            .single();

        if (updateError) {
            console.error(
                "UPDATE OTP ERROR:",
                updateError
            );

            return res.status(500).json({
                success: false,
                message: "Gagal update status OTP",
                error: updateError.message
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP berhasil diverifikasi",
            reset_id: updatedReset.id
        });

    } catch (error) {
        console.error(
            "VERIFY OTP ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Gagal memverifikasi OTP",
            error: error.message
        });
    }
};

// =====================================================
// RESET PASSWORD
// =====================================================

const resetPassword = async (req, res) => {
    try {
        const {
            resetId,
            newPassword
        } = req.body;

        if (!resetId || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Reset ID dan password baru wajib diisi"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter"
            });
        }

        const {
            data: resetData,
            error: fetchError
        } = await supabase
            .from("password_resets")
            .select(`
                id,
                user_id,
                email,
                verified,
                expires_at,
                users (
                    id,
                    email,
                    auth_id
                )
            `)
            .eq("id", resetId)
            .eq("verified", true)
            .gt(
                "expires_at",
                new Date().toISOString()
            )
            .maybeSingle();

        if (fetchError) {
            console.error(
                "FETCH RESET DATA ERROR:",
                fetchError
            );

            return res.status(500).json({
                success: false,
                message: "Gagal memeriksa reset ID",
                error: fetchError.message
            });
        }

        if (!resetData) {
            return res.status(400).json({
                success: false,
                message: "Reset ID tidak valid atau sudah expired"
            });
        }

        if (
            !resetData.users ||
            !resetData.users.auth_id
        ) {
            console.error(
                "AUTH ID TIDAK DITEMUKAN:",
                resetData.users
            );

            return res.status(500).json({
                success: false,
                message: "User belum terhubung dengan Supabase Auth"
            });
        }

        const authUserId = resetData.users.auth_id;

        console.log("===============================");
        console.log("RESET PASSWORD");
        console.log(
            "Public User ID:",
            resetData.user_id
        );
        console.log(
            "Auth User ID:",
            authUserId
        );
        console.log(
            "Email:",
            resetData.email
        );
        console.log("===============================");

        const {
            error: updatePasswordError
        } = await supabase.auth.admin.updateUserById(
            authUserId,
            {
                password: newPassword
            }
        );

        if (updatePasswordError) {
            console.error(
                "UPDATE PASSWORD ERROR:",
                updatePasswordError
            );

            return res.status(500).json({
                success: false,
                message: "Gagal update password",
                error: updatePasswordError.message
            });
        }

        const {
            error: deleteError
        } = await supabase
            .from("password_resets")
            .delete()
            .eq("id", resetId);

        if (deleteError) {
            console.error(
                "DELETE USED OTP ERROR:",
                deleteError
            );
        }

        return res.status(200).json({
            success: true,
            message: "Password berhasil direset!"
        });

    } catch (error) {
        console.error(
            "RESET PASSWORD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Gagal mereset password",
            error: error.message
        });
    }
};

// =====================================================
// EXPORT CONTROLLER
// =====================================================

module.exports = {
    login,
    forgotPassword,
    verifyOTP,
    resetPassword
};