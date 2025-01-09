const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const multer = require('multer');

const { Storage } = require('@google-cloud/storage');
const util = require('util');

require('dotenv').config();
var MemcachedStore = require('connect-memcached')(session);

const app = express();
const PORT = 8080;

const dbConfig = process.env.INSTANCE_UNIX_SOCKET
  ? {   //Cloud Config for Google Cloud
      socketPath: process.env.INSTANCE_UNIX_SOCKET,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    }
  : {   //Local Configuration
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    };

const db = mysql.createConnection({
  ...dbConfig,
  connectTimeout: 10000
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL database.');
}); 

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session(
  //if appengine instance, use gcloud memcached
  process.env.INSTANCE_UNIX_SOCKET ?{
    secret: 'testsecret',
    key: 'test',
    proxy: 'true',
    store: new MemcachedStore({
        hosts: [process.env.MEMCACHE_URL || '10.25.128.3:11211']
  })
  }
  :{
  //if appengine not loaded, use local cache
    secret: 'secretkey', // Replace with a secure key
    resave: false,
    saveUninitialized: true,
  }
));

app.use(flash());

app.use((req, res, next) => {
  next();
});

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user) {
    console.log('Unauthenticated access. Session data:', req.session);
    return res.redirect('/login');
  }
  req.role = req.session.user.role;
  next();
};


// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Features', page: 'landing/features' });
});

app.get('/pricing', (req, res) => {
  res.render('index', { title: 'Pricing', page: 'landing/pricing' });
});

app.get('/about', (req, res) => {
  res.render('index', { title: 'About', page: 'landing/about' });
});

app.get('/login', (req, res) => {
  const error = req.flash('error')
  const success = req.flash('success');
  res.render('index', { title: 'Login', page: 'login', error, success });
});

app.get('/register', (req, res) => {
  const error = req.flash('error')
  const success = req.flash('success');
  res.render('index', { title: 'Register', page: 'register', error, success });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM useraccount WHERE username = ?';

  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error(err);
      req.flash('error', 'A database error occurred. Please try again later.');
      return res.redirect('/login');
    }
    if (results.length === 0) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    req.session.user = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    console.log('Session initialized:', req.session.user);

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Login failed. Please try again.');
        return res.redirect('/login');
      }
      res.redirect(`/home`);
    });
  });
});

app.get('/home', isAuthenticated, (req, res) => {
  if (req.role === 'Admin') {
    // Redirect admin users to the admin home page
    return res.redirect('/admin/home');
  }
  // Redirect normal users to the user home page
  return res.redirect('/user/home');
});

app.get('/user/home', isAuthenticated, (req, res) => {
  const success = req.flash('success');
  const error = req.flash('error');
  const query = 'SELECT sector_id, sector_name, description FROM farmsector WHERE user_id = ?';
  
  db.query(query, [req.session.user.user_id], (err, results) => {
    if (err) {
      console.error('Error fetching sectors:', err);
      return res.status(500).send('Something went wrong while fetching sectors.');
    }

    const sectors = results.length > 0 ? results : [];

    res.render('user/user', {
      title: 'User Home',
      body: 'userhome',
      user: req.session.user,
      sectors: sectors,
      success: success,
      error: error
    });
  });
});

app.get('/admin/home', isAuthenticated, async (req, res) => {
  if (req.role !== 'Admin') {
    return res.redirect('/login');
  }
  
  const search = req.query.search || '';
  const query = 'SELECT user_id, username, role FROM useraccount WHERE user_id != ? AND username LIKE ?';
  try {
    const [users] = await db.promise().query(query,[req.session.user.user_id, `%${search}%`, ]);
    res.render('admin/admin', {
      title: 'Admin Dashboard',
      body: 'adminhome',
      users,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).send('Error loading users');
  }
});

app.get('/admin/add-user', isAuthenticated, (req, res) => {
  if (req.role !== 'Admin') return res.redirect('/login');
  res.render('admin/admin', {
    title: 'Add User',
    body: 'admin-adduser',
  });
});

app.post('/admin/add-user', isAuthenticated, async (req, res) => {
  const { username, role, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO useraccount (username, email, password, role) VALUES (?, ?, ?, ?)';
  db.query(query, [username, email, hashedPassword, role], (err) => {
    if (err) {
      console.error('Error adding user:', err);
      return res.status(500).send('Error adding user');
    }
    res.redirect('/admin/home');
  });
});

app.delete('/admin/delete-user/:id', isAuthenticated, (req, res) => {
  if (req.role !== 'Admin') return res.status(403).send({ success: false, message: 'Unauthorized' });

  const userId = req.params.id;
  db.query('DELETE FROM useraccount WHERE user_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).send({ success: false, message: 'Error deleting user' });
    }
    res.send({ success: true });
  });
});

