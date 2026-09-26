const { uploadToB2 } = require('./services/b2Storage.service');

async function test() {
    try {
        await uploadToB2(
            './backups/backup-2-2026-09-25T23-08-00-125Z.sql.gz',
            'test-upload.sql.gz'
        );

        console.log('Test upload successful');
    } catch (error) {
        console.error('Test upload failed:', error);
    }
}

test();