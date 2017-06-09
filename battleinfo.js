//add a Pokemon whenever OpponentSide reveal a new Pokemon
//access Pokemon object by OpponentSide["name"] or OpponentSide.name
//OpponentSide have elements in the form of {name : Pokemon (Object)}
function OpponentSide() {
	this.addPokemon = function (Pokemon) {
		this[Pokemon.name] = Pokemon; //hmm do I need to convert Pokemon.name to a string?
	}
	
	this.getPokemon = function (name) {
		return this[name];
	}
}

//create a new Pokemon object whenever a new Pokemon is revealed, update name, active, level, hp upon initiating
//TODO: WRITE GET FUNCTIONS FOR EACH ATTRIBUTE
//TODO: NEED AN ITEM ATTRIBUTE, AND ABILITY ATTRIBUTE, AND BOOST ATTRIBUTE
function Pokemon(name, forme) {
	this.name = name;
	this.forme = forme;
	this.active = null;
	this.level = null;
	this.status = null;
	this.item = null;
	this.ability = null;
	this.boost = null;
	this.gender = null;
	this.hp = null;
	this.moves = null;
	this.disabledmove = null;
	
	this.setName = function (name) {
		this.name = name;
	}
	this.setForme = function (forme) {
		this.forme = forme;
	}
	this.setActive = function (bool){
		this.active = bool;
	}
	this.setLevel = function (level) {
		this.level = level;
	}
	this.setStatus = function (status) {
		this.status = status;
	}
	this.setItem = function (item) {
		this.item = item;
	}
	this.setAbility = function (ability) {
		this.ability = ability;
	}
	this.setBoost = function (stat, boost){
		this.boost[stat] += boost;
	}
	this.setGender = function(gender) {
		this.gender = gender;
	}
	this.setHp = function (hp) {
		this.hp = hp;
	}
	this.setMoves = function() {
		this.moves = new Moves();
	}
}

//whenever a new move is revealed, create new Move object and add it into Moves 
function Moves () {
	this.addMove = function (Move) {
		this[Move.name] = Move;//same question: do I need to convert move.name to string?
	}
	
	this.getMove = function (name) {
		return this[name];
	}
	
}

//whenever collecting a move from the opponent, search database for pp, and remember to keep track of pp
//TODO: WRITE GET AND SET FUNCTIONS
function Move (moveName) {
	this.name = moveName;
	this.pp = null;
	this.maxPp = null;
	this.disabled = false;

	//perhaps write a getMaxPP method, upon this.name != null
}

function Boost () {
	this.atk = 0
	this.def = 0
	this.spa = 0
	this.spd = 0 
	this.spe = 0
	this.accuracy = 0 //accuracy
	this.evasion = 0 //evasion
}

function Field () {
	this.botcondition = new Array();
	this.oppcondition = new Array();
	this.weather = null;
	this.pseudoweather = new Array();
	this.terrain = null;
	
	this.setBotCondition = function(condition) {
		this.botcondition.splice(0, 0, condition);
	}
	this.removeBotCondition = function (condition) {
	    var index = this.botcondition.indexOf(condition);
	    if (index!=-1) {
	        this.botcondition.splice(index, 1);
	    }
	}
	this.setOppCondition = function(condition) {
		this.oppcondition.splice(0, 0, condition);
	}
	this.removeOppCondition = function (condition) {
	    var index = this.oppcondition.indexOf(condition);
	    if (index!=-1) {
	        this.oppcondition.splice(index, 1);
	    }
	}
	this.setWeather = function (weather) {
		this.weather = weather;
	}
	this.addPseudoWeather = function(pseudoweather) {
		this.pseudoweather.splice(0, 0, pseudoweather);
	}
	this.removePseudoWeather = function (pseudoweather) {
	    var index = this.pseudoweather.indexOf(pseudoweather);
	    if (index!=-1) {
	        this.pseudoweather.splice(index, 1);
	    }
	}
	this.setTerrain = function(terrain) {
		this.terrain = terrain;
	}
}

module.exports.OpponentSide = OpponentSide;
module.exports.Pokemon = Pokemon;
module.exports.Moves = Moves;
module.exports.Move = Move;
module.exports.Boost = Boost;
module.exports.Field = Field;


//for testing/referencing purpose only
//var charizard = new Pokemon("Charizard");
//var side = new OpponentSide();
//side.addPokemon(charizard);
//console.log(side.getPokemon("Charizard"));