app.get('/admin/admin-viewuser/:id', isAuthenticated, (req, res) => {
  const userId = req.params.id;

  db.query('SELECT * FROM useraccount WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];


    res.render('admin/admin', {
      title: 'View User',
      body: 'admin-viewuser',
      user: user,               
    });
  });
});

app.get('/admin/edit-user/:id', isAuthenticated, (req, res) => {
  const userId = req.params.id;

  db.query('SELECT * FROM useraccount WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];
    db.query('SELECT DISTINCT role FROM useraccount', (err, rolesResults) => {
      if (err) {
        console.log('Error fetching roles:', err);
        return res.status(500).send('Error fetching roles');
      }

      const roles = rolesResults.map(role => role.role);

      res.render('admin/admin', {
        title: 'Edit User Page',
        body: 'admin-edituser',
        user: user,
        roles: roles
      });
    })
  });
});

app.post('/admin/edit-user/:id', isAuthenticated, (req, res) => {
  const userId = req.params.id;
  const { email, username, role } = req.body;

  db.query('UPDATE useraccount SET email = ?, username = ?, role = ? WHERE user_id = ?', 
    [email, username, role, userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error updating user data.');
      }
    });

    res.redirect(`/admin/admin-viewuser/${userId}`);
});

app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  db.query(
    'SELECT * FROM useraccount WHERE email = ? OR username = ?',
    [email, username],
    async (err, results) => {
      if (err) {
        console.error(err);
        req.flash('error', 'A database error occurred. Please try again later.');
        return res.redirect('/register');
      }

      if (results.length > 0) {
        console.log("Test1")
        req.flash('error', 'Email or username already exists.');
        return res.redirect('/register');
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const sql = 'INSERT INTO useraccount (email, username, password, role) VALUES (?, ?, ?, ?)';
      db.query(sql, [email, username, hashedPassword, 'User'], (err, results) => {
        if (err) {
          req.flash('error', 'Registration failed. Please try again.');
          return res.redirect('/register');
        }

        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
      });
    }
  );
});

app.get('/user/user-viewaccount', isAuthenticated, (req, res) => {
  const userId = req.session.user.user_id;

  db.query('SELECT * FROM useraccount WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];


    res.render('user/user', {
      title: 'Account',
      body: 'user-viewaccount',
      user: user,               
    });
  });
});

app.get('/user/edit-account', isAuthenticated, (req, res) => {
  const userId = req.session.user.user_id;

  db.query('SELECT * FROM useraccount WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];

    res.render('user/user', {
      title: 'Update Account',
      body: 'user-editaccount',
      user: user
    })
  });
});

app.post('/user/edit-account/', isAuthenticated, (req, res) => {
  const userId = req.session.user.user_id;
  const { email, username } = req.body;

  db.query('UPDATE useraccount SET email = ?, username = ? WHERE user_id = ?', 
    [email, username, userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error updating user data.');
      }
    });

    res.redirect('/user/user-viewaccount')
});

app.delete('/user/delete-account', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;

  try {
    await db.promise().query('DELETE FROM farmsector WHERE user_id = ?', [userId]);
    await db.promise().query('DELETE FROM useraccount WHERE user_id = ?', [userId]);

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send({ success: false, message: 'Error logging out after account deletion.' });
      }
      res.clearCookie('connect.sid');
      res.status(200).send({ success: true, message: 'Account deleted successfully.' });
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).send({ success: false, message: 'Error deleting account.' });
  }
});



app.post("/add-sector", (req, res) => {
  const { sector_name, description } = req.body;

  if (!sector_name || !description || sector_name.length > 50 || description.length > 255) {
    req.flash("error", "Invalid input. Please ensure all fields are filled correctly.");
    return res.redirect("/user/home");
  }

  const user_id = req.session.user?.user_id;

  db.query("INSERT INTO farmsector (sector_name, user_id, description) VALUES (?, ?, ?)", 
    [sector_name.trim(), user_id, description.trim()],
    (err) => {
      if (err) {
        console.error(err);
        req.flash("error", "Failed to add sector.");
        return res.redirect("/user/home");
      }
      req.flash("success", "Sector added successfully!");
      res.redirect("/user/home");
    }
  );
});

