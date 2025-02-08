const path = require('path');
const { 
  createUploadAttemptWithImages, 
  getUploadAttempts: modelGetUploadAttempts,
  getAllUploadAttempts: modelGetAllUploadAttempts,
  getAttemptImages: modelGetAttemptImages 
} = require('../models/imageModel');
const { processImage } = require('../services/mlService');

const handleImageUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const sectorId = req.body.sectorId;
    const files = req.files.map(file => ({
      file_path: `/uploads/${file.filename}`
    }));

    const { uploadId, imageIds } = await createUploadAttemptWithImages(sectorId, files);

    imageIds.forEach((imageId, index) => {
      processImage(
        imageId,
        path.join(__dirname, `../public${files[index].file_path}`)
      );
    });

    res.json({ 
      success: true,
      message: `${files.length} images uploaded successfully`,
      uploadId
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

const getUploadAttempts = async (sectorId) => {
  try {
    const attempts = await modelGetUploadAttempts(sectorId);
    for (const attempt of attempts) {
      attempt.images = await modelGetAttemptImages(attempt.upload_id);
    }
    return attempts;
  } catch (error) {
    console.error('Controller error fetching attempts:', error);
    throw error;
  }
};

const getAllUploadAttempts = async () => {
  try {
    const attempts = await modelGetAllUploadAttempts();
    for (const attempt of attempts) {
      attempt.images = await modelGetAttemptImages(attempt.upload_id);
    }
    return attempts;
  } catch (error) {
    console.error('Controller error fetching all attempts:', error);
    throw error;
  }
};

module.exports = { 
  handleImageUpload, 
  getUploadAttempts,
  getAllUploadAttempts 
};
