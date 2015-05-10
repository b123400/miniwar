var Stage = {
  baseStage : null, // for buttons
  mainStage : null, // for items
  renderer : null,
  allItems : [],
  money : 0,

  setup : function () {
    // You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
    this.renderer = new PIXI.autoDetectRecommendedRenderer(800, 700);

    document.getElementById("stage").appendChild(this.renderer.view);
    this.baseStage = new PIXI.Stage(0xffffff);

    var background = new PIXI.Sprite.fromImage("img/background.png");
    background.width = this.renderer.width;
    background.height = this.renderer.height;
    this.baseStage.addChild(background);

    this.mainStage = new PIXI.Stage(0xffffff);
    this.mainStage.x = 0;
    this.mainStage.y = 0;
    this.mainStage.width = 800;
    this.mainStage.height = 600;
    this.baseStage.addChild(this.mainStage);

    // money
    this.moneyLabel = new PIXI.Text("$0", {fill:'yellow'});
    this.moneyLabel.x = 0;
    this.moneyLabel.y = 660;
    this.moneyLabel.font = 'bold 20px Arial';
    this.moneyLabel.width = 200;
    this.moneyLabel.height = 80;
    this.baseStage.addChild(this.moneyLabel);

    // deploy buttons

    var itemsWithButton = [Soldier, Wall, 小明],
        lastX = 0,
        _this = this,
        selectedItemClass = null;

    itemsWithButton.forEach(function (itemClass) {
      var button = itemClass.createButtonSprite();
      button.x = lastX;
      button.y = 600;
      button.width = 50;
      lastX += button.width;
      button.mouseup = function() {
        selectedItemClass = itemClass;
      }
      _this.baseStage.addChild(button);
    });

    this.mainStage.mouseup = function (event) {
      if (!selectedItemClass) return;
      var options = selectedItemClass.objectForDeploy();
      var position = event.getLocalPosition(_this.mainStage);
      options.location.x = position.x;
      options.location.y = position.y;

      var price = prices[options.type];
      if (price === undefined || _this.money < price) {
        return;
      }
      // ok go
      _this.money -= price;
      _this.redrawMoneyLabel();
      Socket.deployItem(options);
    };

    var prices = {
      "soldier" : 3,
      "siuming" : 10,
      "wall" : 3
    };

    requestAnimationFrame(animate);

    function animate() {
        _this.renderer.render(_this.baseStage);
        requestAnimationFrame(animate);
    }
  },

  redrawMoneyLabel : function () {
    this.moneyLabel.setText("$"+this.money);
  },

  // should be called only by socket
  addItem : function (options) {
    var item = (options instanceof Item) ? options : this.itemFromOptions(options);
    this.mainStage.addChild(item.getSprite());
    Stage.allItems.push(item);
    item.animateSprite();
    return item;
  },

  removeItem : function (item) {
    var _this = this;
    var index = Stage.allItems.indexOf(item);
    if (index >= 0) {
      Stage.allItems.splice(index, 1);
    }
    return function(){
      _this.mainStage.removeChild(item.getSprite());
    };
  },

  removeAllItems : function () {
    var _this = this;
    Stage.allItems.forEach(function (item) {
      item.stopAnimation = true;
      _this.mainStage.removeChild(item.getSprite());
    });
    Stage.allItems = [];
  },

  findItemById : function (targetID) {
    for (var i = Stage.allItems.length - 1; i >= 0; i--) {
      var thisItem = Stage.allItems[i];
      if (thisItem.uuid === targetID) {
        return thisItem;
      }
    }
  },

  collisionItemsForItem : function (item, location, size) {
    return this.allItems.filter(function(thisItem){
      if (item == thisItem) return false; // don't count self
      // return true if crashing
      return item.collide(thisItem);
    });
  },

  itemFromOptions : function (options) {
    switch (options.type) {
      case "soldier":
        return new Soldier(options);
      case "wall":
        return new Wall(options);
      case "castle":
        return new Castle(options);
  	  case "siuming":
    		return new 小明(options);
        break;
    }
    return undefined;
  }
};

var Socket = (function(){
  var STATE = {
    NOT_CONNECTED : 0,
    NOT_READY : 1,
    READY : 2,
    PLAYING : 3,
    ENDED : 4
  };
  var getPlayerID = function () {
    return localStorage[urlParams['name']]
  };

  var currentState = STATE.NOT_CONNECTED;
  var socket;
  return {
    setup : function (_socket) {
      var _this = this;
      socket = _socket;
      currentState = STATE.NOT_READY;
      socket.on('start', function (options) {
        document.getElementById('status').innerHTML = "Start. player count: " + options.playerCount;
        currentState = STATE.PLAYING;

        setInterval(function () {
          Stage.money += 5;
          Stage.redrawMoneyLabel();
        }, 1000);

        for (var id in options.targets) {
          var castle = Stage.itemFromOptions(options.targets[id]);
          var newPlayer = new Player(id, castle);
          if (newPlayer.id == options.playerID) {
            Player.me = newPlayer;
          }
        }

        // for restore
        _this.rememberPlayerID(options.playerID);

        for (var key in Player.allPlayers) {
          Stage.addItem(Player.allPlayers[key].castle); // add to stage;
        }

      });

      socket.on('end', function () {

      });

      socket.on('sync', function (options) {

        Stage.removeAllItems();
        
        var castles = [];
        var nonCastleItems = [];
        options.items.forEach(function (item) {
          if (item.type === "castle") {
            castles.push(item);
          } else {
            nonCastleItems.push(item);
          }
        });

        // restore castle first
        castles.forEach(function (castle) {
          Object
          .keys(Player.allPlayers)
          .map(function (p) { return Player.allPlayers[p]; })
          .filter(function (p) { return p.castle.uuid === castle.uuid })
          [0]
          .castle = Stage.addItem(castle);
        });
        // then restore other items
        nonCastleItems.forEach(function (item) {
          Stage.addItem(item);
        });

        Stage.money = options.money;
      });

      socket.on('deploy', function (options) {
        Stage.addItem(options);
      });

      socket.on('attack', function (options) {
        var thisItem = Stage.findItemById(options.targetID);
        thisItem.applyDamage(options.damage);
      });

      socket.on("destroy", function (options) {
        var thisItem = Stage.findItemById(options.itemID);
        var removeFromStage = Stage.removeItem(thisItem);
        thisItem.destroy(function(){
          removeFromStage();
        });
      });
    },

    ready : function () {
      if (currentState != STATE.NOT_READY) {
        console.log('wrong state');
        return;
      }
      currentState = STATE.READY;
      socket.emit('ready', {playerID : getPlayerID()});
      document.getElementById('status').innerHTML = "Waiting for opponent";
    },

    rememberPlayerID : function (playerID) {
      localStorage[urlParams['name']] = playerID;
    },

    deployItem : function (options) {
      socket.emit("deploy", options);
    },

    attackItem : function (attacker, otherItem, damage) {
      // console.log("attacker ", attacker.uuid, " target ", otherItem.uuid);
      socket.emit("attack", {
        itemID: attacker.uuid,
        targetID: otherItem.uuid,
        damage: damage
      });
    }
  };
})();

(function(){
  var socket = io(':3000/room/'+urlParams['name']);
  Stage.setup();
  Socket.setup(socket);

  document.getElementById('readyButton').addEventListener('click', function (e) {
    e.preventDefault();
    Socket.ready();
  });
})();