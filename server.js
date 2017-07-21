//create server
var express = require('express');
var app = express();
app.use(express.static("public")); //static files go to public folder

//set view engine to ejs
app.set('view engine', 'ejs');

//express form data from server side
var bodyParser = require('body-parser');
//urlencoded
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

//start game
var bot = require('./communication.js')

//Later this should be put together in a game object -> neater
var battleformat ='';
var userID ='';
var password = '';

app.listen(process.env.app_port || 8080);

bot.initializeBot();

//index
app.get('/', function(req, res) {
	res.render('pages/index');
});

app.post('/confirminput', function (req, res) {
	userID = req.body.userID;
	password = req.body.password;
	battleformat = req.body.battleformat;
	//console.log(req.body);
	console.log('Logging in');

	//login to server
	if (userID != null && password != null) {
		bot.setID(userID, password, battleformat);
	}
});


app.get('/startbattle', function(req,res){
	console.log('Initiating Battle');
	bot.startRandomBattle();
});

