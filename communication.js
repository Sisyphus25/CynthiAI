var request = require('request');
var util = require('./util');
// gamestate simulation
var CynthiAgent = require('./cynthiagent.js').CynthiAgent;
var Perspective = require('./interfacelayer.js').InterfaceLayer;
//helper functions
global.Tools = require('./zarel/tools.js').includeMods();
var ExtraTools = require('./database/tools.js');

//logging 
var fs = require('fs'); 

// required connect to server
var sockjs = require('sockjs-client-ws');

//default ID that the bot will use to login
var ID = require('./userID.js').ID;

var Bot = function(){
};

Bot.prototype.initializeBot = function(userID, password, battleFormat) {	
	this.ROOMS = {};
	this.NOOFROOMS = 0;
	//check for existing client 		
	this.onTestingMode = false; //if true the bot will automatically start battling
	this.battleFormat = '';
	this.ID = '';
	this.password = '';
	this.acceptChallenges = false; //if true the bot will automatically accepts all challenges
	//recInterval is for reconnect when client disconnects
	this.recInterval = null;
	this.client = {};
	//check for successful login
	this.nextID = '';
	this.successfulLogin = false;
	//create Server
	this.createShowdownServer();
};

Bot.prototype.setID = function(userID, password, battleFormat) {	
	this.battleFormat = battleFormat;
	if (userID != null && password != null) {
		//this.ID = userID;
		this.password = password;
		this.nextID = userID;
	}
	else {
		//this.ID = 'CynthiAI';
		this.nextID = ID.userID;
		this.password = ID.password;
	}
	if (!this.client)
		this.createShowdownServer();
	else {
		this.login();
	}				
};

//reserved for testing the performance of the bot
Bot.prototype.startTesting = function() {
	this.setID(ID.userID, ID.password,'gen7randombattle');	
};

Bot.prototype.createShowdownServer = function() {
	var client = sockjs.create("http://sim.smogon.com:8000/showdown");
	clearInterval(this.recInterval);
	var thisBot = this;
	this.client = client;
	//automatically reconnect
	client.on('close',function() {
		socket = null;
		thisBot.recInterval = setInterval(function() {
			thisBot.createShowdownServer();
		}, 5000);
	});
	client.on('error',function(err) {
		console.log(err);
	})

	//receiving and sending message
	client.on('data', function (msg) {
		thisBot.processMessage(msg);
	});
};

Bot.prototype.login = function() {
	var client = {};
	var loginname = '';
	var loginpass = '';

	if (this.client) {
		this.client.write('|/logout');
	}

	client = this.client;
	
	loginname = this.ID;
	loginpass = this.password;
	
	//send POST request to login server
	request.post({
		url : 'http://play.pokemonshowdown.com/action.php',
		form : {
			act: 'login',
			name: loginname,
			pass: loginpass,
			challstr : this.CHALLSTR
		}},

		//upon receiving a message from server after POST req is sent, this function will run
		function (err, response, body) {
			var data = util.safeJSON(body);
			let _request = "|/trn " + loginname + ",0," + data.assertion; 
			client.write(_request); //send assertion to server to confirm login
			client.write("|/avatar 260"); //set sprite to Cynthia
		}
		); 
};

Bot.prototype.logout = function() {
	this.client.send('|/logout');
};

Bot.prototype.sendingChallenge = function(userID, battleFormat, customTeamText) {
	//reading custom team
	var teamArray = '';
	var customTeam = '';
	if (customTeamText != null) {
		var teamArray = ExtraTools.importTeam(customTeamText); 
		var customTeam = ExtraTools.packTeam(teamArray);
	}
	//start game
	if (battleFormat == "gen7customgame") {
		this.client.write("|/utm "+ customTeam);
		this.client.write("|/challenge " + userID + ", gen7customgame");
	}
	else if (battleFormat == "gen7randombattle") {
		this.client.write("|/challenge " + userID + ", gen7randombattle");
	}
};

//Let the bot challenge random player
Bot.prototype.startRandomBattle = function() {
	if (this.battleFormat = 'gen7randombattle') {
		this.client.write('|/utm null');
		this.client.write('|/search gen7randombattle');	
	}
	else if (this.battleFormat = 'gen7unratedrandombattle') {
		this.client.write('|/utm null');
		this.client.write('|/search gen7unratedrandombattle');	
	}
};

Bot.prototype.addRoom = function(roomtitle, botvsuser) {
	this.ROOMS[roomtitle] = new Room(roomtitle, botvsuser, this.ID);
	this.NOOFROOMS += 1;
};

Bot.prototype.removeRoom = function(rmnumber) {
	var room = this.ROOMS[rmnumber];
	if(room) {
		delete this.ROOMS[rmnumber];
		return true;
		Bot.NOOFROOMS -= 1;
	}	
	return false;
};

