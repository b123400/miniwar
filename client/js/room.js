var Stage = {
  baseStage : null, // for buttons
  mainStage : null, // for items
  renderer : null,
  allItems : [],

  setup : function () {
    // You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
    this.renderer = new PIXI.autoDetectRecommendedRenderer(800, 700);

    document.getElementById("stage").appendChild(this.renderer.view);
    this.baseStage = new PIXI.Stage(0xffffff);

    this.mainStage = new PIXI.Stage(0xffffff);
    this.mainStage.x = 0;
    this.mainStage.y = 0;
    this.mainStage.width = 800;
    this.mainStage.height = 600;
    this.baseStage.addChild(this.mainStage);

    var itemsWithButton = [Soldier],
        lastX = 0,
        _this = this;

    itemsWithButton.forEach(function (itemClass) {
      var button = itemClass.createButtonSprite();
      button.x = lastX;
      button.y = 600;
      lastX += button.width;
      button.mouseup = function() {
        Socket.deployItem(itemClass.objectForDeploy());
      }
      _this.mainStage.addChild(button);
    });

    requestAnimationFrame(animate);

    function animate() {
        _this.renderer.render(_this.mainStage);
        requestAnimationFrame(animate);
    }
  },

  // should be called only by socket
  addItem : function (options) {
    var item = (options instanceof Item) ? options : this.itemFromOptions(options);
    this.mainStage.addChild(item.getSprite());
    Stage.allItems.push(item);
    item.animateSprite();
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
      case "castle":
        return new Castle(options);
        break;
    }
    return undefined;
  }
};

var Socket = (function(){
  var socket;
  return {
    setup : function (_socket) {
      socket = _socket;
      socket.on('start', function (options) {
        document.getElementById('status').innerHTML = "Start. player count: " + options.playerCount;

        for (var id in options.targets) {
          var castle = Stage.itemFromOptions(options.targets[id]);
          var newPlayer = new Player(id, castle);
          if (newPlayer.id == options.playerID) {
            Player.me = newPlayer;
          }
        }

        for (var key in Player.allPlayers) {
          Stage.addItem(Player.allPlayers[key].castle); // add to stage;
        }

      });

      socket.on('end', function () {

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
})();