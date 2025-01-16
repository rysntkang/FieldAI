const express = require('express');
const path = require('path');
const session = require('express-session');
// Routes
const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(logger);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
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

// Routes
app.use('/', pagesRouter);
app.use('/', authRouter);
app.use('/', adminRouter);
app.use('/', userRouter);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
