const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const db = require('./config/connection')
const session = require('express-session')
const hbs = require('express-handlebars')
var fileUpload = require('express-fileupload')
const Swal = require('sweetalert2');
require('dotenv').config()
console.log(process)



// Routes
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
//app.engine('hbs',hbs.engine({extname:'hbs',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
app.engine('hbs',hbs.engine({helpers:{
  total: (quant, price) => {
    return quant * price;
  },
  subtotal:(totalAmount,delivery)=>{
    return totalAmount + delivery 

  },
  isEqual :(a, b, options)=>{
    if(a == b){
      return options.fn(this)
    }
    return options.inverse(this)
  },
  quantityShowing:(quantity,index)=>{
    return quantity[index]
  },
  quantitymulty:(quantity,index,price)=>{
    return quantity[index]*price
  }
},extname:'hbs',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
/*
app.engine('hbs',hbs.engine({helpers:{
  inc: function (value, options){
    return parseInt(value) +1;
  },
  eq: function (v1,v2) {return v1 === v2;},
gt: function (v1,v2) {return v1 > v2;},
ne: function (v1, v2) { return v1 !== v2; },
lt: function (v1, v2) { return v1 < v2; },
lte: function (v1, v2) { return v1 <= v2; },
gte: function (v1, v2) { return v1 >= v2; },
and: function (v1, v2) { return v1 && v2; },
or: function (v1, v2) { return v1 || v2; }
},extname:'hbs',layoutsDir:_dirname+'/views/layout/',partialsDir:_dirname+'/views/partials/'}))
*/
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret:"key",resave: true,saveUninitialized: true,cookie:{maxAge:600000}}))
app.use(function(req, res, next) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

app.use(fileUpload())



// Database 
db.connect((err)=>{
  if(err) console.log("connection error"+err);
  else
  console.log("Database connected successfully")
})


app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('users/error',{layout:'user-layout'});
});

module.exports = app;
