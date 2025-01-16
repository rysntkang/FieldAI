const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

router.get('/login', (req, res) => res.render('pages/login'));
router.get('/register', (req, res) => res.render('pages/register'));

module.exports = router;

router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;

