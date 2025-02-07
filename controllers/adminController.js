const {
  findUserByEmail,
  findUserByUsername,
  createUser,
  getAllUsers: modelGetAllUsers,
  updateUser: modelUpdateUser,
  deleteUser: modelDeleteUser,
  getUserById: modelGetUserById,
} = require('../models/userModel');

const { 
  getAllUploadAttempts: modelGetAllUploadAttempts 
} = require('../models/imageModel');

const getAllUsers = async () => {
  try {
    return await modelGetAllUsers();
  } catch (error) {
    throw error;
  }
};

const addUser = async (username, email, password, latitude, longitude) => {
  if (!username || !email || !password || !latitude || !longitude) {
    throw new Error('All fields are required.');
  }
  try {
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) throw new Error('Email already in use.');

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) throw new Error('Username already taken.');

    const hashedPassword = await require('bcryptjs').hash(password, 10);
    const success = await createUser(email, username, hashedPassword, 'User', latitude, longitude);
    return success;
  } catch (error) {
    throw error;
  }
};

const updateUserSettings = async (userId, updates) => {
  try {
    return await modelUpdateUser(userId, updates);
  } catch (error) {
    throw error;
  }
};

const deleteUserById = async (userId) => {
  try {
    return await modelDeleteUser(userId);
  } catch (error) {
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    return await modelGetUserById(userId);
  } catch (error) {
    throw error;
  }
};

const getUploadAttemptsData = async () => {
  try {
    return await modelGetAllUploadAttempts();
  } catch (error) {
    throw error;
  }
};

module.exports = { getAllUsers, addUser, updateUserSettings, deleteUserById, getUserById, getUploadAttemptsData };
