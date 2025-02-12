const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;
const options = {
  version: 'v4',
  action: 'read',
  expires:Math.floor(new Date().getTime() / 1000) + 15 * 60,
};

async function getSignedUrl(fileName) {
  const [url] = await storage
    .bucket(bucketName)
    .file(fileName)
    .getSignedUrl(options);
  console.log('Signed URL:', url);
  return url;
}
module.exports = getSignedUrl;