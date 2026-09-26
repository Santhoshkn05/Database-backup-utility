require('dotenv').config();
const {S3Client, PutObjectCommand, GetObjectCommand} = require('@aws-sdk/client-s3');
const b2Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY
    }
});

async function uploadToB2(filePath, filename) {
    const command = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Key: filename,
        Body: require('fs').createReadStream(filePath)
    });
    await b2Client.send(command);
    console.log(`Backup uploaded to B2: ${filename}`);
}

async function downloadFromB2(fileName, destinationPath) {
    const command = new GetObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Key: fileName
    });
    const response = await b2Client.send(command);
    const output = require('fs').createWriteStream(destinationPath);
    response.Body.pipe(output);
    await new Promise((resolve, reject) => {
        output.on('finish', resolve);
        output.on('error', reject);
    });
    console.log(`Backup downloaded from B2: ${fileName}`);
}
module.exports = {
    b2Client,
    uploadToB2,
    downloadFromB2
};