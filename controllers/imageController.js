const { saveImageRecords } = require('../models/imageModel');

const handleImageUpload = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const sectorId = req.body.sectorId;
        const files = req.files.map(file => ({
            sector_id: sectorId,
            file_path: `/uploads/${file.filename}`
        }));

        await saveImageRecords(files);
        
        res.json({ 
            success: true, 
            message: `${req.files.length} images uploaded successfully`,
            paths: files.map(f => f.file_path) 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Image upload failed' });
    }
};

module.exports = { handleImageUpload };