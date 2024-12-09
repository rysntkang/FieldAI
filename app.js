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
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
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

// Temporary Placeholder for user array (PLEASE REMOVE ONCE IMPLEMENTED)
let users = [
  { username: "testuser", password: "password123" } // Hardcoded user
];

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
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
  res.render('user/user', {
    title: 'Home',
    body: 'userhome',
    user: req.session.user
  });
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

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.redirect('/login?error=Logout failed'); // Only use error for actual failures
    }
    res.redirect('/login?success=You have logged out successfully'); // Provide a success message
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
