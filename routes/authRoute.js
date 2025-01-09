const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('index', { title: 'Login', page: 'login'});
});

router.get('/register', (req, res) => {
  res.render('index', { title: 'Register', page: 'register'});
});

module.exports = router;
