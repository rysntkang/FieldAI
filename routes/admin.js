const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../models/userModel');

router.get('/admin/dashboard', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.render('pages/admin/dashboard', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('An error occurred while fetching users.');
    }
});

router.get('/admin/add-user', (req, res) => {
    res.render('pages/admin/add-user');
});

router.post('/admin/add-user', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const success = await addUser(username, email, password);
        if (success) {
            res.redirect('/admin/dashboard');
        } else {
            res.status(500).send('Failed to add user');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('An error occurred');
    }
});

module.exports = router;