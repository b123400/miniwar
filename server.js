var express = require('express');
var app = express();
var http = require('http').Server(app);
var Lobby = require('./lobby');

var io = require('socket.io')(http);
io.on('connection', function(socket){
  console.log('a user connected');
});

Lobby(io);

app.get('/', function(req, res){
  res.redirect('/lobby.html')
});

app.use(express.static('client'));

http.listen(3000, function(){
  console.log('listening on *:3000');
});