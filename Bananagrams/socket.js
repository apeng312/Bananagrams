var fs = require("fs");

var Bag = (function() {
	function Bag() {
		this.count = 144;
		this.tiles = [];
		this.populate_bag();
		this.shuffle();
	}

	Bag.prototype.populate_bag = function() {
		for (var i = 0; i < 2; i++) {
			this.tiles = this.tiles.concat(["J", "K", "Q", "X", "Z"]);
		}
		for (var i = 0; i < 3; i++) {
			this.tiles = this.tiles.concat(["B", "C", "F", "H", "M", "P", "V", "W", "Y"]);
		}
		for (var i = 0; i < 4; i++) {
			this.tiles.push("G");
		}
		for (var i = 0; i < 5; i++) {
			this.tiles.push("L");
		}
		for (var i = 0; i < 6; i++) {
			this.tiles = this.tiles.concat(["D", "S", "U"]);
		}
		for (var i = 0; i < 8; i++) {
			this.tiles.push("N");
		}
		for (var i = 0; i < 9; i++) {
			this.tiles = this.tiles.concat(["T", "R"]);
		}
		for (var i = 0; i < 11; i++) {
			this.tiles.push("O");
		}
		for (var i = 0; i < 12; i++) {
			this.tiles.push("I");
		}
		for (var i = 0; i < 13; i++) {
			this.tiles.push("A");
		}
		for (var i = 0; i < 18; i++) {
			this.tiles.push("E");
		}
		console.log(this.tiles.length);
	};

	Bag.prototype.shuffle = function() {
		for (var i = this.tiles.length; i >= 0; i--) {
			var randomnumber = Math.floor(Math.random()*i);
			this.tiles.push(this.tiles.splice(randomnumber, 1)[0]);
		}
	};

	Bag.prototype.pull_tile = function() {
		this.count--;
		return this.tiles.pop();
	}

	Bag.prototype.return_tile = function(tile) {
		var randomnumber = Math.floor(Math.random()*(this.tiles.length+1));
		this.tiles.splice(randomnumber, 0, tile);
		this.count++;
	}

	return Bag
})();

