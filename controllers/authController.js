const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, createUser } = require('../models/userModel');

const registerUser = async (req, res) => {
    const { email, username, password, confirmPassword, latitude, longitude } = req.body;

    if (!email || !username || !password || !confirmPassword || !latitude || !longitude) {
        return res.status(400).send('All fields are required.');
    }

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const existingEmail = await findUserByEmail(email);
        const existingUsername = await findUserByUsername(username);
        if (existingEmail) {
            return res.status(400).send('Email is already in use.');
        }
        if (existingUsername) {
            return res.status(400).send('Username is already taken.');
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        const result = await createUser(email, username, hashedPassword, latitude, longitude);
        if (result) {
            res.redirect('/login');
        } else {
            res.status(500).send('Error creating user.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    try {
        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(400).send('Invalid username or password.');
        }

        const passwordMatch = await bcryptjs.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).send('Invalid username or password.');
        }

        req.session.user = {
            user_id: user.user_id, 
            username: user.username,
            latitude: user.latitude,
            longitude: user.longitude,
            role: user.role, };

        if (user.role == "Admin") {
            res.redirect('/admin/dashboard');
        }
        else {
            res.redirect('/user/dashboard');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = { registerUser, loginUser };
