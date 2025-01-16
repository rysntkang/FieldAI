const express = require('express');
const router = express.Router();

router.get('/user/dashboard', (req, res) => res.render('pages/user/dashboard'));

module.exports = router;