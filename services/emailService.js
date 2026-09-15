const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error) => {
    if (error) {
        console.error("❌ GMAIL CONNECTION ERROR:");
        console.error(error);
    } else {
        console.log("✅ GMAIL SMTP SIAP DIGUNAKAN");
    }
});

const sendOTP = async (email, otp) => {
    try {
        console.log("📧 Mengirim OTP ke:", email);

        const info = await transporter.sendMail({
            from: `"Projectretalione" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "🔐 OTP Reset Password - Projectretalione",
            html: `
                <div style="font-family: Arial; max-width: 500px; margin: auto;">
                    <h2>🔐 Projectretalione</h2>
                    <p>Kode OTP reset password kamu:</p>

                    <h1 style="
                        text-align: center;
                        letter-spacing: 10px;
                        font-size: 42px;
                    ">
                        ${otp}
                    </h1>

                    <p>OTP berlaku selama 5 menit.</p>
                    <p>Jangan berikan kode ini kepada siapa pun.</p>
                </div>
            `
        });

        console.log("✅ EMAIL BERHASIL DIKIRIM");
        console.log("📧 PENERIMA:", email);
        console.log("🆔 MESSAGE ID:", info.messageId);

        return true;

    } catch (error) {
        console.error("❌ GAGAL MENGIRIM EMAIL");
        console.error(error);

        throw error;
    }
};

module.exports = {
    sendOTP
};