const express = require('express');
const { 
  getFilteredUsers,
  addUser, 
  updateUserSettings, 
  deleteUserById 
} = require('../controllers/adminController');
const { getAllUploadAttempts } = require('../controllers/imageController');  

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.session?.user) return next();
  res.redirect('/login');
};

router.get('/admin/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const { search = '', sort = 'username', order = 'asc', limit = 50, offset = 0 } = req.query;
    const users = await getFilteredUsers({ search, sort, order, limit, offset });
    const uploadAttempts = await getAllUploadAttempts();
    res.render('pages/admin/dashboard', { 
      users,
      uploadAttempts,
      activePage: 'dashboard',
      query: req.query
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('An error occurred while fetching data.');
  }
});

router.get('/admin/upload-attempts', ensureAuthenticated, async (req, res) => {
  try {
    const uploadAttempts = await getAllUploadAttempts();
    res.json(uploadAttempts);
  } catch (error) {
    console.error('Error fetching upload attempts:', error);
    res.status(500).json({ error: 'Failed to fetch upload attempts' });
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

// POST route to update user settings via the modal form
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