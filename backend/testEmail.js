require('dotenv').config();

const sendEmail = require('./services/email.service');

async function testEmail() {
    try {
        await sendEmail(
            process.env.NOTIFICATION_EMAIL,
            'Database Backup Utility - Test Email',
            'Email notification system is working successfully.'
        );

        console.log('Test email sent successfully');
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

testEmail();