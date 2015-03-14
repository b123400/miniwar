var Room = function (name, lobby, io) {
  this.name = name;
  this.currentPlayerCount = 0;
  this.playerCount = 2; // target player count
  this.sockets = [];
  this.items = {};

  var _this = this;
  io.on('connection', function(socket){
    _this.sockets.push(socket);

    if (_this.playerCount == _this.sockets.length) {
      lobby.roomStateChanged(_this);
      var castles = {};
      for (var i = _this.sockets.length - 1; i >= 0; i--) {
        var thisSocket = _this.sockets[i];
        castles[thisSocket.id] = _this.createItem({
          type : "castle",
          location : {
            x : i == 0? 0 : 500,
            y : 300
          },
          size: {
            width : 50,
            height : 50
          }
        }, thisSocket);
      }
      for (var i = _this.sockets.length - 1; i >= 0; i--) {
        var thisSocket = _this.sockets[i];
        thisSocket.emit("start",{
          playerCount : _this.sockets.length,
          playerID: thisSocket.id,
          targets : castles
        });
      }
    }

    socket.on('disconnect', function () {
      _this.sockets.splice(_this.sockets.indexOf(socket), 1); // remove this socket
      if (_this.sockets.length == 0) {
        io.emit('bye');
        lobby.removeRoom(_this);
      }
    });

    var lastDeploy = null;
    socket.on('deploy', function (options) {
      var now = Date.now();
      if (now - lastDeploy < 3000) return; // prevent deploy within 3 seconds
      lastDeploy = now;
      var thisIndex = _this.sockets.indexOf(socket);
      var color = thisIndex == 0 ? "red" : "blue";
      options.color = color;
      io.emit('deploy', options);
    });
  });
}

Room.prototype.createItem = function (options, ownerSocket) {
  var uuid = String(Math.random());
  this.items[uuid] = options;
  options.uuid = uuid;
  options.owner = ownerSocket.id;
  return options;
}

Room.prototype.toJSON = function(){
  return {
    name: this.name,
    isPlaying: this.sockets.length == this.playerCount
  };
}

module.exports = Room;