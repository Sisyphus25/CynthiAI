var updateStates = require('./updatestates.js').UpdateStates;

//contain functions for import and export team
var Tools = require('./database/tools.js')

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var customTeam = ''; 

//urlencoded
app.use(bodyParser.urlencoded({extended:false}));

app.use(bodyParser.json());

//retrieve dir from public folder
app.use(express.static('public'));

app.get('/index.htm', function (req, res) {
   res.sendFile( __dirname + "/" + "index.htm" );
})


//Go to localhost:8081/index.htm to import team

app.get('/process_get', function (req, res) {
	// Prepare output in JSON format
	var teamArray = Tools.importTeam(req.query.PkTeam); //req.query.Pkteam is the field inside the textbox
	customTeam = Tools.packTeam(teamArray);
	console.log('customTeam received');

	//Connect to server
	var sockjs = require('sockjs-client-ws');
	var client = null;
	client = sockjs.create("http://sim.smogon.com:8000/showdown");

	if(client) {
		client.on('connection', function() {
			console.log('Successfully Connected');
		});
	}

	//login 
	client.on('data', function (msg) {
		var parts;
		
		//Logging
		console.log(msg);
		if(msg.charAt(0) === '|' || msg.charAt(0) === '>') {
			parts = msg.substr(1).split('|');
		} 
		else {
			parts =[];
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
					//console.log("this is my custom team +\n"+customTeam);

					request = "|/trn " + "CynthiAI" + ",0," + data.assertion; 
					client.write(request); //send assertion to server to confirm login
					client.write("|/avatar 260"); //set sprite to Cynthia
					client.write("|/utm "+ customTeam);
					//client.write("|/vtm ubers")
					client.write("|/challenge deep__focus__, gen7customgame");//challenge 				
				}
			);
		}

		//automate bot response
		if (parts[0].includes('gen7customgame')) {
			if (parts[1] === 'title') {
				room = parts[0];
				console.log('Currently in '+room);
				room = room.replace(/\n|\r/g,'');
				//initiate timer
				client.write(room+"|/timer on");
					
			}
				

			if (parts[1] === 'error') {
				if (parts[2].includes('teampreview response')) {
					client.write(room+"|/team 123456|3");					}
				else {
					_switchChoice++;
					client.write(room + "|/switch " + _switchChoice);
					if (_switchChoice>=6) _switchChoice = 1;
				}
			}
				

			if (parts[1] === 'request') {
				//side = JSON.parse(parts[2]);
				client.write(room + '|/move');
				_switchChoice = 1;
			}

			console.log('<<<');
			console.log(msg + "\n\n" );
		}

	});
})

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)

});