var Gameroom = (function() {
	function Gameroom(init_player) {
		this.bag = new Bag();
		this.game_state = 0;
		this.game_code = this.generate_game_code();
		this.user_list = {};
		this.user_array = [];
		this.player_join(init_player);
		this.dict;
		this.init_dict();
		Gameroom.list_of_game_codes[this.game_code] = this;
	}

	Gameroom.list_of_game_codes = {};

	Gameroom.prototype.generate_game_code = function() {
		var charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
		do {
			var char_array = [];
			for (var i = 0; i < 6; i++) {
				var randomnumber = Math.floor(Math.random()*charset.length);
				char_array.push(charset[randomnumber]);
			}
			var string = char_array.join("");
		}
		while (Gameroom.list_of_game_codes[string]);
		return char_array.join("");
	};

	Gameroom.prototype.player_join = function(player) {
		if (this.game_state === 0) {
			this.emit_all("player_join", {
				"name": player.name
			});
			this.user_list[player.name] = player;
			this.user_array.push(player.name);
			player.socket.emit("game_info", {
				"game_info": {
					"tiles": this.bag.count,
					"gameid": this.game_code
				},
				"players": this.user_array
			});
			this.attach_listeners(player);
		}
	};

	Gameroom.prototype.attach_listeners = function(player) {
		player.socket.on("call_split", this.emit_start_game_gen());
		player.socket.on("call_peel", this.emit_peel_gen());
		player.socket.on("call_dump", this.emit_dump_gen(player));
		player.socket.on("call_bananas", this.emit_end_game_gen(player));
		player.socket.on("disconnect", this.emit_player_leave(player));
		player.socket.on("leave", this.emit_player_leave(player));
	};

	Gameroom.prototype.emit_start_game_gen = function() {
		var gameroom = this;
		return function() {
			if ((gameroom.user_array.length >= 2) && (gameroom.user_array.length <= 7)) {
				if (gameroom.game_state === 0) {
					gameroom.emit_all("start_game");
					if ((gameroom.user_array.length >= 2) && (gameroom.user_array.length <= 4)) {
						gameroom.tiles_emit_all(21);
					} else if ((gameroom.user_array.length >= 5) && (gameroom.user_array.length <= 6)) {
						gameroom.tiles_emit_all(15);
					} else if (gameroom.user_array.length === 7) {
						gameroom.tiles_emit_all(11);
					}
					gameroom.emit_all("game_info", {
						"game_info": {
							"tiles": gameroom.bag.count
						}
					});
					gameroom.game_state = 1;
				}
			}
		};
	};

	Gameroom.prototype.emit_peel_gen = function() {
		var gameroom = this;
		return function() {
			if (gameroom.game_state === 1) {
				gameroom.tiles_emit_all(1);
				gameroom.emit_all("game_info", {
					"game_info": {
						"tiles": gameroom.bag.count
					}
				});
				gameroom.is_it_bananas();
			}
		};
	};

	Gameroom.prototype.emit_dump_gen = function(player) {
		var gameroom = this;
		return function(data) {
			if ((gameroom.game_state > 0) && (gameroom.bag.count >= 3)) {
				var data2 = {
					"tiles": []
				};
				for (var i = 0; i < 3; i++) {
					data2.tiles.push(gameroom.bag.pull_tile());
					console.log(data2.tiles);
				}
				player.socket.emit("get_tiles", data2);
				gameroom.bag.return_tile(data.tile);
				gameroom.emit_all("game_info", {
					"game_info": {
						"tiles": gameroom.bag.count
					}
				});
				gameroom.is_it_bananas();
			}
		};
	};

	Gameroom.prototype.emit_end_game_gen = function(player) {
		var gameroom = this;
		return function(data) {
			if (gameroom.game_state === 2) {
				if (gameroom.confirm_bananas(data.board)) {
					player.socket.emit("win", {
						"winner": player.name
					});
				}
			}
		};
	};

	Gameroom.prototype.emit_player_leave = function(player) {
		var gameroom = this;
		return function() {
			if (gameroom.user_array.length === 0) {
				delete Gameroom.list_of_game_codes[gameroom.game_code];
			} else {
				player.socket.removeAllListeners("call_split");
				player.socket.removeAllListeners("call_peel");
				player.socket.removeAllListeners("call_dump");
				player.socket.removeAllListeners("call_bananas");
				player.socket.removeAllListeners("disconnect");
				player.socket.removeAllListeners("leave");
				delete gameroom.user_list[player.name];
				for (var i = 0; i < gameroom.user_array.length; i++) {
					if (gameroom.user_array[i] === player.name) {
						gameroom.user_array.splice(i, 1);
						break;
					}
				}
				if (gameroom.game_state === 0) {
					gameroom.emit_all("player_leave", {
						"name": player.name
					});
				}
			}
		};
	}

	Gameroom.prototype.is_it_bananas = function() {
		if ((this.bag.count < this.user_array.length) && (this.game_state !== 2)) {
			this.emit_all("go_bananas");
			this.game_state = 2;
		}
	};

	Gameroom.prototype.init_dict = function(word) {
		var gameroom = this;
		fs.readFile("./sowpods.txt", 'utf8', function(err, data) {
			if (err) {
				console.log(err);
			} else {
				console.log("dictionary loaded");
			}
			console.log(data.split("\n").length)
			gameroom.dict = data.split("\n");
			if (gameroom.dict.length === 0) {
				console.log("ERROR BUILDING DICTIONARY");
			}
		});
	};

	Gameroom.prototype.check_word = function(word) {
		var low = 0;
		var high = this.dict.length - 1;
		while (low < high) {
			var mid = Math.floor((low + high)/2);
			if (this.dict[mid] === word) {
				return true;
			} else if (word < this.dict[mid]) {
				high = mid - 1;
			} else {
				low = mid + 1
			}
		}
		return false;
	}

	Gameroom.prototype.confirm_bananas = function(board) {
		var propArray = Object.keys(board);
		var rows = propArray.length;
		var cols = board[propArray[0]].length;
		var current_word = [];
		var in_word = false;
		for (row in board) {
			for (var col = 0; col < cols; col++) {
				if (board[row]["col"+col] === "") {
					if (current_word.length < 2) {
						current_word = [];
						in_word = false;
						continue;
					} else if (in_word) {
						in_word = false;
						if (this.check_word(current_word.join(""))) {
							current_word = [];
							continue;
						} else {
							return false;
						}
					} else {
						continue;
					}
				} else {
					current_word.push(board[row]["col"+col]);
				}
			}
			current_word = [];
			in_word = false;
		}
		for (var col = 0; col < cols; col++) {
			for (row in board) {
				if (board[row]["col"+col] === "") {
					if (current_word.length < 2) {
						current_word = [];
						in_word = false;
						continue;
					} else if (in_word) {
						in_word = false;
						if (this.check_word(current_word.join(""))) {
							current_word = [];
							continue;
						} else {
							return false;
						}
					} else {
						continue;
					}
				} else {
					current_word.push(board[row]["col"+col]);
				}
			}
			current_word = [];
			in_word = false;
		}
		return true;
	};

	Gameroom.prototype.emit_all = function(event, data) {
		for (var name in this.user_list) {
			this.user_list[name].socket.emit(event, data);
		}
	};

	Gameroom.prototype.tiles_emit_all = function(number) {
		for (var name in this.user_list) {
			var data = {
				"tiles": []
			};
			for (var i = 0; i < number; i++) {
				data.tiles.push(this.bag.pull_tile());
			}
			this.user_list[name].socket.emit("get_tiles", data);
			this.emit_all("game_info", {
				"game_info": {
					"tiles": this.bag.count
				}
			});
		}
	};

	return Gameroom;
})();

module.exports = Gameroom;