app.get('/user/get-sector/:id', isAuthenticated, (req, res) => {
  const sectorId = req.params.id;

  db.query('SELECT * FROM farmsector WHERE sector_id = ?', [sectorId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ success: false, message: 'Database error occurred' });
    }

    if (results.length === 0) {
      return res.status(404).send({ success: false, message: 'Sector not found' });
    }

    const sector = results[0];
    res.json({ success: true, sector });
  });
});

app.post('/edit-sector/:id', isAuthenticated, (req, res) => {
  const sectorId = req.params.id;
  const { sector_name, description } = req.body;

  const query = `
    UPDATE farmsector 
    SET sector_name = ?, description = ? 
    WHERE sector_id = ?
  `;

  db.query(query, [sector_name, description, sectorId], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }
    req.flash("success", "Sector updated successfully!");
    res.redirect(`/user/home`);
  });
});

app.delete('/user/delete-sector/:id', isAuthenticated, (req, res) => {
  const sector_id = req.params.id;
  db.query('DELETE FROM farmsector WHERE sector_id = ?', [sector_id], (err) => {
    if (err) {
      console.error('Error deleting sector:', err);
      return res.status(500).send({ success: false, message: 'Error deleting sector' });
    }
    res.send({ success: true });
  });
});

app.get('/user/user-viewsector/:id', isAuthenticated, (req, res) => {
  const sectorId = req.params.id;

  db.query('SELECT * FROM farmsector WHERE sector_id = ?', [sectorId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      return res.status(404).send('Sector not found');
    }

    const sector = results[0];

    db.query('SELECT * FROM batch WHERE sector_id = ?', [sectorId], (err, batches) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error occurred');
      }

      if (batches.length === 0) {
        return res.render('user/user', {
          title: 'View Sector',
          body: 'user-viewsector',
          sector: sector,
          batches: [],
        });
      }

      const batchIds = batches.map(batch => batch.batch_id);
      console.log("Batch IDs:", batchIds);

      const tasselCountQuery = `
        SELECT batch_id, SUM(tassel_count) AS total_tassel_count 
        FROM image 
        WHERE batch_id IN (?)
        GROUP BY batch_id
      `;

      db.query(tasselCountQuery, [batchIds], (err, tasselCounts) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Database error occurred while fetching tassel counts');
        }

        const batchData = batches.map(batch => {
          const tasselData = tasselCounts.find(tc => Number(tc.batch_id) === Number(batch.batch_id));
          return {
            ...batch,
            total_tassel_count: tasselData ? tasselData.total_tassel_count : 0,
          };
        });        

        res.render('user/user', {
          title: 'View Sector',
          body: 'user-viewsector',
          sector: sector,
          batches: batchData,
        });
      });
    });
  });
});


app.get('/user/add-batch/:id', isAuthenticated, (req, res) => {
  const sectorId = req.params.id;
  
  res.render('user/user', {
    title: 'Create Batch',
    body: 'user-addbatch',
    sectorid: sectorId,
  });
});

//For Evan, with love <3
// const storage = new Storage();
// const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET); // Replace with your GCS bucket name

// const multerMiddleware = multer({
//   storage: multer.memoryStorage(), // Temporarily hold files in memory
//   limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
// });

// //ONLY TO SIMULATE MACHINE LEARNING FUNCTIONALITY, PLEASE DELETE IN A FUTURE DATE
// function mockMLProcessing(gcsUrl) {
//   const tasselCount = Math.floor(Math.random() * 100) + 1;
//   console.log(`Processing image at ${gcsUrl}: Tassel Count = ${tasselCount}`);
//   return tasselCount;
// }

// const uploadToGCS = (file) => {
//   return new Promise((resolve, reject) => {
//     const blob = bucket.file(Date.now() + '-' + file.originalname);
//     const blobStream = blob.createWriteStream({
//       resumable: false,
//       contentType: file.mimetype,
//     });

//     blobStream.on('error', (err) => reject(err));
//     blobStream.on('finish', () => {
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//       console.log(`File uploaded to GCS: ${publicUrl}`);
//       resolve(publicUrl);
//     });

//     blobStream.end(file.buffer);
//   });
// };

// // POST Route: Add Batch
// app.post('/user/add-batch', isAuthenticated, multerMiddleware.array('images', 10), // Accept up to 10 images
//   async (req, res) => {
//     const { name } = req.body;
//     const sectorId = req.query.sectorId;

