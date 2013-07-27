var Player = (function() {
	function Player(socket, name) {
		this.socket = socket;
		this.name = name;
		this.tiles = [];
	}

	return Player;
})();

module.exports = Player;