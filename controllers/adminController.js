const bcryptjs = require('bcryptjs');
const {
  findUserByEmail,
  findUserByUsername,
  createUser,
  updateUser,
  getAllUsers: modelGetAllUsers,
  getFilteredUsers: modelGetFilteredUsers,
  deleteUser: modelDeleteUser,
  getUserById: modelGetUserById  
} = require('../models/userModel');

const getFilteredUsers = async (options) => {
  try {
    return await modelGetFilteredUsers(options);
  } catch (error) {
    throw error;
  }
};

const getAllUsers = async () => {
  try {
    return await modelGetAllUsers();
  } catch (error) {
    throw error;
  }
};

const addUser = async (req, res) => {
  const { username, email, password, role, latitude, longitude } = req.body;

  if (!username || !email || !password || !role || !latitude || !longitude) {
    return res.redirect(
      '/admin/add-user?error=' + encodeURIComponent('All fields are required.')
    );
  }

  if (!latitude || !longitude) {
    return res.redirect('/admin/add-user?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.'));
  }

  if (role !== 'User' && role !== 'Admin') {
    return res.redirect(
      '/admin/add-user?error=' + encodeURIComponent('Invalid role selected.')
    );
  }

  if (password.length < 6) {
    return res.redirect(
      '/admin/add-user?error=' + encodeURIComponent('Password must be at least 6 characters long.')
    );
  }

  try {
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.redirect(
        '/admin/add-user?error=' + encodeURIComponent('Email is already in use.')
      );
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.redirect(
        '/admin/add-user?error=' + encodeURIComponent('Username is already taken.')
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await createUser(email, username, hashedPassword, role, lat, lon);
    if (result) {
      return res.redirect(
        '/admin/dashboard?success=' + encodeURIComponent('User added successfully.')
      );
    } else {
      return res.redirect(
        '/admin/add-user?error=' + encodeURIComponent('Error creating user.')
      );
    }
  } catch (error) {
    console.error('Admin Add User Error:', error);
    return res.redirect(
      '/admin/add-user?error=' + encodeURIComponent('Internal Server Error.')
    );
  }
};

const updateUserSettings = async (req, res) => {
  const { user_id, username, email, role, latitude, longitude } = req.body;

  // Check that all required fields are provided
  if (!user_id || !username || !email || !role) {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('All fields are required.')
    );
  }

  if (!latitude || !longitude) {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.')
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('Invalid email format.')
    );
  }

  // Validate username length
  if (username.trim().length < 5) {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('Username must be at least 5 characters long.')
    );
  }

  if (password.length < 6) {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('Password must be at least 6 characters long.')
    );
  }

  // Validate role – only allow 'User' or 'Admin'
  if (role !== 'User' && role !== 'Admin') {
    return res.redirect(
      '/admin/dashboard?error=' + encodeURIComponent('Invalid role provided.')
    );
  }

  try {
    // Optionally, you might check for uniqueness of username/email here.
    // Then update the user record with the new values (including role).
    const success = await updateUser(user_id, { username, email, role, latitude: lat, longitude: lon });
    if (success) {
      res.redirect('/admin/dashboard?success=' + encodeURIComponent('User updated successfully.'));
    } else {
      res.redirect('/admin/dashboard?error=' + encodeURIComponent('Failed to update user.'));
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
  }
};


const deleteUserById = async (userId) => {
  try {
    return await modelDeleteUser(userId);
  } catch (error) {
    throw new Error('Error deleting user: ' + error.message);
  }
};

const getUserById = async (userId) => {
  try {
    return await modelGetUserById(userId);
  } catch (error) {
    throw new Error('Error fetching user: ' + error.message);
  }
};

module.exports = { 
  getAllUsers, 
  addUser, 
  updateUserSettings, 
  deleteUserById, 
  getUserById, 
  getFilteredUsers
};
