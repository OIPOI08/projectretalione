const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Cek koneksi Gmail saat server dijalankan
transporter.verify((error, success) => {
    if (error) {
        console.error("GMAIL CONNECTION ERROR:");
        console.error(error);
    } else {
        console.log("GMAIL SMTP SIAP DIGUNAKAN");
    }
});

const sendOTP = async (email, otp) => {
    try {
        console.log("Mengirim OTP ke:", email);

        const info = await transporter.sendMail({
            from: `"Projectretalione" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "OTP Reset Password - Projectretalione",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 20px;
                ">

                    <h2>Projectretalione</h2>

                    <p>
                        Kamu meminta untuk melakukan reset password.
                    </p>

                    <p>
                        Berikut kode OTP kamu:
                    </p>

                    <h1 style="
                        letter-spacing: 8px;
                        font-size: 32px;
                    ">
                        ${otp}
                    </h1>

                    <p>
                        OTP berlaku selama <b>5 menit</b>.
                    </p>

                    <p>
                        Jika kamu tidak meminta reset password,
                        abaikan email ini.
                    </p>

                </div>
            `
        });

        console.log("================================");
        console.log("EMAIL BERHASIL DIKIRIM");
        console.log("PENERIMA :", email);
        console.log("MESSAGE ID:", info.messageId);
        console.log("RESPONSE :", info.response);
        console.log("================================");

        return true;

    } catch (error) {
        console.error("================================");
        console.error("GAGAL MENGIRIM EMAIL");
        console.error(error);
        console.error("================================");

        throw error;
    }
};

module.exports = {
    sendOTP
};