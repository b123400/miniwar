var uuid = require('node-uuid');

var Room = function (name, lobby, io) {
  this.name = name;
  this.currentPlayerCount = 0;
  this.playerCount = 2; // target player count
  this.players = [];
  this.items = {};
  this.io = io;

  var prices = {
    "soldier" : 3,
    "siuming" : 10,
    "wall" : 3,
    "tower": 10
  };

  var _this = this;
  io.on('connection', function(socket){
    var thisPlayer = new Player(socket)
    _this.players.push(thisPlayer);

    // When there is enough players
    socket.on('ready', function (options) {
      thisPlayer.state = Player.STATE.READY;

      if (options.playerID) {
        // trying to restore as another user
        var existingPlayer = _this.players.filter(function (p){
          return p.state === Player.STATE.RECONNECTING &&
            p.id === options.playerID;
        })[0];
        if (existingPlayer) {
          thisPlayer.id = existingPlayer.id;
          thisPlayer.money = existingPlayer.money;
          thisPlayer.castle = existingPlayer.castle;
          _this.players.splice(_this.players.indexOf(existingPlayer), 1); // remove the old player
          thisPlayer.state = Player.STATE.PLAYING;
          // restart game
          thisPlayer.socket.emit('start', {
            playerCount : _this.players.length,
            playerID : thisPlayer.id,
            targets : _this.getCastles()
          })
          // sync all players
          _this.syncAllPlayers();
          lobby.roomStateChanged(_this);
          return;
        }
      }

      if (_this.playerCount == _this.getReadyPlayerCount()) {
        // everyone is ready
        var castles = {};
        _this.players.forEach(function (thisPlayer, i){
          thisPlayer.state = Player.STATE.PLAYING;
          castles[thisPlayer.id] = thisPlayer.castle = _this.createItem({
            type : "castle",
            owner : thisPlayer.id,
            location : {
              x : i == 0? 0 : 500,
              y : 300
            },
            size: {
              width : 50,
              height : 50
            },
            hp : 100,
            fullHp : 100
          }, thisPlayer);
        });
        _this.players.forEach(function (thisPlayer){
          thisPlayer.money.lastConfirm = Date.now();
          thisPlayer.socket.emit("start",{
            playerCount : _this.players.length,
            playerID: thisPlayer.id,
            targets : castles
          });
        });
        lobby.roomStateChanged(_this);
      }
    });

    // When this player is gone
    socket.on('disconnect', function () {
      if (thisPlayer.state === Player.STATE.PLAYING) {
        thisPlayer.state = Player.STATE.RECONNECTING;
      } else {
        _this.players.splice(_this.players.indexOf(thisPlayer), 1); // remove this player
      }
      // When everyone is gone
      if (_this.players.length == 0 || _this.players.length == _this.getPlayerCount(Player.STATE.RECONNECTING)) {
        lobby.removeRoom(_this);
      }
      lobby.roomStateChanged(_this);
    });

    // This player wants to deploy something
    var lastDeploy = null;
    socket.on('deploy', function (options) {
      if (thisPlayer.state !== Player.STATE.PLAYING) return;

      var now = Date.now();
      if (lastDeploy == null || now - lastDeploy >= 3000) {
        lastDeploy = Date.now();
      } else {
        return; // prevent deploy within 3 seconds
      }

      var price = prices[options.type];
      if (price === undefined) return; // not recognized type
      thisPlayer.updateMoney();
      if (price > thisPlayer.money.lastValue) return; // not enough money

      // if arrived here, can deploy
      thisPlayer.money.lastValue -= price;

      options = _this.createItem(options, thisPlayer);

      io.emit('deploy', options);
    });

    // This player wants to attack another player
    var lastAttackRecords = {}; // uuid : Date
    socket.on('attack', function (options) {
      // console.log("attacker ", options.itemID, "target", options.targetID);

      if (thisPlayer.state !== Player.STATE.PLAYING) return;

      var attacker = _this.items[options.itemID];
      var target = _this.items[options.targetID];

      var lastAttack = lastAttackRecords[attacker.uuid];

      // ignore too-frequent attack
      // 0.1 second less because there maybe delay
      if (lastAttack != null && Date.now() - lastAttack < 900) return;

      // block fake attacker / target
      if (!attacker || !target) return;

      // you cannot control others' soldier to attack
      if (attacker.owner !== thisPlayer.id) return;

      if (!(attacker.location.x === options.location.x &&
            attacker.location.y === options.location.y)) {
        // location changed
        var distance = Math.sqrt(
          Math.pow(attacker.location.x - options.location.x, 2) +
          Math.pow(attacker.location.y - options.location.y, 2)
        );
        var maxPossibleDistance = (Date.now() - attacker.lastUpdate) / 1000 * attacker.speed;
        if (maxPossibleDistance < distance) {
          // cannot move that fast
          return;
        } else {
          attacker.lastUpdate = Date.now();
          attacker.location = options.location;
        }
      }

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
        if(target.type == "castle"){
          _this.players.forEach(function(p){
            p.state = Player.STATE.ENDED
          });
          io.emit('end', {winner: attacker.owner});
          lobby.removeRoom(_this);
        }
      }
    });

    socket.on('update', function (options) {
      var item = _this.items[options.item];
      if (item.owner !== thisPlayer.id) return;
      for (var key in options) {
        if (key === "location") {
          var distance = Math.sqrt(
            Math.pow(item.location.x - options.location.x, 2) +
            Math.pow(item.location.y - options.location.y, 2)
          );
          var maxPossibleDistance = (Date.now() - item.lastUpdate) / 1000 * item.speed;
          if (maxPossibleDistance > distance) {
            item[key] = options[key];
          }
          continue;
        } else if (key === 'hp') {
          continue;
        }
        item[key] = options[key];
      }
    });

  });
}

