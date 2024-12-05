const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

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

  
  
  

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
