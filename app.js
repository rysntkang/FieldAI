const express = require('express');
const path = require('path');
// Routes
const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(logger);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', pagesRouter);
app.use('/', authRouter);


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
