var Room = function (name, lobby, io) {
  this.name = name;
  this.currentPlayerCount = 0;
  this.playerCount = 2;
  var _this = this;
  io.on('connection', function(socket){
    _this.currentPlayerCount++;
    if (_this.playerCount == _this.currentPlayerCount) {
      lobby.roomStateChanged(_this);
      io.emit('start', {
        playerCount : _this.playerCount
      });
    }

    socket.on('disconnect', function(){
      _this.currentPlayerCount--;
      if (_this.currentPlayerCount == 0) {
        lobby.removeRoom(_this);
      }
    });
  });
}

Room.prototype.toJSON = function(){
  return {
    name: this.name,
    isPlaying: this.currentPlayerCount == this.playerCount
  };
}

module.exports = Room;