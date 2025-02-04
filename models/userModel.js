const db = require('../config/db');

const findUserByEmail = async (email) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
};

const findUserByUsername = async (username) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
};

const createUser = async (email, username, hashedPassword, role, latitude, longitude) => {
    const [result] = await db.execute(
        'INSERT INTO users (email, username, password, role, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        [email, username, hashedPassword, role, latitude, longitude]
    );
    return result.affectedRows > 0;
};

const getAllUsers = async () => {
    const [rows] = await db.execute(
        'SELECT user_id, email, username, role, latitude, longitude FROM users WHERE role != "Admin"'
    );
    return rows;
};

module.exports = { findUserByEmail, findUserByUsername, createUser, getAllUsers };
