const db = require('../config/db');

const findUserByEmail = async (email) => {
    const [rows] = await db.execute('SELECT * FROM useraccount WHERE email = ?', [email]);
    return rows[0];
};

const findUserByUsername = async (username) => {
    const [rows] = await db.execute('SELECT * FROM useraccount WHERE username = ?', [username]);
    return rows[0];
};

const createUser = async (email, username, hashedPassword, latitude, longitude) => {
    const [result] = await db.execute(
        'INSERT INTO useraccount (email, username, password, role, latitude, longitude) VALUES (?, ?, ?, "User", ?, ?)',
        [email, username, hashedPassword, latitude, longitude]
    );
    return result.affectedRows > 0;
};

const getAllUsers = async () => {
    const [rows] = await db.execute('SELECT * FROM useraccount WHERE role != "Admin"');
    return rows;
};

module.exports = { findUserByEmail, findUserByUsername, createUser, getAllUsers, addUser };
