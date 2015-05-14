var Item = function(options) {
  this.uuid = options.uuid;
  this.hp = options.hp;
  this.fullHp = options.fullHp;
  this.location = options.location;
  this.size = {
    width : 42,
    height: 49
  };
  this.owner = Player.fromId(options.owner);
};

Item.prototype.getSprite = function () {
  if (this.sprite) return this.sprite;

  this.sprite = new PIXI.MovieClip.fromImages(this.getImage());
  addStatePlayer(this.sprite);
  this.setSpriteTransfrom();
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
  if (this.owner === Player.me || this === Player.me.castle) {
    bloodBar.beginFill(0x00ff00, 1); // player's blood bar
  } else {
    bloodBar.beginFill(0xff0000, 1); // opponents' blood bar
  }
  bloodBar.drawRect(0, 0, width, 5);
  bloodBar.endFill();
}

Item.prototype.getImage = function () {
  return ['img/soldier.png'];
};

Item.prototype.setSpriteTransfrom = function () {
  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y;
  this.sprite.width = this.size.width;
  this.sprite.height = this.size.height;
};

Item.prototype.objectForUpdate = function () {
  return {location : this.location};
}

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
    width : 64,
    height : 64
  };
}

Castle.prototype = Object.create(Item.prototype);

Castle.prototype.getImage = function () {
  return ['img/castle1.png'];
}

var Soldier = function(options) {
  Item.apply(this, arguments);
  this.speed = options.speed; // pixel per second
  this.lastMove = Date.now();
  this.lastAttack = Date.now();
  this.target = (Player.fromId(options.target)||{}).castle;

  var sprite = this.getSprite()
  sprite.loop = true;
  sprite.fps = 10;
  sprite.playSequence([0,6]);

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
    collidedItems = crashingItems.filter(_this.shouldCollideItem.bind(_this));

    if (!collidedItems.length) {
      if (_this.location.x > targetLocation.x) {
        _this.getSprite().scale.x = -1;
      }
      
      _this.location = targetLocation;
    }

    if (_this.owner === Player.me && Date.now() - _this.lastAttack > 1000) {
      // this item can attack now
      _this.getSprite().playSequence([0,9]);
      crashingItems
      .filter(_this.shouldAttackItem.bind(_this))
      .forEach(function (item) {
        _this.attack(item);
      });
    }

    _this.setSpriteTransfrom();
    _this.lastMove = Date.now();

    requestAnimationFrame(animate);
  }
  animate();
}

Soldier.prototype.shouldCollideItem = function (item) {
  if (item instanceof Tower) return true;
  if (!(item instanceof Soldier)) return true; // wall or castle
  // it is soldier
  return false;
}

Soldier.prototype.shouldAttackItem = function (item) {
  if (item.owner === this.owner || item === Player.me.castle) return false;
  if (item instanceof Tower) return true;
  if (item instanceof Soldier) return false;
  return true;
}

Soldier.prototype.attack = function (anotherItem) {
  console.log(this.uuid, 'attack', anotherItem.uuid)
  Socket.attackItem(this, anotherItem, this.attackDamage || 10);
  this.lastAttack = Date.now();
}

Soldier.prototype.getImage = function () {
  return ['img/mushroom10000.png',
          'img/mushroom10001.png',
          'img/mushroom10002.png',
          'img/mushroom10003.png',
          'img/mushroom10004.png',
          'img/mushroom10005.png',
          'img/mushroom10006.png',
          'img/mushroom10007.png',
          'img/mushroom10008.png',
          'img/mushroom10009.png',
          'img/mushroom10010.png',
          'img/mushroom10011.png',
          'img/mushroom10012.png',
          'img/mushroom10013.png',
          'img/mushroom10014.png',
          'img/mushroom10015.png',
          'img/mushroom10016.png'];
};

Soldier.prototype.setSpriteTransfrom = function () {
  if (!this.lastX)
    this.lastX = this.location.x;

  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y-32;
  this.sprite.width = 64;
  this.sprite.height = 64;
  if (this.location.x - this.lastX >= 0){
    this.sprite.scale.x = 1;
    this.sprite.x -= 32;
  }else{
    this.sprite.scale.x = -1;
    this.sprite.x += 32;
  }

  this.lastX = this.location.x;
};


Soldier.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/mushroom10002.png");
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
    speed : 50,
    hp : 100,
    fullHp : 100,
    target : Player.getRandomEnemy().id
  };
}

/*siuming*/
var 小明 = function(options) {
  Soldier.apply(this, arguments);
  this.getSprite().fps = 5;
  this.getSprite().playSequence([0,1]);
};

小明.prototype = Object.create(Soldier.prototype);

小明.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/mushroom20000.png");
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
    fullHp : 50,
    target : Player.getRandomEnemy().id
  };
}

小明.prototype.getImage = function () {
  return ['img/mushroom20000.png','img/mushroom20001.png'];
};

