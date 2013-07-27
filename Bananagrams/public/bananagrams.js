var Page = (function() {
	function Page() {
		var currentcontext = this;
		$("#join").click(function() {
			currentcontext.server.emit_new_game({
				"name": $("input[name='name']").val(),
				"new": false,
				"game_code": $("input[name='game-ID']").val()
			});
		});
		$("#new").click(function() {
			currentcontext.server.emit_new_game({
				"name": $("input[name='name']").val(),
				"new": true,
				"game_code": null
			});
		});
		this.gameStart = false;
		this.server = null;
		this.board = null;
	}

	Page.prototype.switch_screen = function() {
		var currentcontext = this;
		var start = $("#intro-screen");
		var game = $("#game");
		var logo = $("h1");
		var active = "active-section";
		var gv = "game-version";
		$(".error").addClass("hidden");
		if (!this.gameStart) {
			this.gameStart = true;
			start.removeClass(active);
			logo.addClass(gv);
			game.addClass(active);
			$("#exit").unbind("click").click(function() {
				currentcontext.server.emit_leave();
				currentcontext.switch_screen();
			})
			this.reset_game();
			if (this.server.info_buffer) {
				this.server.info_buffer();
			}
			if ($("#pregame ol li").length > 1) {
				this.button_change("split", 2);
			}
		} else {
			this.gameStart = false;
			game.removeClass(active);
			logo.removeClass(gv);
			start.addClass(active);
			this.reset_game();
		}
	};

	Page.prototype.fill_in_info = function(field, value) {
		if (field === "tiles") {
			$("#tiles-remaining").html(value);
		} else if (field === "gameid") {
			$("#game-id").html(value);
		} else {
			$("#tiles-remaining").html("");
			$("#game-id").html("");
		}
	};

	Page.prototype.button_change = function(button, state) {
		if (this.gameStart) {
			var currentcontext = this;
			var class_list = ["hidden", "inactive", ""];
			if (button) {
				$("#" + button).attr("class", class_list[state]).unbind("click");
			} else {
				$("#split").attr("class", "inactive").unbind("click");
				var buttons = $("#game.active-section > #top-bar > .buttons > li");
				buttons.not("#split").attr("class", "hidden");
			}
			if ((state !== 0) && (state !== 1)) {
				switch (button) {
					case ("split"): {
						var fn = function() {
							currentcontext.server.emit_split();
						};
						break;
					}

					case ("peel"): {
						var fn = function() {
							currentcontext.server.emit_peel();
						};
						break;
					}

					case ("dump"): {
						var fn = function() {
							var tile = $("#hand .tile.clicked");
							currentcontext.server.emit_dump({
								"tile": tile.html()
							});
							$(".tile:not(.filledTile)").unbind("click");
							if (!$("#dump").hasClass("hidden")) {
								currentcontext.button_change("dump", 1);
							}
							tile.remove();
						};
						break;
					}

					case ("bananas"): {
						var fn = function() {
							currentcontext.server.emit_bananas({
								"board": currentcontext.board.get_tiles()
							});
						};
						break;
					}

					default: {
						break;
					}
				}
				$("#"+button).click(fn);
			}
		}
	};

	Page.prototype.add_player = function(name) {
		$("#pregame ol").append("<li>"+name+"</li");
		if ($("#pregame ol li").length > 1) {
			this.button_change("split", 2);
		}
	};

	Page.prototype.win = function(name) {
		var currentcontext = this;
		$("#postgame span:not(.button)").html(name);
		$("#pregame > *").addClass("hidden");
		$("#pregame, #postgame").removeClass("hidden");
		if (!$("#bananas").hasClass("hidden")) {
			this.button_change("bananas", 1);
		}
		$(".tile, .filledTile").unbind("click");
		$("#postgame .button").click(function() {
			currentcontext.reset_game();
		})
	};

	Page.prototype.reset_game = function() {
		this.fill_in_info();
		this.button_change();
		$("#board > div").css("border", "none")
		$("#board > div > :not(#pregame), #hand *").remove();
		$("#pregame ol li").remove();
		$("#pregame, #pregame *").removeClass("hidden");
		$("#postgame").addClass("hidden");
	}

	return Page;
})();

