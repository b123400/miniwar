function BaseActor (options) {

}

Base.prototype.lastCheckTime = null;
Base.prototype.lastCheckPosition = null;
Base.prototype.speed = 100; // 100 pixel per second

BaseActor.prototype.checkPossiblePosition = function (position) {
  var xDistance = position.x - this.lastCheckPosition.x;
  var yDistance = position.y - this.lastCheckPosition.y;
  var distance = Math.pow(Math.pow(xDistance,2)+Math.pow(yDistance,2), 0.5);
  var timePassed = Date.now() - this.lastCheckTime;
  var maximumPossibleDistance = timePassed * this.speed;
  return distance <= maximumPossibleDistance;
}

module.exports = BaseActor;