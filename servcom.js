var updateStates = require('./updatestates.js').UpdateStates;


// connect to server
var sockjs = require('sockjs-client-ws');
var client = null;
client = sockjs.create("http://sim.smogon.com:8000/showdown");

if(client) {
	client.on('connection', function() {
		console.log('Successfully Connected \n');
	});
}


//receiving and sending messages
client.on('data', function (msg) {
	updateStates(msg, client);
}
)




