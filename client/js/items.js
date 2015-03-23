var Item = function(options) {
  this.uuid = options.uuid;
  this.hp = options.hp;
  this.location = options.location;
  this.size = options.size;
  this.owner = Player.fromId(options.owner);
};

Item.prototype.getSprite = function () {
  if (this.sprite) return this.sprite;
  this.sprite = new PIXI.Sprite.fromImage(this.getImage());
  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y;
  this.sprite.width = this.size.width;
  this.sprite.height = this.size.height;
  return this.sprite;
};

Item.prototype.getImage = function () {
  return 'img/bunny.png';
};

Item.prototype.collide = function (anotherItem) {
  var r1 = {
    left : this.location.x,
    top : this.location.y,
    right : this.location.x + this.size.width,
    bottom : this.location.y + this.size.height
  };
  var r2 = {
    left : anotherItem.location.x,
    top : anotherItem.location.y,
    right : anotherItem.location.x + anotherItem.size.width,
    bottom : anotherItem.location.y + anotherItem.size.height
  };
  return !(r2.left > r1.right || 
           r2.right < r1.left || 
           r2.top > r1.bottom ||
           r2.bottom < r1.top);
}

Item.prototype.animateSprite = function () {
  // default = do nothing
};

var Castle = function (options) {
  Item.apply(this,arguments);
}
Castle.prototype = Object.create(Item.prototype);

Castle.prototype.getImage = function () {
  return 'img/castle.png';
}

var Soldier = function(options) {
  Item.apply(this, arguments);
  this.speed = options.speed; // pixel per second
  this.lastMove = Date.now();
  this.lastAttack = Date.now();
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

    var targetLocation = {
      x : _this.location.x + deltaX * percentage,
      y : _this.location.y + deltaY * percentage
    };

    var crashingItems = Stage.collisionItemsForItem(_this, targetLocation, _this.size);
    if (!crashingItems.length) {
      _this.location = targetLocation;
    } else {
      if (Date.now() - _this.lastAttack > 1000) {
        // yo lets attack!
        crashingItems.forEach(function (item) {
          _this.attack(item);
        });
      }
    }

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

Soldier.prototype.attack = function (anotherItem) {
  Socket.attackItem(this, anotherItem, 10);
  this.lastAttack = Date.now();
}

var Wall = function () {
  Item.apply(this, arguments);
}

Wall.prototype = Object.create(Item.prototype);