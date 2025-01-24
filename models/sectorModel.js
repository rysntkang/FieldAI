const db = require('../config/db');

const getSectorsByUserId = async (userId) => {
    const [rows] = await db.execute(
        'SELECT sector_id, name, latitude, longitude FROM sectors WHERE user_id = ?',
        [userId]
    );
    return rows;
};

const addSector = async (userId, name, latitude, longitude) => {
    console.log(userId, name, latitude, longitude);
    const [result] = await db.execute(
        'INSERT INTO sectors (user_id, name, latitude, longitude) VALUES (?, ?, ?, ?)',
        [userId, name, latitude, longitude]
    );
    return result.insertId;
};


module.exports = { getSectorsByUserId, addSector };
