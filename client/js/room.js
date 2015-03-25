var Stage = {
  stage : null,
  renderer : null,
  allItems : [],

  setup : function () {
    // You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
    this.renderer = new PIXI.autoDetectRecommendedRenderer(800, 600);

    document.getElementById("stage").appendChild(this.renderer.view);

    this.stage = new PIXI.Stage(0xffffff);

    requestAnimationFrame(animate);

    var _this = this;
    function animate() {
        _this.renderer.render(_this.stage);
        requestAnimationFrame(animate);
    }
  },

  // should be called only by socket
  addItem : function (options) {
    var item = (options instanceof Item) ? options : this.itemFromOptions(options);
    this.stage.addChild(item.getSprite());
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
      _this.stage.removeChild(item.getSprite());
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

// control, should moves to somewhere else later
document.getElementById('deploy').addEventListener('click', function () {
  Socket.deployItem({
    type : "soldier",
    location : {
      x : Player.me.castle.location.x,
      y : Player.me.castle.location.y + 100
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 50,
    hp : 100,
    target : Player.getRandomEnemy().id
  });
});