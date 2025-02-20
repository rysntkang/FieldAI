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

        const result = await createUser(email, username, hashedPassword, role, latitude, longitude);
        if (result) {
            const successMessage = role === 'Admin' 
                ? 'Admin user added successfully.' 
                : 'User added successfully.';

            return res.redirect(
                `/admin/dashboard?success=${encodeURIComponent(successMessage)}`
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

    if (!user_id) {
        return res.redirect(
            '/admin/dashboard?error=' + encodeURIComponent('User ID is missing.')
        );
    }

    if (!latitude || !longitude) {
      return res.redirect(
          '/admin/add-user?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.')
      );
  }

    try {
        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (role) updates.role = role;
        if (latitude) updates.latitude = latitude;
        if (longitude) updates.longitude = longitude;


        const success = await updateUser(user_id, updates);
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