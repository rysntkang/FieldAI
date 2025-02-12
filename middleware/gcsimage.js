const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;

const serverTime = Date.now();
const options = {
  version: 'v4',
  action: 'read',
  expires: serverTime + 24 * 60 * 60 * 1000, // 1 day to avoid timezone conflict, appengine on utc
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