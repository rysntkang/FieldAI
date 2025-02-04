const { createUploadAttemptWithImages } = require('../models/imageModel');
const { processImageMock } = require('../services/mlService');

const handleImageUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const sectorId = req.body.sectorId;
    const files = req.files.map(file => ({
      file_path: `/uploads/${file.filename}`
    }));
    const uploadId = await createUploadAttemptWithImages(sectorId, files);

    // Mock processing
    const imageIds = files.map((_, index) => uploadId * 1000 + index);
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