//     if (!name || !req.files || req.files.length === 0) {
//       console.log(sectorId, name);
//       return res.redirect(`/user/add-batch/${sectorId}`);
//     }

//     const batchQuery = 'INSERT INTO batch (sector_id, name) VALUES (?, ?)';
//     db.query(batchQuery, [sectorId, name], async (err, result) => {
//       if (err) {
//         console.error('Error inserting batch:', err);
//         req.flash('error', 'Failed to create batch.');
//         return res.redirect(`/user/user-viewsector/${sectorId}`);
//       }

//       const batchId = result.insertId;

//       try {
//         //Process files one by one
//         const uploadPromises = req.files.map(async (file) => {
//           const gcsUrl = await uploadToGCS(file); //Upload file to Google Cloud Storage
//           const tasselCount = mockMLProcessing(gcsUrl); //Simulate ML Processing

//           // Insert image record into the database
//           const imageQuery = `
//             INSERT INTO image (batch_id, filename, tassel_count)
//             VALUES (?, ?, ?)
//           `;
//           return new Promise((resolve, reject) => {
//             db.query(imageQuery, [batchId, gcsUrl, tasselCount], (err) => {
//               if (err) return reject(err);
//               resolve();
//             });
//           });
//         });

//         await Promise.all(uploadPromises);

//         console.log('success', 'Batch created and images processed successfully!');
//         res.redirect(`/user/user-viewsector/${sectorId}`);
//       } catch (uploadError) {
//         console.error('Error uploading files:', uploadError);
//         req.flash('error', 'Failed to upload files.');
//         res.redirect(`/user/user-viewsector/${sectorId}`);
//       }
//     });
//   }
// );

// Local, do not touch
// ONLY TO SIMULATE MACHINE LEARNING FUNCTIONALITY, PLEASE DELETE IN A FUTURE DATE
function mockMLProcessing(filePath) {
  const tasselCount = Math.floor(Math.random() * 100) + 1;
  console.log(`Processing image at ${filePath}: Tassel Count = ${tasselCount}`);
  return tasselCount;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.post('/user/add-batch', isAuthenticated, upload.array('images', 10), (req, res) => {
  const { name } = req.body;
  const sectorId = req.query.sectorId;

  if (!name || !req.files || req.files.length === 0) {
    console.log(sectorId, name);
    return res.redirect(`/user/add-batch/${sectorId}`);
  }
  
  const batchQuery = 'INSERT INTO batch (sector_id, name) VALUES (?, ?)';
  db.query(batchQuery, [sectorId, name], (err, result) => {
    if (err) {
      console.error('Error inserting batch:', err);
      req.flash('error', 'Failed to create batch.');
      return res.redirect(`/user/user-viewsector/${sectorId}`);
    }

    const batchId = result.insertId;

    const imageQueries = req.files.map((file) => {

      const tasselCount = mockMLProcessing(file.path); // Simulate ML processing
      return new Promise((resolve, reject) => {
        const imageQuery = `
          INSERT INTO image (batch_id, filename, tassel_count)
          VALUES (?, ?, ?)
        `;
        db.query(imageQuery, [batchId, file.filename, tasselCount], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    Promise.all(imageQueries)
      .then(() => {
        console.log('success', 'Batch created and images processed successfully!');
        res.redirect(`/user/user-viewsector/${sectorId}`);
      })
      .catch((err) => {
        console.error('Error processing images:', err);
        console.log('error', 'Failed to process images.');
        res.redirect(`/user/user-viewsector/${sectorId}`);
      });
  });
});

app.post('/user/delete-batch/:id', isAuthenticated, (req, res) => {
  const batchId = req.params.id;

  const deleteBatchQuery = 'DELETE FROM batch WHERE batch_id = ?';

  db.query(deleteBatchQuery, [batchId], (err, result) => {
    if (err) {
      console.error("Error deleting batch:", err);
      return res.status(500).send('Failed to delete batch.');
    }

    console.log(`Batch ${batchId} and associated images deleted successfully.`);
    res.redirect('back');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.redirect('/login?error=Logout failed');
    }
    res.redirect('/login?success=You have logged out successfully');
  });
});

app.get('/:username', isAuthenticated, (req, res) => {
  const username = req.params.username;

  db.query('SELECT * FROM useraccount WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('User not found');
    }
    const user = results[0];
    res.render('user/user', { title: `Welcome, ${username}`, user });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
