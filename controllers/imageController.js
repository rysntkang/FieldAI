const { upload } = require('../middleware/upload');
const { createUploadAttemptWithImages } = require('../models/imageModel');
const { processImage } = require('../services/mlService');
const path = require('path');

const handleImageUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const sectorId = req.body.sectorId;
    const files = req.files.map(file => ({
      file_path: `/uploads/${file.filename}`
    }));
    const uploadResults = await createUploadAttemptWithImages(sectorId, files);
    console.log(uploadResults);

    // Machine Learning Model Part
    const imageIds = files.map((_, index) => uploadId * 1000 + index);
    imageIds.forEach(id => processImage(id,
      path.join(__dirname, `../public${files[id % files.length].file_path}`)
    ));

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