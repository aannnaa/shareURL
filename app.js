var express = require('express')
var path = require('path')
var http = require("http")
var mongoose = require('mongoose')
var config = require('./config')

var app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.set('json spaces', 2);
app.use(express.static(__dirname + '/public'))

app.use('/', require('./routes/v1'))

mongoose.Promise = Promise;
mongoose.connect(config.mongo.dbUrl, function(err) {
    if(err) throw err;
});

var server = http.createServer(app);
server.listen(1111);

app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})


if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    return res.json({status: 'error', message: err.message})
  })
}

app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  return res.json({status: 'error', message: err.message})
})

module.exports = app
