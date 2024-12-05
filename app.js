const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'secretkey', // Replace with a secure key
  resave: false,
  saveUninitialized: true,
}));

// Temporary Placeholder for user array (PLEASE REMOVE ONCE IMPLEMENTED)
let users = [
  { username: "testuser", password: "password123" } // Hardcoded user
];

const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.username) {
    // Redirect to login page without an error if the session is not set
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
  const error = req.query.error || null;
  res.render('index', { title: 'Login', page: 'login', error });
});

app.get('/register', (req, res) => {
  res.render('index', { title: 'Register', page: 'register' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.username = username;
    res.redirect(`/${username}`);
  } else {
    res.redirect('/login?error=Invalid credentials');
  }
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const existingUser = users.find(u => u.username === username);

  if (existingUser) {
    return res.redirect('/register?error=User already exists');
  }

  users.push({ username, password });
  res.redirect('/login?success=Registration successful');
});

app.get('/home', isAuthenticated, (req, res) => {
  if (req.session && req.session.username) {
    return res.redirect(`/${req.session.username}`);
  }
  res.redirect('/login');
});


app.get('/:username', isAuthenticated, (req, res) => {
  const username = req.params.username;

  if (req.session.username !== username) {
    // Redirect to login without appending unauthorized error
    return res.redirect('/login');
  }

  const user = users.find(u => u.username === username);
  if (user) {
    return res.render('user/user', { title: `Welcome, ${username}`, user });
  }

  res.status(404).send({ message: "User not found" });
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