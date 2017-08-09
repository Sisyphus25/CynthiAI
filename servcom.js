var updateStates = require('./updatestates.js').UpdateStates;
var request = require('request');
var Scripts = require('./zarel/data/scripts').BattleScripts;
var util = require('./util');
global.Tools = require('./zarel/tools.js').includeMods();
var CynthiAgent = require('./cynthiagent.js').CynthiAgent;
var Perspective = require('./interfacelayer.js').InterfaceLayer;

// connect to server
var sockjs = require('sockjs-client-ws');
var client = null;
client = sockjs.create("http://sim.smogon.com:8000/showdown");

if(client) {
	client.on('connection', function() {
		console.log('Successfully Connected \n');
	});
}

var login = function (msg, client) {
    //handling receiving/sending messages
    var parts;
    if(msg.charAt(0) === '|' || msg.charAt(0) === '>') {
    		parts = msg.substr(1).split('|');
   		}
   	else {
   		parts =[];
   	}

	//basically to obtain CHALLSTR, which is required for logging in
   	if (parts[0]==="challstr") {
   		var key_id = parts[1];
    	var Challenge = parts[2];
   		var CHALLSTR = key_id + "|" + Challenge;

   		//send POST request to login server
   		request.post({
    		url : 'http://play.pokemonshowdown.com/action.php',
   			form : {
   				act: 'login',
   				name: 'CynthiAI beta',
   				pass: 'Pokemon',
   				challstr : CHALLSTR
   			}},
   			//upon receiving a message from server after POST req is sent, this function will run
   			function (err, response, body) {
   				var data = util.safeJSON(body);
   				//console.log(data);
   				request = "|/trn " + "CynthiAI beta" + ",0," + data.assertion;

   				client.write(request); //send assertion to server to confirm login
   				client.write("|/avatar 260"); //set sprite to Cynthia
   				//client.write("|/challenge dadangminh, gen7randombattle");//challenge daDangminh on ranbatt
   				client.write("|/search gen7randombattle");
   			}
   		);
   	}
}

var cynthiagent = new CynthiAgent();
var bot = new Perspective('Local room', 'CynthiAI beta', null, cynthiagent);
var request;

//receiving and sending messages
client.on('data', function (msg) { //TODO: change sides p1 p2 thing to a variable, since bot may not be the one challenging but receiving challenge.
	console.log(msg);
	if(msg.indexOf('|inactive') > -1) return; //in order to not run agent.decide upon receiving this msg
	var parts;
	if(msg.charAt(0) === '|' || msg.charAt(0) === '>') {
		parts = msg.substr(1).split('|');
	}
	else {
		parts =[];
	}

    login(msg, client); //handling logging in and challenging
    if (parts[1] == 'request') {
		request = JSON.parse(parts[2]);
	}
    /*
    class InterfaceLayer (id, username, cLayer, agent) {
        InterfaceLayer is what updates game states as the game progresses
        InterfaceLayer reads battle log (which was collected by Battle class), process the logs and updates accordingly

        this.battle.side[0] or this.battle.side[1] contain bot or opponent's team information. Each of these sides will be updated as the game progresses
    }
    */
    bot.process(msg); //basically to process message sent from server to extract game information
	/*
	Basic idea: bot will feed gamestate information into cynthiagent, which does the simulation to return a decision
	then the decision will be sent from here
	*/

    if (parts[0].includes('gen7randombattle')) {
    	if (parts[1] === 'init') {
    		room = parts[0];
    		room = room.replace(/\n|\r/g,'');

    		//initiate timer
    		client.write(room+"|/timer on");
    	}
    	if (parts[1] === 'error') {
    		if (parts[2].startsWith('[Invalid choice] There')) { //nothing to choose
    			//do nothing
    		}//TODO: there is [Invalid choice]: Can't move. choose another move
    		//TODO: there is also [invalid choice]: Can't switch.
			if (parts[2].indexOf('a switch response')>-1 || parts[2].indexOf('switch to a fainted')>-1) { //need switch
    			if (bot.battle.sides[bot.mySID] !== null) {
					var action = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], true); //activate CynthiAgent
                }
                console.log('Action chosen: ' + action);
                console.log('\n');
    			client.write(room + "|/" + action);
    		}
    	}


    	if (msg.indexOf('|turn|') > -1) {
    		if (bot.battle.sides[bot.mySID] !== null) {
                var action = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], false); //activate CynthiAgent
            }
    		//side = JSON.parse(parts[2]);
    		if (action) {//in case action is undefined, this will be an error, therefore the condition
    			console.log('Action chosen: ' + action); //
                console.log('\n');
    			client.write(room + '|/' + action);
    		}
    		else {
    			console.log('ACTION NOT CHOSEN LEL');
    			client.write(room + '|/move');
    		} // (msg.indexOf('|turn|')>-1) || (request && request.forceSwitch && msg.indexOf('|choice') > -1)
    	}
    	//console.log('request.forceSwitch: ' + request.forceSwitch);
    	//console.log(msg.indexOf('|inactive') > -1);
    	if (request && request.forceSwitch && msg.indexOf('|choice') > -1) { //if forceswitch
    		console.log('ACTION IS CHOSEN AFTER THIS MSG: \n')
    		console.log(msg);
    		if (bot.battle.sides[bot.mySID] !== null) {
                var action = bot.agent.decide(bot.battle, bot.cTurnOptions, bot.battle.sides[bot.mySID], true); //activate CynthiAgent
            }
    		//side = JSON.parse(parts[2]);
    		if (action) {//in case action is undefined, this will be an error, therefore the condition
    			console.log('Action chosen: ' + action); //
                console.log('\n');
    			client.write(room + '|/' + action);
    		}
    		else {
    			console.log('ACTION NOT CHOSEN LEL');
    			client.write(room + '|/move');
    		}
    	}


		//console.log(bot.battle.sides);
		//console.log(bot.mySID);
		//console.log(bot.battle.sides[bot.mySID]);
   	}

});




