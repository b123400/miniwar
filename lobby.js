var playerCount = 0;
var roomCount = 0;
var rooms = [];
var Room = require('./room')

Lobby = function (rootIo) {
  var io = rootIo.of('/lobby');

  io.on('connection', function(socket){

    playerCount++;
    io.emit('count', playerCount);
    socket.emit('rooms', allRooms());

    socket.on('disconnect', function(){
      playerCount--;
      io.emit('count', playerCount);
    });

    socket.on('newRoom', function() {
      var name = "Room no."+roomCount;
      roomCount++;
      rooms.push(new Room(name, Lobby, rootIo.of('/room/'+name)));

      socket.emit('createdRoom', name); // to the room creater
      socket.broadcast.emit('rooms', allRooms()); // to everyone else
    });
  });

  function allRooms() {
    return rooms.filter(function(r){
      return !r.toJSON().isPlaying;
    });
  }

  Lobby.removeRoom = function(room) {
    var index = rooms.indexOf(room);
    if (index != -1) {
      rooms.splice(index, 1);
      io.emit('rooms', allRooms());
    }
  }

  Lobby.roomStateChanged= function() {
    io.emit('rooms', allRooms());
  }
}

module.exports = Lobby;