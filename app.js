const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const config = require('./config/config');
const db = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(flash());

app.use((req, res, next) => {
  next();
});

// Routes
app.use('/', require('./routes/launchRoute'));
app.use('/', require('./routes/authRoute'));

// Start Server
app.listen(config.PORT, () => {
  console.log(`Server is running at http://localhost:${config.PORT}`);
});
