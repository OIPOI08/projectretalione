const supabase = require("../config/supabase");


console.log("=== POSTING CONTROLLER BARU TERLOAD ===");

const createPosting = async (req, res) => {
    try {
        const {
            judul,
            platform,
            status,
            tanggal_posting
        } = req.body;

        // =====================================================
        // VALIDASI
        // =====================================================

        if (!judul || !judul.trim()) {
            return res.status(400).json({
                success: false,
                message: "Judul wajib diisi"
            });
        }

        // =====================================================
        // AMBIL BEARER TOKEN
        // =====================================================

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization Bearer token wajib diisi"
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token tidak ditemukan"
            });
        }

        // =====================================================
        // CEK TOKEN SUPABASE AUTH
        // =====================================================

        const {
            data: authData,
            error: authError
        } = await supabase.auth.getUser(token);

        if (authError || !authData?.user) {
            console.error("AUTH ERROR:", authError);

            return res.status(401).json({
                success: false,
                message: "Token tidak valid atau sudah expired"
            });
        }

        const authUser = authData.user;

        console.log("=================================");
        console.log("CREATE POSTING");
        console.log("AUTH USER ID:", authUser.id);
        console.log("EMAIL:", authUser.email);
        console.log("=================================");

        // =====================================================
        // CARI USER DI public.users
        // auth.users.id -> users.auth_id
        // =====================================================

        const {
            data: publicUser,
            error: userError
        } = await supabase
            .from("users")
            .select("id, auth_id, email")
            .eq("auth_id", authUser.id)
            .maybeSingle();

        if (userError) {
            console.error("PUBLIC USER ERROR:", userError);

            return res.status(500).json({
                success: false,
                message: "Gagal mencari user",
                error: userError.message
            });
        }

        if (!publicUser) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan di tabel users",
                auth_user_id: authUser.id
            });
        }

        console.log("PUBLIC USER ID:", publicUser.id);

        // =====================================================
        // INSERT POSTING
        // =====================================================

        const {
            data: posting,
            error: postingError
        } = await supabase
            .from("posting")
            .insert({
                user_id: publicUser.id,
                judul: judul.trim(),
                platform: platform?.trim() || null,
                status: status?.trim() || "draft",
                tanggal_posting: tanggal_posting || null
            })
            .select()
            .single();

        if (postingError) {
            console.error("CREATE POSTING ERROR:", postingError);

            return res.status(500).json({
                success: false,
                message: "Gagal membuat posting",
                error: postingError.message,
                details: postingError.details,
                hint: postingError.hint,
                code: postingError.code
            });
        }

        // =====================================================
        // BERHASIL
        // =====================================================

        return res.status(201).json({
            success: true,
            message: "Posting berhasil dibuat",
            data: posting
        });

    } catch (error) {
        console.error("CREATE POSTING ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

module.exports = {
    createPosting
};