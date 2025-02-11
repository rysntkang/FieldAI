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

const getFilteredUsers = async ({ search, sort, order, limit, offset }) => {
  let query = 'SELECT user_id, email, username, role, latitude, longitude FROM users WHERE role != "Admin"';
  const values = [];

  if (search) {
    query += ' AND username LIKE ?';
    values.push(`%${search}%`);
  }

  const validSortFields = ['username', 'email'];
  if (sort && validSortFields.includes(sort)) {
    const sortOrder = (order && order.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sort} ${sortOrder}`;
  } else {
    query += ' ORDER BY username ASC';
  }

  const limitNum = parseInt(limit, 10) || 50;
  query += ` LIMIT ${limitNum}`;

  if (offset !== undefined && offset !== null && offset !== '') {
    const offsetNum = parseInt(offset, 10);
    if (!isNaN(offsetNum)) {
      query += ` OFFSET ${offsetNum}`;
    }
  }

  const [rows] = await db.execute(query, values);
  return rows;
};


const updateUser = async (userId, updates) => {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return false;

  const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
  values.push(userId);

  const [result] = await db.execute(query, values);
  return result.affectedRows > 0;
};

const deleteUser = async (userId) => {
  const [result] = await db.execute('DELETE FROM users WHERE user_id = ?', [userId]);
};

const getUserById = async (userId) => {
  const [rows] = await db.execute(
    'SELECT user_id, username, email, latitude, longitude FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0];
};

module.exports = {
  findUserByEmail,
  findUserByUsername,
  createUser,
  getAllUsers,
  getFilteredUsers,
  updateUser,
  deleteUser,
  getUserById
};
