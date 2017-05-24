var request = require('request'); // Used for making post requests to login server
var fs = require('fs');

//connect to PC port
var http = require('http');

//Connect to server
var sockjs = require('sockjs-client-ws');
var client = null;
client = sockjs.create("http://sim.smogon.com:8000/showdown");

if(client) {
	client.on('connection', function() {
		console.log('Successfully Connected');
	});
}

//util
util = require('./util');

//login 
client.on('data', function (msg) {
	console.log(msg)
	var parts;
	if(msg.charAt(0) === '|') {
		parts = msg.substr(1).split('|');
	} else {
		parts = [];
	}
	//basically to obtain CHALLSTR, which is required for logging in
	if (parts[0]=="challstr") {
		var key_id = parts[1]
		var Challenge = parts[2]
		var CHALLSTR = key_id + "|" + Challenge
		
		//send POST request to login server
		request.post({
			url : 'http://play.pokemonshowdown.com/action.php',
			form : {
				act: 'login',
				name: 'CynthiAI',
				pass: 'Pokemon',
				challstr : CHALLSTR
			}},

			//upon receiving a message from server after POST req is sent, this function will run
			function (err, response, body) {
				var data = util.safeJSON(body);
				//console.log(data);
				request = "|/trn " + "CynthiAI" + ",0," + data.assertion; 
				client.write(request); //send assertion to server to confirm login
				client.write("|/avatar 260"); //set sprite to Cynthia
				client.write("|/challenge deep__focus__, gen7randombattle");//challenge daDangminh on ranbatt

			}
		);
	}
})