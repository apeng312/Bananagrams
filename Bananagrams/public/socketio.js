var Server = (function() {
	function Server(address, Page, Board, Hand) {
		this.socket = io.connect(address);
		this.Page = Page;
		this.Page.server = this;
		this.Board = Board;
		this.Hand = Hand;
		this.gameStart = false;
		this.game_code;
		this.attach_listeners();

	}

	Server.prototype.emit_leave = function() {
		this.gameStart = false;
		this.socket.emit("leave");
	};

	Server.prototype.emit_new_game = function(data) {
		this.game_code = data.game_code;
		this.socket.emit("new_game", {
			"name": data.name,
			"new": data.new,
			"game_code": data.game_code
		});
	};

	Server.prototype.emit_split = function() {
		this.socket.emit("call_split");
	};

	Server.prototype.emit_peel = function() {
		this.socket.emit("call_peel");
	};

	Server.prototype.emit_dump = function(data) {
		this.socket.emit("call_dump", {
			"tile": data.tile
		});
	};

	Server.prototype.emit_bananas = function(data) {
		this.socket.emit("call_bananas", {
			"board": data.board
		});
	};

	Server.prototype.attach_listeners = function() {
		this.socket.on("start_confirm", this.start_confirm());
		this.socket.on("game_info", this.fill_info());
		this.socket.on("player_join", this.add_player());
		this.socket.on("player_leave", this.remove_player());
		this.socket.on("start_game", this.splitted());
		this.socket.on("get_tiles", this.get_tiles());
		this.socket.on("go_bananas", this.go_bananas());
		this.socket.on("win", this.end_game());
	};

	Server.prototype.start_confirm = function() {
		var currentcontext = this;
		return function(data) {
			if (data.confirmed) {
				currentcontext.Page.switch_screen();
			} else {
				$(".error").addClass("hidden");
				$("#"+data.type).removeClass("hidden");
				if (data.type === "bad-id") {
					$("input[name='game-ID']").val("");
				} else if (data.type === "bad-name") {
					$("input[name='name']").val("");
				}
			}
		};
	};

	Server.prototype.fill_info = function() {
		var currentcontext = this;
		return function(data) {
			currentcontext.info_buffer = function() {
				for (var field in data.game_info) {
					currentcontext.Page.fill_in_info(field, data.game_info[field]);
				}
				if (!currentcontext.gameStart) {
					for (var i = 0; i < data.players.length; i++) {
						currentcontext.Page.add_player(data.players[i]);
					}
				} else if (data.game_info.tiles < 3) {
					currentcontext.Page.button_change("dump", 0);
				}
				delete currentcontext.info_buffer;
			};
			if (currentcontext.Page.gameStart) {
				currentcontext.info_buffer();
			}
		};
	};

	Server.prototype.add_player = function() {
		var currentcontext = this;
		return function(data) {
			if (!currentcontext.gameStart) {
				currentcontext.Page.add_player(data.name);
			}
		};
	};

	Server.prototype.remove_player = function() {
		var currentcontext = this;
		return function(data) {
			if (!currentcontext.gameStart) {
				var names = $("#pregame ol li");
				for (var i = 0; i < names.length; i++) {
					if ($(names[i]).html() === data.name) {
						$(names[i]).remove();
					}
				}
				if ($("#pregame ol li").length < 2) {
					currentcontext.Page.button_change("split", 1);
				}
			}
		};
	};

	Server.prototype.splitted = function() {
		var currentcontext = this;
		return function() {
			if (!currentcontext.gameStart) {
				currentcontext.gameStart = true;
				currentcontext.Board.init_fill_tiles();
				currentcontext.Page.button_change("split", 0);
				currentcontext.Page.button_change("peel", 1);
				currentcontext.Page.button_change("dump", 1);
			}
		};
	};

	Server.prototype.get_tiles = function() {
		var currentcontext = this;
		return function(data) {
			if (currentcontext.gameStart) {
				for (var i = 0; i < data.tiles.length; i++) {
					currentcontext.Hand.add_tile(data.tiles[i]);
				}
			}
		};
	};

	Server.prototype.go_bananas = function() {
		var currentcontext = this;
		return function() {
			if (currentcontext.gameStart) {
				currentcontext.Page.button_change("peel", 0);
				if ($("#hand > *").length === 0) {
					currentcontext.Page.button_change("bananas", 2);
				} else {
					currentcontext.Page.button_change("bananas", 1);
				}
			}
		};
	};

	Server.prototype.end_game = function() {
		var currentcontext = this;
		return function(data) {
			if (currentcontext.gameStart) {
				currentcontext.Page.win(data.winner);
				currentcontext.gameStart = false;
			}
		};
	};

	return Server;
})();

$(document).ready(function() {
	window.Page = new Page();
	window.Board = new Board(Page);
	window.Hand = new Hand(window.Board);
	window.Server = new Server("http://localhost:3000/", window.Page, window.Board, window.Hand);
});
