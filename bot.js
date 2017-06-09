var request = require('request');
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

	//on receiving message from server
	client.on('data', function (msg) {
		//keep track and update states, also loggin in goes here
		updateStates(msg, client);
	});
})

var server = app.listen(8081, function () {
 	var host = server.address().address
   	var port = server.address().port
   	console.log("Example app listening at http://%s:%s", host, port)

});
