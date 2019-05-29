var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('connect-flash');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var dashboardRouter = require('./routes/dashboard');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', require('express-ejs-extend')); // ejs-extend add this line
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret : 'mysupercat',
  resave : true,
  saveUninitialized : true 
}))
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 這邊要放一個登入的 middleware，要登入才能進入 dashboard 

app.use('/dashboard', dashboardRouter);


// 如果上面的路由（首頁, users, dashboard）找不到
// catch 404 and forward to error handler

app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
// 是因為 跑app.js 所以如果有 error 就直接跳這嗎？
// error 是不是要分成兩個路徑 user 和 dashboard

app.use(function(err, req, res, next) {
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    title : 'error'
  });
});

process.on('uncaughtException',function(error){
  console.log('UNCAUGHT EXCEPTION');
  console.log('Err message : ', error.message);
  console.log('Err Stack : ', error.stack);
})

module.exports = app;
