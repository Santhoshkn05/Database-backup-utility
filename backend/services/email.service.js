const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

async function sendEmail(to, subject, message) {
    await transporter.sendMail({
        from: process.env.SMTP_user,
        to,
        subject,
        text: message
    });
}
module.exports = sendEmail;