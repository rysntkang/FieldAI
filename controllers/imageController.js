const { createUploadAttempt, saveImageRecords } = require('../models/imageModel');
const { processImageMock } = require('../services/mlService');

const handleImageUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const sectorId = req.body.sectorId;
    const uploadId = await createUploadAttempt(sectorId);

    const files = req.files.map(file => ({
      file_path: `/uploads/${file.filename}`
    }));

    await saveImageRecords(uploadId, files);

    // Start mock processing for each image
    const imageIds = files.map((_, index) => uploadId * 1000 + index); // Mock image IDs
    imageIds.forEach(id => processImageMock(id));

    res.json({ 
      success: true, 
      message: `${req.files.length} images uploaded successfully`,
      uploadId 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

module.exports = { handleImageUpload };