var socket = io(':3000/lobby');
socket.on('count', function (count) {
  document.getElementById('playerCount').innerHTML = "Player Count: "+count;
});
socket.on('rooms', function (rooms) {
  var roomDiv = document.getElementById('rooms');
  roomDiv.innerHTML = "";
  var buttons = rooms.map(function(room){
    var button = document.createElement('input');
    button.type = "button";
    button.value = room.name+" status: "+ (room.isPlaying? "playing" : "waiting");
    button.addEventListener('click', function(){
      goToRoom(room.name);
    });
    return button;
  });
  buttons.forEach(function(button){
    roomDiv.appendChild(button);
  });
});

document.getElementById('newRoomButton').addEventListener('click',function(){
  socket.emit('newRoom');
  socket.on('createdRoom', function(name){
    goToRoom(name);
  });
});

function goToRoom(name) {
  location.href = "/room.html?name=" + encodeURIComponent(name);
}