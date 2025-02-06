const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, createUser, getAllUsers:modelGetAllUsers } = require('../models/userModel');

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
  
      const hashedPassword = await bcryptjs.hash(password, 10);
      const success = await createUser(email, username, hashedPassword, 'User', latitude, longitude);
      
      return success;
    } catch (error) {
      throw error;
    }
  };

module.exports = { getAllUsers, addUser };
