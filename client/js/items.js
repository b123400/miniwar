var Item = function(options) {
  this.uuid = options.uuid;
  this.hp = options.hp;
  this.fullHp = this.hp;
  this.location = options.location;
  this.size = {
    width : 42,
    height: 49
  };
  this.owner = Player.fromId(options.owner);
};

Item.prototype.getSprite = function () {
  if (this.sprite) return this.sprite;

  this.sprite = new PIXI.Sprite.fromImage(this.getImage());
  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y;
  this.sprite.width = this.size.width;
  this.sprite.height = this.size.height;

  this.sprite.addChild(this.getBloodBar());

  return this.sprite;
};

Item.prototype.getBloodBar = function() {
  if (!this.bloodBar) {
    this.bloodBar = new PIXI.Graphics();
    this.bloodBar.x = 0;
    this.bloodBar.y = -10;
    this.redrawBloodBar();
  }

  return this.bloodBar;
};

Item.prototype.redrawBloodBar = function () {
  var bloodBar = this.getBloodBar();
  bloodBar.clear();

  // frame
  bloodBar.lineStyle(2, 0x000000);
  bloodBar.drawRect(0, 0, this.size.width, 5);

  // blood
  var width = this.hp / this.fullHp * this.size.width;
  bloodBar.lineStyle(0, 0x000000);
  bloodBar.beginFill(0xff0000, 1);
  bloodBar.drawRect(0, 0, width, 5);
  bloodBar.endFill();
}

Item.prototype.getImage = function () {
  return 'img/soldier.png';
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

Item.prototype.applyDamage = function (damage) {
  this.hp -= damage;
  var damageText = new PIXI.Text("-"+damage);
  damageText.x = 0;
  damageText.y = 0;
  damageText.font = 'bold 20px Arial';
  damageText.width = 200;
  damageText.height = 80;
  this.getSprite().addChild(damageText);

  var start = Date.now();
  var duration = 500;
  var _this = this;
  function animate() {
    var percentage = (Date.now()-start)/duration;
    if (percentage < 1) {
      requestAnimationFrame(animate);
      damageText.y = - percentage * 50;
      damageText.alpha = 1-percentage;
    } else {
      _this.getSprite().removeChild(damageText);
    }
  }

  requestAnimationFrame(animate);
  this.redrawBloodBar();
}

Item.prototype.destroy  = function (callback) {
  this.hp = 0; // In case if the server wants to destroy me, I obey

  var start = Date.now();
  var duration = 500;
  var _this = this;
  function animate() {
    var percentage = (Date.now() - start) / duration;

    var sprite = _this.getSprite();
    sprite.scale.x = sprite.scale.y = 1 + 0.5 * percentage;
    sprite.x = _this.location.x - _this.size.width * 0.25 * percentage;
    sprite.y = _this.location.y - _this.size.height * 0.25 * percentage;
    sprite.alpha = 1 - percentage;
    if (percentage > 1) {
      callback();
    } else {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}

Item.prototype.animateSprite = function () {
  // default = do nothing
};

var Castle = function (options) {
  Item.apply(this,arguments);
  this.size = {
    width : 51,
    height : 65
  };
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
  this.stopAnimation = false;
};

Soldier.prototype = Object.create(Item.prototype);

Soldier.prototype.animateSprite = function () {
  var _this = this;
  function animate () {
    if (_this.hp <= 0) return; // if this thing is destroyed, stop
    if (_this.stopAnimation) return;

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
    crashingItems = crashingItems.filter(_this.shouldAttackItem);

    if (!crashingItems.length) {
      _this.location = targetLocation;
    } else {
      if (_this.owner === Player.me && Date.now() - _this.lastAttack > 1000) {
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

    requestAnimationFrame(animate);
  }
  animate();
}

Soldier.prototype.shouldAttackItem = function (item) {
  if (item.owner == Player.me) return false;
  if (item instanceof Soldier) return false;
  return true;
}

Soldier.prototype.attack = function (anotherItem) {
  console.log(this.uuid, 'attack', anotherItem.uuid)
  Socket.attackItem(this, anotherItem, 10);
  this.lastAttack = Date.now();
}

Soldier.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/soldier.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}

Soldier.objectForDeploy = function () {
  return {
    type : "soldier",
    location : {
      x : Player.me.castle.location.x,
      y : Player.me.castle.location.y + 100
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 1,
    hp : 100,
    target : Player.getRandomEnemy().id
  };
}

/*siuming*/
var 小明 = function(options) {
  Soldier.apply(this, arguments);
};

小明.prototype = Object.create(Soldier.prototype);

小明.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/siuming.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}

小明.objectForDeploy = function () {
  return {
    type : "siuming",
    location : {
      x : Player.me.castle.location.x,
      y : Player.me.castle.location.y + 100
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 150,
    hp : 50,
    target : Player.getRandomEnemy().id
  };
}

小明.prototype.getImage = function () {
  return 'img/siuming.png';
};

/*end of siuming*/

var Wall = function () {
  Item.apply(this, arguments);
  this.size = {
    width : 47,
    height : 46
  };
}

Wall.prototype = Object.create(Item.prototype);

Wall.prototype.getImage = function () {
  return 'img/wall.png';
};

Wall.objectForDeploy = function () {
  return {
    type : "wall",
    location : {
      x : 0,
      y : 0
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 50,
    hp : 100
  };
};

Wall.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/wall.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}