const express = require('express');
const path = require('path');
const session = require('express-session');

const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
const logger = require('./middleware/logger');
var MemcachedStore = require('connect-memcached')(session);
const app = express();
app.use(logger);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session(
    process.env.INSTANCE_UNIX_SOCKET ?{
      secret: 'testsecret',
      key: 'test',
      proxy: 'true',
      store: new MemcachedStore({
          hosts: [process.env.MEMCACHE_URL || '10.25.128.3:11211']
    })
    }
    :{
      secret: 'secretkey',
      resave: false,
      saveUninitialized: true,
    }
));

app.use('/', pagesRouter);
app.use('/', authRouter);
app.use('/', adminRouter);
app.use('/', userRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