var Board = (function() {
	function Board(Page) {
		this.minsize = 5;
		this.boardcols = this.minsize;
		this.boardrows = this.minsize;
		this.hand = null;
		this.Page = Page;
		this.Page.board = this;
	};

	Board.prototype.init_fill_tiles = function() {
		$("#pregame").addClass("hidden");
		$("#board > div").css("border", "0.1em solid #000")
		for (var i = 0; i < this.minsize; i++) {
			$("#board > div").append("<div id='row"+i+"'></div>");
			for (var j = 0; j < this.minsize; j++) {
				$("#row"+i).append("<div class='tile col"+j+"'></div>");
			}
		}
	};

	Board.prototype.get_tiles = function() {
		var tile_obj = {};
		for (var i = 0; i < this.boardrows; i++) {
			tile_obj["row"+i] = {};
			var this_row = $("#row"+i);
			for (var j = 0; j < this.boardcols; j++) {
				tile_obj["row"+i]["col"+j] = this_row.children(".col"+j).html();
			}
		}
		return tile_obj;
	}

	Board.prototype.outer_2_rows_empty = function() {
		var array = ["up", "left", "down", "right"];
		if (this.boardrows <= this.minsize) {
			array.splice(array.indexOf("up"), 1);
			array.splice(array.indexOf("down"), 1);
		}
		if (this.boardcols <= this.minsize) {
			array.splice(array.indexOf("left"), 1);
			array.splice(array.indexOf("right"), 1);
		}
		for (var i = 0; i < this.boardrows; i++) {
			for (var j = 0; j < this.boardcols; j++) {
				if ((i < 2) || (j < 2) || (i > (this.boardrows-3)) || (j > (this.boardcols-3))) {
					if ($("#row"+i).children(".col"+j).html() !== "") {
						if ((i < 2) && (array.indexOf("up") !== -1)) {
							array.splice(array.indexOf("up"), 1);
						}
						if ((j < 2) && (array.indexOf("left") !== -1)) {
							array.splice(array.indexOf("left"), 1);
						}
						if ((i > (this.boardrows-3)) && (array.indexOf("down") !== -1)) {
							array.splice(array.indexOf("down"), 1);
						}
						if ((j > (this.boardcols-3)) && (array.indexOf("right") !== -1)) {
							array.splice(array.indexOf("right"), 1);
						}
					}
				}
			}
		}
		return array;
	};

	Board.prototype.remove_extra_rows = function() {
		for (var array = this.outer_2_rows_empty(); array.length > 0; array = this.outer_2_rows_empty()) {
			for (var i = 0; i < array.length; i++) {
				this.reduce_board_one(array[i]);
			}
		}
	};

	Board.prototype.add_letter = function(row, col, letter) {
		var currentcontext = this;
		$("#row"+row).children(".col"+col).html(letter).addClass("filledTile").unbind("click")
					 .click(function() {
					 	var row = parseInt($(this).parent().attr("id").replace(/[^0-9]/g, ""), 10);
					 	var col = parseInt($(this).attr("class").replace(/[^0-9]/g, ""), 10);
					 	currentcontext.remove_letter(row, col);
					 	$("#hand > .tile").removeClass("clicked");
						$(".tile:not(.filledTile)").unbind("click");
						if (!$("#dump").hasClass("hidden")) {
							currentcontext.Page.button_change("dump", 1);
						}
					 });
		if (row === 0) {
			this.expand_board_one("up");
		}
		if (row === (this.boardrows-1)) {
			this.expand_board_one("down");
		}
		if (col === 0) {
			this.expand_board_one("left");
		}
		if (col === (this.boardcols-1)) {
			this.expand_board_one("right");
		}
		this.remove_extra_rows();
		if ($("#hand > *").length === 0) {
			if (!$("#peel").hasClass("hidden")) {
				this.Page.button_change("peel", 2);
			} else if (!$("#bananas").hasClass("hidden")) {
				this.Page.button_change("bananas", 2)
			}
		}

		if (parseInt($("#tiles-remaining").html(), 10) < 3) {
			this.Page.button_change("dump", 0);
		}

		if (!$("#dump").hasClass("hidden")) {
			this.Page.button_change("dump", 1);
		}
	};

	Board.prototype.remove_letter = function(row, col) {
		var letter = $("#row" + row).children(".col"+col).html();
		$("#row"+row).children(".col"+col).html("").removeClass("filledTile").unbind("click");
		this.hand.add_tile(letter);
		this.remove_extra_rows();
	};

	Board.prototype.expand_board_one = function(direction) {
		switch (direction) {
			case ("up"): {
				for (var i = 0; i < this.boardrows; i++) {
					$("#row"+(this.boardrows-1-i)).attr("id", "row"+(this.boardrows-i));
				}
				$("#board > div").prepend("<div id='row0'></div>");
				for(var j = 0; j < this.boardcols; j++) {
					$("#row0").append("<div class='tile col"+j+"'></div>");
				}
				this.boardrows++;
				break;
			}

			case ("down"): {
				$("#board > div").append("<div id='row"+this.boardrows+"'></div>");
				for(var j = 0; j < this.boardcols; j++) {
					$("#row"+this.boardrows).append("<div class='tile col"+j+"'></div>");
				}
				this.boardrows++;
				break;
			}

			case ("left"): {
				for (var i = 0; i < this.boardcols; i++) {
					$(".col"+(this.boardcols-1-i)).removeClass("col"+(this.boardcols-1-i))
												  .addClass("col"+(this.boardcols-i));
				}
				$("#board > div > div").prepend("<div class='tile col0'></div>");
				this.boardcols++;
				break;
			}

			case ("right"): {
				$("#board > div > div").append("<div class='tile col"+this.boardcols+"'></div>");
				this.boardcols++;
				break;
			}

			default: {
				break;
			}
		}
	};

	Board.prototype.reduce_board_one = function(direction) {
		switch (direction) {
			case ("up"): {
				$("#row0").remove();
				for (var i = 1; i < this.boardrows; i++) {
					$("#row"+i).attr("id", "row"+(i-1));
				}
				this.boardrows--;
				break;
			}

			case ("down"): {
				$("#row"+(this.boardrows-1)).remove();
				this.boardrows--;
				break;
			}

			case ("left"): {
				$(".col0").remove();
				for (var i = 1; i < this.boardcols; i++) {
					$(".col"+i).removeClass("col"+i).addClass("col"+(i-1));
				}
				this.boardcols--;
				break;
			}

			case ("right"): {
				$(".col"+(this.boardcols-1)).remove();
				this.boardcols--;
				break;
			}

			default: {
				break;
			}
		}
	};

	return Board;
})();

