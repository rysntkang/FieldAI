const express = require('express');
const { 
  getFilteredUsers,
  addUser, 
  updateUserSettings, 
  deleteUserById 
} = require('../controllers/adminController');
const { getAllUploadAttempts, getFilteredUploadAttempts } = require('../controllers/imageController');  

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.session?.user) return next();
  res.redirect('/login?error=' + encodeURIComponent('Please login to access admin functionalities.'));
};

router.get('/admin/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const { 
      search = '', 
      sort = 'username', 
      order = 'asc', 
      limit = 50, 
      offset = 0,
      uploadSearch = '', 
      uploadSort = 'upload_date', 
      uploadOrder = 'desc', 
      uploadLimit = 50, 
      uploadOffset = 0
    } = req.query;

    const users = await getFilteredUsers({ search, sort, order, limit, offset });
    const uploadAttempts = await getFilteredUploadAttempts({
      search: uploadSearch,
      sort: uploadSort,
      order: uploadOrder,
      limit: uploadLimit,
      offset: uploadOffset
    });
    if(process.env.INSTANCE_UNIX_SOCKET){
    const getSignedUrl = require('../middleware/gcsimage');
      for (const attempt of uploadAttempts) {
        attempt.images = await Promise.all(
          attempt.images.map(async (image) => ({
            ...image,
            file_path: await getSignedUrl(image.file_path), // Replace file_path with signed URL
          }))
        );
      }
    }
    res.render('pages/admin/dashboard', { 
      users,
      uploadAttempts,
      activePage: 'dashboard',
      query: req.query,
      success: req.query.success,
      error: req.query.error
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
  res.render('pages/admin/add-user', { 
    activePage: 'add-user',
    error: req.query.error,
    success: req.query.success
  });
});

router.post('/admin/add-user', ensureAuthenticated, addUser);

router.post('/admin/edit-user', ensureAuthenticated, updateUserSettings);

router.post('/admin/delete-user', ensureAuthenticated, async (req, res) => {
  const { user_id } = req.body;
  try {
    const success = await deleteUserById(user_id);
    if (success) {
      res.redirect('/admin/dashboard?success=' + encodeURIComponent('User deleted successfully.'));
    } else {
      res.redirect('/admin/dashboard?error=' + encodeURIComponent('Failed to delete user.'));
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
  }
});

module.exports = router;
