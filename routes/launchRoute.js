const express = require('express');
const router = express.Router();

//Landing Page is the features page.
router.get('/', (req, res) => {
    res.render('index', { title: 'Features', page: 'landing/features' });
  });

router.get('/features', (req, res) => {
  res.render('index', { title: 'Features', page: 'landing/features' });
});

router.get('/pricing', (req, res) => {
  res.render('index', { title: 'Pricing', page: 'landing/pricing' });
});

router.get('/about', (req, res) => {
  res.render('index', { title: 'About', page: 'landing/about' });
});

module.exports = router;