小明.prototype.shouldCollideItem = function (item) {
  if (item.owner === this.owner) return false;
  return true;
}

小明.prototype.shouldAttackItem = function (item) {
  if (item instanceof Soldier) return true;
  return Soldier.prototype.shouldAttackItem.apply(this, arguments);
}

/*end of siuming*/

var Aeroplane = function(options) {
  Soldier.apply(this, arguments);
  this.getSprite().fps = 5;
  this.getSprite().playSequence([0,1]);
  this.attackDamage = 3;
};

Aeroplane.prototype = Object.create(Soldier.prototype);

Aeroplane.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/plane50000.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}

Aeroplane.objectForDeploy = function () {
  return {
    type : "aeroplane",
    location : {
      x : Player.me.castle.location.x,
      y : Player.me.castle.location.y + 100
    },
    size : {
      width : 11,
      height: 37
    },
    speed : 300,
    hp : 1,
    fullHp : 1,
    target : Player.getRandomEnemy().id
  };
}

Aeroplane.prototype.getImage = function () {
  return ['img/plane50000.png', 'img/plane50001.png'];
};

Aeroplane.prototype.shouldCollideItem = function (item) {
  if (item === this.target) return true;
  return false;
}

Aeroplane.prototype.shouldAttackItem = function (item) {
  if (item.owner === this.owner || item === Player.me.castle) return false;
  return true;
}

var Wall = function () {
  Item.apply(this, arguments);
  this.size = {
    width : 47,
    height : 46
  };

  this.getSprite().fps = 3;
  this.getSprite().playSequence([0,4]);
}

Wall.prototype = Object.create(Item.prototype);

Wall.prototype.getImage = function () {
  return ['img/mushroom30000.png',
          'img/mushroom30000.png',
          'img/mushroom30000.png',
          'img/mushroom30000.png',
          'img/mushroom30001.png'];
};

Wall.prototype.setSpriteTransfrom = function () {
  if (!this.lastX)
    this.lastX = this.location.x;

  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y-32;
  this.sprite.width = 64;
  this.sprite.height = 64;
  if (this.location.x - this.lastX >= 0){
    this.sprite.scale.x = 1;
    this.sprite.x -= 32;
  }else{
    this.sprite.scale.x = -1;
    this.sprite.x += 32;
  }

  this.lastX = this.location.x;
};

Wall.objectForDeploy = function () {
  return {
    type : "wall",
    location : {
      x : 0,
      y : 0
    },
    size : {
      width : 64,
      height: 64
    },
    speed : 50,
    hp : 100,
    fullHp : 100
  };
};

Wall.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/mushroom30000.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}

var Tower = function () {
  Soldier.apply(this, arguments);
  this.size = {
    width : 47,
    height : 46
  };
  this.speed = 0; // tower doesn't move
}

Tower.prototype = Object.create(Soldier.prototype);

Tower.prototype.getImage = function () {
  return ['img/mushroom40000.png'];
};

Tower.prototype.setSpriteTransfrom = function () {
  if (!this.lastX)
    this.lastX = this.location.x;

  this.sprite.x = this.location.x;
  this.sprite.y = this.location.y-32;
  this.sprite.width = 64;
  this.sprite.height = 64;
  if (this.location.x - this.lastX >= 0){
    this.sprite.scale.x = 1;
    this.sprite.x -= 32;
  }else{
    this.sprite.scale.x = -1;
    this.sprite.x += 32;
  }

  this.lastX = this.location.x;
};

Tower.objectForDeploy = function () {
  return {
    type : "tower",
    location : {
      x : 0,
      y : 0
    },
    size : {
      width : 50,
      height: 50
    },
    speed : 50,
    hp : 100,
    fullHp : 100
  };
};

Tower.createButtonSprite = function () {
  var button = new PIXI.Sprite.fromImage("img/mushroom40000.png");
  button.buttonMode = true;
  button.interactive = true;
  return button;
}

Tower.prototype.shouldAttackItem = function (item) {
  if (item.owner === this.owner || item === Player.me.castle) return false;
  return true;
}

Tower.prototype.animateSprite = function () {
  var _this = this;
  function animate () {
    if (_this.hp <= 0) return; // if this thing is destroyed, stop
    if (_this.stopAnimation) return;

    var crashingItems = Stage.collisionItemsForItem(_this, {
      x : _this.location.x - 50,
      y : _this.location.y - 50
    },
    {
      width : _this.size.width + 100,
      height: _this.size.height + 100
    });

    if (_this.owner === Player.me && Date.now() - _this.lastAttack > 1000) {
      // this item can attack now
      _this.getSprite().playSequence([0,9]);
      crashingItems
      .filter(_this.shouldAttackItem.bind(_this))
      .forEach(function (item) {
        _this.attack(item);
      });
    }

    _this.setSpriteTransfrom();
    _this.lastMove = Date.now();

    requestAnimationFrame(animate);
  }
  animate();
}