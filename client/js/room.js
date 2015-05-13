var Stage = {
  baseStage : null, // for buttons
  mainStage : null, // for items
  renderer : null,
  allItems : [],
  money : 0,
  coolDownSec : 3,
  prices: {
	"soldier" : 3,
	"siuming" : 10,
	"wall" : 3,
	"tower": 10
  },

  setup : function () {
    // You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
    this.renderer = new PIXI.autoDetectRecommendedRenderer(800, 700);

    document.getElementById("stage").appendChild(this.renderer.view);
    this.baseStage = new PIXI.Stage(0xffffff);

    var bgtexture = PIXI.Texture.fromImage("img/Floor.png");
    var background = new PIXI.TilingSprite(bgtexture, this.renderer.width, this.renderer.height);
    background.width = this.renderer.width;
    background.height = this.renderer.height;
    background.tileScale.x = 1;
    background.tileScale.y = 1;
    this.baseStage.addChild(background);

    this.mainStage = new PIXI.Stage(0xffffff);
    this.mainStage.x = 0;
    this.mainStage.y = 0;
    this.mainStage.width = 800;
    this.mainStage.height = 600;
    this.baseStage.addChild(this.mainStage);
    
    // cool-down indicator
    this.coolDownLabel = new PIXI.Text("", {fill:'yellow'});
    this.coolDownLabel.x = 100;
    this.coolDownLabel.y = 650;
    this.coolDownLabel.font = 'bold 30px Arial';
    this.coolDownLabel.width = 200;
    this.coolDownLabel.height = 100;
    this.baseStage.addChild(this.coolDownLabel);

    // money
    this.moneyLabel = new PIXI.Text("$0", {fill:'yellow'});
    this.moneyLabel.x = this.renderer.width - 100;
    this.moneyLabel.y = 650;
    this.moneyLabel.font = 'bold 30px Arial';
    this.moneyLabel.width = 200;
    this.moneyLabel.height = 100;
    this.baseStage.addChild(this.moneyLabel);
    
    // current selected item
    var selectedItemLabel = null;

    // deploy buttons

    var itemsWithButton = [{class:Soldier, type:"soldier"}, 
                           {class:Wall, type:"wall"}, 
                           {class:小明, type:"siuming"},
                           {class:Tower,type:"tower"}],
        lastX = 200,
        _this = this,
        selectedItemClass = null;


    itemsWithButton.forEach(function (itemClass) {
      var button = itemClass.class.createButtonSprite();
      button.x = lastX;
      button.y = 620;
      button.width = 64;
      lastX += 80;
      button.mouseup = function() {
        selectedItemClass = itemClass.class;
	_this.updateSelectedItemLabel(selectedItemClass);
      }
      
      var moneyLabel = new PIXI.Text("$"+_this.prices[itemClass.type], {fill:'yellow'});
      moneyLabel.y = -30;
      moneyLabel.font = 'bold 30px Arial';
      moneyLabel.width = 200;
      moneyLabel.height = 100;
      button.addChild(moneyLabel);

      _this.baseStage.addChild(button);
    });

    this.mainStage.mouseup = function (event) {
      if (!selectedItemClass) return;
      var options = selectedItemClass.objectForDeploy();
      var position = event.getLocalPosition(_this.mainStage);
      options.location.x = position.x;
      options.location.y = position.y;
      
      // check if player has enough money
      var price = _this.prices[options.type];
      if (price === undefined || _this.money < price) {
	return;
      }

      Socket.deployItem(options);
    };

    requestAnimationFrame(animate);

    function animate() {
        _this.renderer.render(_this.baseStage);
        requestAnimationFrame(animate);
    }
  },
  
  refreshCoolDownLabel : function () {
      this.coolDownSec = 3;
      this.coolDownLabel.setText(this.coolDownSec);
      
      var timer = setInterval(function () {
	  if (--Stage.coolDownSec > 0) {
	      Stage.coolDownLabel.setText(Stage.coolDownSec);
	  } else {
	      Stage.coolDownLabel.setText("");
	      clearInterval(timer);
	  }
      }, 1000);
  },
  
  updateSelectedItemLabel : function (selectedItemClass) {
      if (this.selectedItemLabel) {
	  this.baseStage.removeChild(this.selectedItemLabel);
      }
      this.selectedItemLabel = selectedItemClass.createButtonSprite();
      this.selectedItemLabel.x = 20;
      this.selectedItemLabel.y = 620;
      this.selectedItemLabel.width = 64;
      this.baseStage.addChild(this.selectedItemLabel);
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
    return false;
  },

  collisionItemsForItem : function (item, location, size) {
    return this.allItems.filter(function(thisItem){
      if (item == thisItem) return false; // don't count self
      // return true if crashing
      return thisItem.collide({
        location : location,
        size : size
      });
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
      case "tower":
        return new Tower(options);
        break;
    }
    return undefined;
  },

  showWinMessage : function () {
    $("#result-modal").modal('show');
    $("#result").html("Contragulation, you won!");
    $("#result-button").html("Play one more time");
  },

  showLoseMessage : function () {
    $("#result-modal").modal('show');
    $("#result").html("You lose... Practice more man.");
    $("#result-button").html("Never give up");
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
        $("#status").html("Here we go!");
        setTimeout(function(){
          $("#status-modal").modal('hide');
        },1000);

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

      socket.on('end', function (options) {
        if (currentState !== STATE.PLAYING) return;

        currentState = STATE.ENDED;
        if(Player.me.id == options.winner){
          Stage.showWinMessage();
        } else {
          Stage.showLoseMessage();
        }
      });

      socket.on('sync', function (options) {
        if (currentState !== STATE.PLAYING) return;
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
        if (currentState !== STATE.PLAYING) return;
	
	Stage.refreshCoolDownLabel();
	
	// money deduction
	if (options.owner == getPlayerID()) {
	    var price = Stage.prices[options.type];
	    Stage.money -= price;
	    Stage.redrawMoneyLabel();
	}
	
        Stage.addItem(options);
      });

      socket.on('attack', function (options) {
        if (currentState !== STATE.PLAYING) return;
        var thisItem = Stage.findItemById(options.targetID);
        thisItem.applyDamage(options.damage);
      });

      socket.on("destroy", function (options) {
        if (currentState !== STATE.PLAYING) return;
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
      $("#status").html("Hang tight, someone's joining.");
      $("#ready-button").attr('disabled', 'disabled');
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
        damage: damage,
        location: attacker.location
      });
    },

    updateItem : function (item) {
      var info = item.objectForUpdate();
      info.item = item.uuid;
      socket.emit('update', info);
    }
  };
})();

(function(){
  var socket = io(':3000/room/'+urlParams['name']);
  Stage.setup();
  Socket.setup(socket);

  $("#ready-button").on('click', function (e) {
    e.preventDefault();
    Socket.ready();
  });

  $("#status-modal").modal('show');
})();