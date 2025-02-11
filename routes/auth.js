const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

router.get('/login', (req, res) => 
  res.render('pages/login', { 
    success: req.query.success, 
    error: req.query.error 
  })
);

router.get('/register', (req, res) => 
  res.render('pages/register', { 
    error: req.query.error 
  })
);

router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Could not log out. Please try again.');
      }
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
