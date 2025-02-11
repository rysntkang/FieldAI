const bcryptjs = require('bcryptjs');
const { findUserByEmail, findUserByUsername, createUser } = require('../models/userModel');

const registerUser = async (req, res) => {
  const { email, username, password, confirmPassword, latitude, longitude } = req.body;

  // Check for missing fields
  if (!email || !username || !password || !confirmPassword || !latitude || !longitude) {
    return res.redirect('/register?error=All+fields+are+required');
  }

  // Check password confirmation
  if (password !== confirmPassword) {
    return res.redirect('/register?error=Passwords+do+not+match');
  }

  try {
    // Check if email or username already exists
    const existingEmail = await findUserByEmail(email);
    const existingUsername = await findUserByUsername(username);
    if (existingEmail) return res.redirect('/register?error=Email+is+already+in+use');
    if (existingUsername) return res.redirect('/register?error=Username+is+already+taken');

    // Hash the password and create the user
    const hashedPassword = await bcryptjs.hash(password, 10);
    const result = await createUser(email, username, hashedPassword, "User", latitude, longitude);

    if (result) {
      // On success, redirect to login with a success message
      return res.redirect('/login?success=Registration+successful!+Please+log+in.');
    } else {
      return res.redirect('/register?error=Error+creating+user');
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.redirect('/register?error=Internal+Server+Error');
  }
};

  

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  // 1. Missing Fields
  if (!username || !password) {
    return res.redirect('/login?error=Username+and+password+are+required');
  }

  try {
    // 2. User not found
    const user = await findUserByUsername(username);
    if (!user) {
      return res.redirect('/login?error=Invalid+username+or+password');
    }

    // 3. Password mismatch
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.redirect('/login?error=Invalid+username+or+password');
    }

    // 4. Successful Login – Set session data and redirect accordingly
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
    return res.redirect('/login?error=Internal+Server+Error');
  }
};


module.exports = { registerUser, loginUser };
