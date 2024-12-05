const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Temporary Placeholder for user array (PLEASE REMOVE ONCE IMPLEMENTED)
let users = [
  { username: "testuser", password: "password123" } // Hardcoded user
];

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Features' , page: 'landing/features'});
  });
  
app.get('/pricing', (req, res) => {
    res.render('index', { title: 'Pricing', page: 'landing/pricing' });
});

app.get('/about', (req, res) => {
    res.render('index', { title: 'About', page: 'landing/about' });
});

app.get('/login', (req, res) => {
  res.render('index', { title: 'Login', page: 'login' });
});

app.get('/register', (req, res) => {
  res.render('index', { title: 'Register', page: 'register' });
});

/** Login Route */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simulate database check
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Redirect to the personalized user dashboard
    res.redirect(`/${username}`);
  } else {
    res.status(401).send({ message: "Invalid credentials" });
  }
});

/** Dynamic User Route */
app.get('/:username', (req, res) => {
  const username = req.params.username;

  // Simulate fetching user data from database
  const user = users.find(u => u.username === username);

  if (user) {
    res.render('user/user', { 
      title: `Welcome, ${username}`, 
      user 
    });
  } else {
    res.status(404).send({ message: "User not found" });
  }
});


/** Register Route */
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Check if user already exists
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    res.status(400).send({ message: "User already exists" });
    return;
  }

  // Add new user
  users.push({ username, password });
  res.status(201).send({ message: "Registration successful" });
});  
  
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
