var express = require('express')
var app = module.exports = express()

app.use('/', require('./index'))
app.use('/url', require('./url'))
