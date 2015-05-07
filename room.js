var uuid = require('node-uuid');

var Room = function (name, lobby, io) {
  this.name = name;
  this.currentPlayerCount = 0;
  this.playerCount = 2; // target player count
  this.sockets = [];
  this.items = {};
  this.io = io;

  var _this = this;
  io.on('connection', function(socket){
    _this.sockets.push(socket);

    // When there is enough players
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
          },
          hp : 100
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

    // When this player is gone
    socket.on('disconnect', function () {
      _this.sockets.splice(_this.sockets.indexOf(socket), 1); // remove this socket
      // When everyone is gone
      if (_this.sockets.length == 0) {
        io.emit('end');
        lobby.removeRoom(_this);
      }
    });


    // This player wants to deploy something
    var lastDeploy = null;
    socket.on('deploy', function (options) {
      var now = Date.now();
      if (now - lastDeploy < 3000) return; // prevent deploy within 3 seconds
      lastDeploy = now;

      options = _this.createItem(options, socket);

      io.emit('deploy', options);
    });

    // This player wants to attack another player
    var lastAttackRecords = {}; // uuid : Date
    socket.on('attack', function (options) {
      // console.log("attacker ", options.itemID, "target", options.targetID);

      var attacker = _this.items[options.itemID];
      var target = _this.items[options.targetID];

      var lastAttack = lastAttackRecords[attacker.uuid];

      // ignore too-frequent attack
      // 0.1 second less because there maybe delay
      if (lastAttack != null && Date.now() - lastAttack < 900) return;

      // block fake attacker / target
      if (!attacker || !target) return;

      // you cannot control others' soldier to attack
      if (attacker.owner !== socket.id) return;

      /*
      // Not implemented yet, because we have not confirmed soldier types and value
      //prevent fake-damgage attack
      if (attacker.maximumDamage < options.damage) return;
      */

      // Ok now we can attack

      io.emit('attack', options);
      lastAttackRecords[options.itemID] = Date.now();

      // Update the target's hp
      target.hp -= Number(options.damage);
      if (target.hp <= 0) {
        // target should die
        _this.destroyItem(target);
      }
    });

  });
}

Room.prototype.createItem = function (options, ownerSocket) {
  var thisID = uuid.v4();
  this.items[thisID] = options;
  options.uuid = thisID;
  options.owner = ownerSocket.id;
  return options;
}

Room.prototype.destroyItem = function (item) {
  this.io.emit("destroy", {
    itemID : item.uuid
  });
  delete this.items[item.uuid];
}

Room.prototype.toJSON = function(){
  return {
    name: this.name,
    isPlaying: this.sockets.length == this.playerCount
  };
}

module.exports = Room;