Room.prototype.createItem = function (options, owner) {
  var thisID = uuid.v4();
  this.items[thisID] = options;
  options.uuid = thisID;
  options.owner = owner.id;
  options.lastUpdate = Date.now();
  return options;
};

Room.prototype.destroyItem = function (item) {
  this.io.emit("destroy", {
    itemID : item.uuid
  });
  delete this.items[item.uuid];
};

Room.prototype.getPlayerCount = function (state) {
  return state === undefined?
    this.players.length :
    this.players.filter(function (player) {
      return player.state === state
    }).length;
}

Room.prototype.getReadyPlayerCount = function () {
  return this.getPlayerCount(Player.STATE.READY);
}

Room.prototype.getCastles = function () {
  var castles = {};
  var _this = this;
  this.players.forEach(function (player) {
    castles[player.id] = player.castle;
  });
  return castles;
}

Room.prototype.syncAllPlayers = function () {
  var _this = this;
  this.players.forEach(function (player) {
    player.socket.emit('sync', _this.syncDataForPlayer(player))
  });
}

Room.prototype.syncDataForPlayer = function (player) {
  player.updateMoney();
  var _this = this;
  return {
    items : Object.keys(this.items).map(function(k, arr) { return _this.items[k] }),
    money : Math.floor(player.money.lastValue)
  };
}

Room.prototype.toJSON = function(){
  return {
    name: this.name,
    isPlaying: this.getPlayerCount(Player.STATE.PLAYING) == this.playerCount
  };
};

var Player = function (socket) {
  this.id = uuid.v4();
  this.state = Player.STATE.NOT_READY;
  this.socket = socket;
  this.money = {
    lastConfirm : null,
    lastValue : 0,
    increaseRate : 5, // per second
  };
};

Player.STATE = {
  NOT_READY : 0,
  READY : 1,
  PLAYING : 2,
  RECONNECTING : 3,
  ENDED : 4
};

Player.prototype.updateMoney = function () {
  this.money.lastValue = (Date.now() - this.money.lastConfirm) / 1000 * this.money.increaseRate;
  this.money.lastConfirm = Date.now();
}

module.exports = Room;