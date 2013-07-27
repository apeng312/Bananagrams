var express = require("express");
var http = require("http");
var socketio = require("socket.io");
var Gameroom = require("./socket.js");
var Player = require("./player.js");

var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

server.listen(3000);

app.get("/", function(req, res) {
	res.sendfile(__dirname+"/public/index.html");
});

app.get("/:filename", function(req, res) {
	res.sendfile(__dirname+"/public/"+req.params.filename);
});

io.sockets.on("connection", function(socket) {
	socket.on("new_game", function(data) {
		var player = new Player(socket, data.name);
		var game = Gameroom.list_of_game_codes[data.game_code];
		var confirm;
		var type = "bad-id";
		if (data.new) {
			var newgame = new Gameroom(player);
			confirm = true;
		} else { 
			if (game && (game.user_array.length < 7) && (game.game_state === 0)) {
				if (game.user_list[data.name]) {
					confirm = false;
					type = "bad-name";
				} else {
					game.player_join(player);
					confirm = true;
				}
			} else {
				confirm = false;
			}
		}
		socket.emit("start_confirm", {
			"confirmed": confirm,
			"type": type
		});
	});
});

process.on("uncaughtException", onUncaughtException);

function onUncaughtException(err) {
	    var err = "uncaught exception: " + err;
		    console.log(err);
}
