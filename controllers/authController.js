const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, createUser } = require('../models/userModel');

const registerUser = async (req, res) => {
  const { email, username, password, confirmPassword, latitude, longitude } = req.body;

  if (!email || !username || !password || !confirmPassword) {
    return res.redirect('/register?error=' + encodeURIComponent('All fields are required'));
  }

  if (!latitude || !longitude) {
    return res.redirect('/register?error=' + encodeURIComponent('Location missing. Please ensure location is enabled by refreshing.'));
  }

  if (username.trim().length < 5) {
    return res.redirect(
      '/register?error=' + encodeURIComponent('Username must be at least 5 characters long.')
    );
  }

  if (password.length < 6) {
    return res.redirect(
      '/register?error=' + encodeURIComponent('Password must be at least 6 characters long.')
    );
  }

  if (password !== confirmPassword) {
    return res.redirect('/register?error=' + encodeURIComponent('Passwords do not match'));
  }

  try {
    const existingEmail = await findUserByEmail(email);
    const existingUsername = await findUserByUsername(username);
    if (existingEmail) {
      return res.redirect('/register?error=' + encodeURIComponent('Email is already in use'));
    }
    if (existingUsername) {
      return res.redirect('/register?error=' + encodeURIComponent('Username is already taken'));
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const result = await createUser(email, username, hashedPassword, "User", latitude, longitude);

    if (result) {
      return res.redirect('/login?success=' + encodeURIComponent('Registration successful! Please log in.'));
    } else {
      return res.redirect('/register?error=' + encodeURIComponent('Error creating user'));
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.redirect('/register?error=' + encodeURIComponent('Internal Server Error'));
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/login?error=' + encodeURIComponent('Username and password are required'));
  }

  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
    }

    req.session.user = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      latitude: user.latitude,
      longitude: user.longitude,
      role: user.role,
    };

    if (user.role === "Admin") {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/user/dashboard');
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.redirect('/login?error=' + encodeURIComponent('Internal Server Error'));
  }
};

module.exports = { registerUser, loginUser };
