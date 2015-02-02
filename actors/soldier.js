var BaseActor = require('./base')

var Soldier = function (options) {
  BaseActor.apply(this, arguments);

  this.speed = options.speed;
}
Soldier.prototype = new BaseActor();

Soldier.prototype.actorName = "Soldier";
Soldier.prototype.speed = 100;

exports.Soldier = Soldier;