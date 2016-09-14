var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

require('./config/middleware.js')(app, express);
require('./config/routes.js')(app, express);

var pg = require('pg');

pg.defaults.ssl = true;
pg.connect(process.env.DATABSE_URL, function(err, client) {
  if (err) {
    console.log('error connection pg: ', err)
  }
  console.log('connected pg! changes');
})

app.listen(port, function(){
  console.log("Listening on port " + port);
})

