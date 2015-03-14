Read the wiki for spec.

#Folder structure

client folder: static files that are going to be served to client.

##server.js
The starting point of the server.

##lobby.js
Manage rooms. It connects users using the `/lobby` namespace.

##room.js
It manage a single room, connects user using `room/<room_id>`.