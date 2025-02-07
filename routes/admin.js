const express = require('express');
const {
  getAllUsers,
  addUser,
  updateUserSettings,
  deleteUserById,
  getUploadAttemptsData
} = require('../controllers/adminController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.session?.user) return next();
  res.redirect('/login');
};

router.get('/admin/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const users = await getAllUsers();
    const uploadAttemptsData = await getUploadAttemptsData();
    res.render('pages/admin/dashboard', { 
      users,
      uploadAttemptsData,
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Error fetching users or upload attempts:', error);
    res.status(500).send('An error occurred while fetching data.');
  }
});

router.get('/admin/add-user', ensureAuthenticated, async (req, res) => {
  res.render('pages/admin/add-user', { activePage: 'add-user' });
});

router.post('/admin/add-user', ensureAuthenticated, async (req, res) => {
  const { username, email, password, latitude, longitude } = req.body;
  try {
    const success = await addUser(username, email, password, latitude, longitude);
    if (success) {
      res.redirect('/admin/dashboard');
    } else {
      res.status(500).send('Failed to add user.');
    }
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(400).send(error.message);
  }
});

router.post('/admin/edit-user', ensureAuthenticated, async (req, res) => {
  const { user_id, username, email, latitude, longitude } = req.body;
  try {
    const success = await updateUserSettings(user_id, { username, email, latitude, longitude });
    if (success) {
      res.redirect('/admin/dashboard');
    } else {
      res.status(400).send('Update failed');
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send(error.message);
  }
});

router.post('/admin/delete-user', ensureAuthenticated, async (req, res) => {
  const { user_id } = req.body;
  try {
    const success = await deleteUserById(user_id);
    if (success) {
      res.redirect('/admin/dashboard');
    } else {
      res.status(400).send('Deletion failed');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send(error.message);
  }
});

module.exports = router;
