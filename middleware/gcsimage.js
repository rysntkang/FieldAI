const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;
const options = {
  version: 'v4',
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
};

async function getSignedUrl(fileName) {
  const [url] = await storage
    .bucket(bucketName)
    .file(fileName)
    .getSignedUrl(options);
  console.log('Signed URL:', url);
}
module.exports = getSignedUrl;