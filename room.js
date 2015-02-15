var Room = function (name, lobby, io) {
  this.name = name;
  this.currentPlayerCount = 0;
  this.playerCount = 2; // target player count
  this.sockets = [];
  var _this = this;
  io.on('connection', function(socket){
    _this.sockets.push(socket);

    if (_this.playerCount == _this.sockets.length) {
      lobby.roomStateChanged(_this);
      io.emit('start', {
        playerCount : _this.playerCount
      });
    }

    socket.on('disconnect', function () {
      _this.sockets.splice(_this.sockets.indexOf(socket), 1); // remove this socket
      if (_this.sockets.length == 0) {
        io.emit('bye');
        lobby.removeRoom(_this);
      }
    });

    var lastDeploy = null;
    socket.on('deploy', function () {
      var now = Date.now();
      if (now - lastDeploy < 3000) return; // prevent deploy within 3 seconds
      lastDeploy = now;
      var thisIndex = _this.sockets.indexOf(socket);
      var color = thisIndex == 0 ? "red" : "blue";
      io.emit('deploy', {color:color});
    });
  });
}

Room.prototype.toJSON = function(){
  return {
    name: this.name,
    isPlaying: this.sockets.length == this.playerCount
  };
}

module.exports = Room;