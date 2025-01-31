const db = require('../config/db');

const saveImageRecords = async (files) => {
    const query = `
        INSERT INTO images 
        (sector_id, file_path) 
        VALUES ?
    `;
    
    const values = files.map(file => [
        file.sector_id,
        file.file_path
    ]);

    await db.query(query, [values]);
};

module.exports = { saveImageRecords };