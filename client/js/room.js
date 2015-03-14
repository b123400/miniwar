
var renderer, stage;
function setupStage () {
  // You can use either PIXI.WebGLRenderer or PIXI.CanvasRenderer
  renderer = new PIXI.autoDetectRecommendedRenderer(800, 600);

  document.getElementById("stage").appendChild(renderer.view);

  stage = new PIXI.Stage(0xffffff);

  requestAnimationFrame(animate);

  function animate() {
      renderer.render(stage);
      requestAnimationFrame(animate);
  }
}

function itemFromOptions (options) {
  switch (options.type) {
    case "soldier":
      return new Soldier(options);
    case "castle":
      return new Castle(options);
      break;
  }
  return undefined;
}

function addItem (options) {
  var item = itemFromOptions(options);
  stage.addChild(item.getSprite());
  item.animateSprite();
};

var Player = function (id, castle) {
  this.id = id;
  this.castle = castle;
  Player.allPlayers[id] = this;
};

Player.me = undefined;
Player.allPlayers = {};
Player.fromId = function (id) {
  return Player.allPlayers[id];
}
Player.getEnemies = function () {
  return Player.enemies || (Player.enemies = Object.keys(Player.allPlayers)
    .map(function (key) {
      return Player.allPlayers[key];
    })
    .filter(function (player) {
      return player != Player.me;
    }));
}
Player.getRandomEnemy = function () {
  var enemies = this.getEnemies();
  return enemies[Math.floor(Math.random()*enemies.length)];
}

var socket = io(':3000/room/'+urlParams['name']);
socket.on('start', function (options) {
  document.getElementById('status').innerHTML = "Start. player count: " + options.playerCount;

  for (var id in options.targets) {
    var castle = itemFromOptions(options.targets[id]);
    var newPlayer = new Player(id, castle);
    if (newPlayer.id == options.playerID) {
      Player.me = newPlayer;
    }
  }
  setupStage();
});

socket.on('end', function () {

});

socket.on('deploy', function (options) {
  addItem(options);
});

document.getElementById('deploy').addEventListener('click', function () {
  socket.emit("deploy", {
    type : "soldier",
    location : {
      x : 0,
      y : 200
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 10,
    target : Player.getRandomEnemy().id
  });
});