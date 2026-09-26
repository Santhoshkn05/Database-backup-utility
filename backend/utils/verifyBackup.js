const fs = require('fs');
const zlib = require('zlib');

function verifyBackup(filePath) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(filePath);
        const gunzip = zlib.createGunzip();
        input.on('error', (error) => {
            reject(error);
        });
        gunzip.on('error', (error) => {
            reject(error);
        });
        
        gunzip.on('data', () => {});

        gunzip.on('end', () => {
            resolve();
        });
        input.pipe(gunzip);
    });
}
module.exports = verifyBackup;