const express = require('express');
const { getAllUsers, addUser } = require('../controllers/adminController');

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
    if (req.session?.user) return next();
    res.redirect('/login');
};

router.get('/admin/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers();
        res.render('pages/admin/dashboard', { 
            users,
            activePage: 'dashboard'
        });
    
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('An error occurred while fetching users.');
    }
});

router.get('/admin/add-user', ensureAuthenticated, async (req, res) => {
    res.render('pages/admin/add-user', {
        activePage: 'add-user'
    });
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

module.exports = router;