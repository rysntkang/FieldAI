const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
require('dotenv').config();
var MemcachedStore = require('connect-memcached')(session);

const app = express();
const PORT = 8080;

const dbConfig = process.env.INSTANCE_UNIX_SOCKET
  ? {   // Cloud SQL Configuration for Google Cloud
      socketPath: process.env.INSTANCE_UNIX_SOCKET,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    }
  : {   // Local Development Configuration
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'sqladmin',
      password: process.env.DB_PASS || 'Slc223311',
      database: process.env.DB_NAME ||'fieldaiDB',
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
  console.log('Session Data:', req.session);
  next();
});

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user) {
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
  res.render('index', { title: 'Register', page: 'register' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Look up the user in the database
  db.query('SELECT * FROM useraccount WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error occurred');
    }

    if (results.length === 0) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    const user = results[0];

    // Compare the hashed password using bcryptjs
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }

    // Set session or token
    req.session.user = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    res.redirect(`/home`);
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

  const query = 'SELECT user_id, username, role FROM useraccount WHERE user_id != ?';
  try {
    const [users] = await db.promise().query(query,[req.session.user.user_id]);
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


app.get('/:username', isAuthenticated, (req, res) => {
  const username = req.params.username;

  if (req.session.user.username !== username) {
    return res.redirect('/login');
  }

  db.query('SELECT * FROM useraccount WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('User not found');
    }
    const user = results[0];
    res.render('user/user', { title: `Welcome, ${username}`, user });
  });
});

app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  // Check if the username or email already exists
  db.query(
    'SELECT * FROM useraccount WHERE email = ? OR username = ?',
    [email, username],
    async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error occurred');
      }

      if (results.length > 0) {
        return res.status(400).send('Email or username already exists');
      }

      // Hash the password using bcryptjs
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert the new user into the database with the default role as "user"
      const sql = 'INSERT INTO useraccount (email, username, password, role) VALUES (?, ?, ?, ?)';
      db.query(sql, [email, username, hashedPassword, 'user'], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Registration failed');
        }

        // Redirect to the login page with a success message
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
      });
    }
  );
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

app.post('/edit-sector', (req, res) => {
  const { sectorId, sectorName, sectorDescription } = req.body;

  const query = `
    UPDATE farmsector 
    SET sector_name = ?, description = ? 
    WHERE sector_id = ?
  `;

  db.query(query, [sectorName, sectorDescription, sectorId], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }
    res.json({ success: true });
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


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.redirect('/login?error=Logout failed');
    }
    res.redirect('/login?success=You have logged out successfully');
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