Bot.prototype.processMessage = function(message) {
	var parts;
	var roomtitle; // At the start of every messages directed to a battle, has the format "battle-battletype-roomnumber"
	var request;

	var msg = message.replace(/^\s+/,"");

	if(msg.charAt(0) === '|' || msg.charAt(0) === '>') {
		parts = msg.substr(1).split('|');
	}
	else {
		parts =[];
	}

	console.log("Start of server message\n "+msg+"\n\n");

	if (parts[0] != null) {
		//basically to obtain CHALLSTR, which is required for logging in
		if (parts[0]=="challstr") {
			var key_id = parts[1];
			var Challenge = parts[2];
			var CHALLSTR = key_id + "|" + Challenge;
			if (!this.CHALLSTR || this.CHALLSTR != CHALLSTR) {
				this.CHALLSTR = CHALLSTR;
			}
			//for testing
			if (this.onTestingMode) {
				this.startTesting();
			}
		}

		else if (msg.includes('updateuser|')) {
			this.ID = parts[1];
			if (parts[1] == this.nextID) {
				this.successfulLogin = true;
			}
			if (this.onTestingMode) {
				this.startRandomBattle(); //trigger testing
			}
		}

		else if (msg.includes('|nametaken|')) {
			if (parts[1] == this.nextID) {
				this.successfulLogin = false;
			}
		}	

		else if (msg.includes("updatechallenges")) { //acepting challenges from others
			var challenge = JSON.parse(parts[1]);
			//turn off auto accepting challenge for now
			/**
			if (challenge.challengesFrom != null) {
				var challengeobj = Object.keys(challenge.challengesFrom);
				var challenger = challengeobj[0];
				var format = challenge.challengesFrom[challenger];
				if (!this.onTestingMode) { //to prevent the bot from taking too many battles
					if (format == "gen7randombattle") {
						this.client.write("|/utm null");
						this.client.write("|/accept "+ challenger);
					}
					else if (format == "gen7customgame") {
						//Have to feed it some custom team here
						this.client.write("|/accept "+ challenger);
					}
					else if (format!= null) {
						console.log("Sorry, but the bot can't accept game of this format: " + format);
					}
				}
				else {
					this.client.write('|/reject ' + challenger);
				}
			}
			**/
		}

		if (parts[0].includes("battle")) {
			roomtitle = parts[0].replace(/\n|\r/g,'');
			if (!this.ROOMS[roomtitle]) {
				var botvsuser = '';
				if (msg.includes('|init|')) {
					var botvsuser = parts[4];
					this.addRoom(roomtitle, botvsuser);
					this.client.write(roomtitle+'|/timer on');
				}
				//for testing -- to speed up testing
				if (this.onTestingMode) {
					if (this.NOOFROOMS < 4) {
						this.startRandomBattle();
					}
				}
			}

			else {
				if (msg.includes('|win|')) {						
					var logStream = fs.createWriteStream('winloss.txt', {'flags': 'a'});
					// use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
					logStream.write('\n'+ this.ROOMS[roomtitle].botvsuser);
					if (msg.includes(this.ID)) {
						logStream.write('You win!\n');
					}
					else {
						logStream.write('You lose!\n');		
					}
					logStream.end('')

					this.client.write('|/leave ' + roomtitle);
					this.removeRoom(roomtitle);
					
					//on testingmode
					if (this.onTestingMode) {
						this.client.write('|/utm null');
						this.client.write('|/search gen7randombattle');
					}
				}
				else if (msg.includes('|l|') || msg.includes('|leave|')) {
					this.client.write(roomtitle+'|/timer on')
				}
				else {
					var bot = this.ROOMS[roomtitle].bot;
					var agent = this.ROOMS[roomtitle].cynthiagent;

					bot.process(msg); //basically to process message sent from server to extract game
					if (parts[1] === 'request') {
						request = JSON.parse(parts[2]);
						if (request.teamPreview) {
							if (bot.battle.sides[bot.mySID].n == 0)
								this.client.send(roomtitle + "|/team 123456|2"); //dummy
							else if (bot.battle.sides[bot.mySID].n == 1)
								this.client.send(roomtitle + "|/team 123456|3");
						}
						else if (request.forceSwitch) {
							//console.log("Have to switch now!");
							this.ROOMS[roomtitle].forceSwitch = true;
						}
						else if (request.active ) {
							//console.log("Have to make a move now!")
						}
					}
					else if (msg.includes('error') || msg.includes('Invalid')) {
						if (parts[2].startsWith('[Invalid choice] There')) { //nothing to choose
						}//TODO: there is [Invalid choice]: Can't move. choose another move
					//TODO: there is also [invalid choice]: Can't switch.
						if (parts[2].indexOf('a switch response') >-1 || parts[2].indexOf('switch to a fainted')>-1) { //need switch
							if (bot.battle.sides[bot.mySID] !== null) {
								let move = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], true); //activate CynthiAgent
								this.client.send(roomtitle+"|/"+move);
							}
						}
					} 
					else if (this.ROOMS[roomtitle].forceSwitch && msg.includes('|choice')) {
						this.ROOMS[roomtitle].forceSwitch = false;
						var move;
						if (bot.battle.sides[bot.mySID] !== null) {
							move = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], true); //activate CynthiAgent
						}
						if (move) {//in case action is undefined, this will be an error, therefore the condition
							this.client.send(roomtitle + '|/' + move);
						}
						else {
							this.client.send(roomtitle + '|/move');
						}
					}
					if (msg.indexOf('|turn|') > -1 ) {
						var move;
						if (bot.battle.sides[bot.mySID] !== null) {
							move = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], false); //activate CynthiAgent
						}
						if (move) {//in case action is undefined, this will be an error, therefore the condition
							this.client.send(roomtitle + '|/' + move);
						}
						else {
							this.client.send(roomtitle + '|/move');
						}	
					}
				}
			}
		}
	}
};

module.exports.Bot = Bot;

var Room = function(roomtitle, botvsuser, userID) {
	var roomParts = roomtitle.split('-');
	this.botvsuser = botvsuser;
	this.room = roomtitle;
	this.roomNumber = roomParts[2];
	this.battleType = roomParts[1];
	this.cynthiagent = new CynthiAgent();
	this.bot = new Perspective('Local room', userID, null, this.cynthiagent);
	this.forceSwitch = false;
};
