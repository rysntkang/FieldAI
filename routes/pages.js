const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.render('pages/index'));
router.get('/about', (req, res) => res.render('pages/about'));
router.get('/pricing', (req, res) => res.render('pages/pricing'));
router.get('/login', (req, res) => res.render('pages/login'));
router.get('/register', (req, res) => res.render('pages/register'));

module.exports = router;
