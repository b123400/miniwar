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
    "wall" : 3
  };

  var _this = this;
  io.on('connection', function(socket){
    var thisPlayer = new Player(socket)
    _this.players.push(thisPlayer);

    // When there is enough players
    socket.on('ready', function () {
      thisPlayer.state = Player.STATE.READY;
      debugger;
      if (_this.playerCount == _this.getReadyPlayerCount()) {
        // everyone is ready
        lobby.roomStateChanged(_this);
        var castles = {};
        _this.players.forEach(function (thisPlayer, i){
          castles[thisPlayer.id] = _this.createItem({
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
      }
    });

    // When this player is gone
    socket.on('disconnect', function () {
      _this.players.splice(_this.players.indexOf(thisPlayer), 1); // remove this socket
      // When everyone is gone
      if (_this.players.length == 0) {
        io.emit('end');
        lobby.removeRoom(_this);
      }
    });


    // This player wants to deploy something
    // var lastDeploy = null;
    socket.on('deploy', function (options) {
      var now = Date.now();
      // if (now - lastDeploy < 3000) return; // prevent deploy within 3 seconds

      var money = thisPlayer.money;
      var currentMoney = money.lastValue + (Date.now() - money.lastConfirm)/1000 * money.increaseRate;
      var price = prices[options.type];
      if (price === undefined) return; // not recognized type
      if (price > currentMoney) return; // not enough money

      // if arrived here, can deploy
      money.lastValue = currentMoney - price;
      money.lastConfirm = Date.now();
      // lastDeploy = now;

      options = _this.createItem(options, thisPlayer);

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
      if (attacker.owner !== thisPlayer.id) return;

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
				io.emit('end', {winner: options.owner});
			}
      }
    });

  });
}

Room.prototype.createItem = function (options, owner) {
  var thisID = uuid.v4();
  this.items[thisID] = options;
  options.uuid = thisID;
  options.owner = owner.id;
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

Room.prototype.getReadyPlayerCount = function() {
  return this.getPlayerCount(Player.STATE.READY);
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
  ENDED : 3
};

module.exports = Room;