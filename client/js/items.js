var Item = function(options) {
  this.uuid = options.uuid;
  this.hp = options.hp;
  this.location = options.location;
  this.size = options.size;
  this.owner = Player.fromId(options.owner);
};

Item.prototype.getSprite = function () {
  if (this.sprite) return this.sprite;
  return this.sprite = new PIXI.Sprite.fromImage(this.getImage());
};

Item.prototype.getImage = function () {
  return 'img/bunny.png';
};

Item.prototype.animateSprite = function () {
  // default = do nothing
};

var Castle = function (options) {
  Item.apply(this,arguments);
}
Castle.prototype = Object.create(Item.prototype);

var Soldier = function(options) {
  Item.apply(this, arguments);
  this.speed = options.speed; // pixel per second
  this.lastMove = Date.now();
  this.target = Player.fromId(options.target).castle;
};

Soldier.prototype = Object.create(Item.prototype);

Soldier.prototype.animateSprite = function () {
  var _this = this;
  function animate () {
    var targetLocation = _this.target.location;
    var deltaX = targetLocation.x - _this.location.x;
    var deltaY = targetLocation.y - _this.location.y;
    var distance = Math.sqrt(Math.pow(deltaX,2) + Math.pow(deltaY,2));
    var canMoveDistance = (Date.now() - _this.lastMove) / 1000 * _this.speed;
    var percentage = canMoveDistance/distance;
    if (percentage < 0) {
      percentage = 0;
    } else if (percentage > 1) {
      percentage = 1;
    }
    _this.location.x += deltaX * percentage;
    _this.location.y += deltaY * percentage;

    var sprite = _this.getSprite();
    sprite.x = _this.location.x;
    sprite.y = _this.location.y;
    _this.lastMove = Date.now();

    if (percentage < 1) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

var Wall = function () {
  Item.apply(this, arguments);
}

Wall.prototype = Object.create(Item.prototype);