var Hand = (function() {
	function Hand(board) {
		board.hand = this;
		this.board = board;
	}

	Hand.prototype.add_tile = function(letter) {
		var handcontext = this;
		$("#hand").append("<div class='tile filledTile'>"+letter+"</div>");
		$("#hand > :last-child").click(function() {
			var clickedtilecontext = this;
			$(this).toggleClass("clicked");
			if ($(this).hasClass("clicked")) {
				if (!$("#dump").hasClass("hidden")) {
					handcontext.board.Page.button_change("dump", 2);
				}
				$("#hand > .tile").not(this).removeClass("clicked");
				$(".tile:not(.filledTile)").unbind("click").click(function() {
					$(".tile:not(.filledTile)").unbind("click");
					$(this).unbind("click");
					var row = parseInt($(this).parent().attr("id").replace(/[^0-9]/g, ""), 10);
					var col = parseInt($(this).attr("class").replace(/[^0-9]/g, ""), 10);
					$(clickedtilecontext).remove();
					handcontext.board.add_letter(row, col, letter);
				});
			} else if (!$("#dump").hasClass("hidden")) {
				handcontext.board.Page.button_change("dump", 1);
			}
		});
		if (!$("#peel").hasClass("hidden")) {
			this.board.Page.button_change("peel", 1);
		} else if (!$("#bananas").hasClass("hidden")) {
			this.board.Page.button_change("bananas", 1)
		}
	};

	return Hand;
})();