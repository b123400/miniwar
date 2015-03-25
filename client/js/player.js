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