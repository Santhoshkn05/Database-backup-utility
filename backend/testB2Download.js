const { downloadFromB2 } = require('./services/b2Storage.service');

async function test() {
    try {
        await downloadFromB2(
            'backup-2-2026-09-26T16-26-39-620Z.sql.gz',
            './backups/b2-test-download.sql.gz'
        );

        console.log('Test download successful');
    } catch (error) {
        console.error('Test download failed:', error);
    }
}

test();