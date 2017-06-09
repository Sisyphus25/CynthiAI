var request = require('request');
var util = require('./util');
var battleinfo = require('./battleinfo.js');
var BattleMovedex = require('./database/moves.js').BattleMovedex;
var Pokedex = require('./database/pokedex.js').BattlePokedex;


var OpponentSide = battleinfo.OpponentSide;
var Pokemon = battleinfo.Pokemon;
var Moves = battleinfo.Moves;
var Move = battleinfo.Move;
var Boost = battleinfo.Boost;
var Field = battleinfo.Field;

//state variables
var botSide
var opponentSide = new OpponentSide();
var field = new Field;
var currActive = null;

module.exports.UpdateStates = function (msg, client) {
	//basically if message contains any of |request|, |error| or |inactive|, then the message is not logged (too messy)
	if (msg.indexOf('|request|')==-1 && msg.indexOf('|inactive|')==-1){
		console.log("new message:")
		console.log(msg);
		console.log('\n')
	}
	
	//handling receiving/sending messages
	var parts;
	
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
				console.log(data);
				request = "|/trn " + "CynthiAI" + ",0," + data.assertion; 
				
				client.write(request); //send assertion to server to confirm login
				client.write("|/avatar 260"); //set sprite to Cynthia
				client.write("|/challenge dadangminh, gen7randombattle");//challenge daDangminh on ranbatt
			}
		);
	}
	
	
	
	//if messsage sent is battle log:
	if (msg.startsWith('>battle')) {
		
		//if message received has >battle and |request| in it, then extract botside info
		//TODO: add weight and status attribute to each pokemon in botSide, also 2-turn moves
		//TODO: add volatileStatus attribute (substitute, confusion, destiny bond, snatch, protect, quickguard, attract, trapped, sticky web): |-start|, |-end|
		//TODO: how about |-activate|, |-singlemove|, |-singleturn|, |-endability|
		var requestPos = msg.indexOf('|request|');
		if (requestPos!=-1) {
			botSide = JSON.parse(msg.substr(requestPos+9));
		}
		
		
		//CODE TO SET UP OPPONENTSIDE GOES HERE
		//is there a need to somehow associate opponent side to the player's username?
		//is CynthiAI always p2? currently it is assumed that CynthiAI is always p2, but if otherwise, state info may be messed up
		
		
		//UPDATE SWITCH
		var switchP1Pos = msg.indexOf('|switch|p1a');
		if (switchP1Pos!=-1) {
			var endPos = msg.substr(switchP1Pos).indexOf('/100')+4;
			var switchinfo = msg.substring(switchP1Pos+13, switchP1Pos+endPos).split(', '); //['Name|forme', level, gender|hp]

			var name = switchinfo[0].split("|")[0];
			var forme = switchinfo[0].split("|")[1]
			var level = null;
			var gender = null;
			var hp = null; //remember hp of opponent is in % form, so it's sufficient to store hp as a number (80 instead of 80/100)
			
			if (switchinfo.length == 3) { //['Name|forme', level, gender|hp]
				var level = switchinfo[1].substr(1);
				var gender_hp = switchinfo[2].split("|");
				var gender = gender_hp[0];
				var hp = gender_hp[1].split("/")[0];
			} 
			else if (switchinfo.length == 2) {
				var level_hp = switchinfo[1].split("|");
				var level = level_hp[0].substr(1);
				//gender = null
				var hp = level_hp[1].split("/")[0];
			}
			else {
			    console.log("THERE IS AN ERROR WITH SWITCHINFO VAR")
			    console.log(switchinfo);
		    }
			//initiate new Pokemon(name, forme), setActive, setLevel, setGender, setHp
			//TODO: predict stats (at least speed) based on pokemon and its level
			var nameId = forme;
			while (nameId.indexOf("-")!=-1 || nameId.indexOf(" ")!=-1) {
			    nameId = nameId.replace("-", "");
			    nameId = nameId.replace(" ", "");
			}
			nameId = nameId.toLowerCase();
			console.log("forme ID: " + nameId);
            //possible abilities
			var possible_abilities = new Array()
			for (key in Pokedex[nameId].abilities) {
			   var possibleAbility = Pokedex[nameId].abilities[key];
			   possible_abilities.splice(0, 0, possibleAbility);
			}
			console.log("Possible abilities: ");
			console.log(possible_abilities);
			//newpoke
			var newpoke = new Pokemon(name, forme);
			newpoke.setActive(true);
			newpoke.setLevel(level);
			newpoke.setGender(gender);
			newpoke.setHp(hp);
			newpoke.setMoves();
			newpoke.boost = new Boost();
			if (possible_abilities.length == 1) {
			    newpoke.setAbility(possible_abilities[0]);
			}
			else {
			    newpoke.setAbility(possible_abilities);
			}
			//reset boost upon switching out, remember to set active to false for the current active mon, and then replace it with the new active mon
			if (currActive!=null) {
				currActive.setActive(false);
				currActive.boost = new Boost();
				if (currActive.disabledmove != null) {
				    currActive.moves[currActive.disabledmove].disabled = false;
				}
				currActive = newpoke;
			}
			else {currActive = newpoke;}
			//if name not in opponentside, add new Pokemon(name, forme)
			if (!opponentSide.hasOwnProperty(newpoke.name)) {
				opponentSide.addPokemon(newpoke);
				console.log(opponentSide);
				console.log('\n');
			}
		}



		//UPDATE DRAG (like whirlwind, dragontail)
		var dragP1Pos = msg.indexOf("|drag|p1a:");
		if (dragP1Pos!=-1) {
		    endPos = msg.substr(dragP1Pos).indexOf('/100')+4;
			var draginfo = msg.substring(dragP1Pos+11, dragP1Pos+endPos).split(', '); //['Name|forme', level, gender|hp]

			var name = draginfo[0].split("|")[0];
			var forme = draginfo[0].split("|")[1]
			var level = null;
			var gender = null;
			var hp = null; //remember hp of opponent is in % form, so it's sufficient to store hp as a number (80 instead of 80/100)

			if (draginfo.length == 3) { //['Name|forme', level, gender|hp]
				var level = draginfo[1].substr(1);
				var gender_hp = draginfo[2].split("|");
				var gender = gender_hp[0];
				var hp = gender_hp[1].split("/")[0];
			}
			else if (draginfo.length == 2) {
				var level_hp = draginfo[1].split("|");
				var level = level_hp[0].substr(1);
				//gender = null
				var hp = level_hp[1].split("/")[0];
			}
			else {
			    console.log("THERE IS AN ERROR WITH DRAGINFO VAR")
			    console.log(draginfo);
			}
			//initiate new Pokemon(name, forme), setActive, setLevel, setGender, setHp
			//TODO: predict stats (at least speed) based on pokemon and its level
			var nameId = forme;
			while (nameId.indexOf("-")!=-1) {
			    nameId.replace("-", "");
			}
			nameId = nameId.toLowerCase();
			//possible ability
			var possible_abilities = new Array()
			for (key in Pokedex[nameId].abilities) {
			   var possibleAbility = Pokedex[nameId].abilities[key];
			   possible_abilities.splice(0, 0, possibleAbility);
			}
			console.log("Possible abilities: ");
			console.log(possible_abilities);
			//newpoke
			var newpoke = new Pokemon(name, forme);
			newpoke.setActive(true);
			newpoke.setLevel(level);
			newpoke.setGender(gender);
			newpoke.setHp(hp);
			newpoke.setMoves();
			newpoke.boost = new Boost();
			if (possible_abilities.length == 1) {
			    newpoke.setAbility(possible_abilities[0]);
			}
			else {
			    newpoke.setAbility(possible_abilities);
			}
			//reset boost and disabled upon switching out, remember to set active to false for the current active mon, and then replace it with the new active mon
			if (currActive!=null) {
				currActive.setActive(false);
				currActive.boost = new Boost();
				if (currActive.disabledmove != null) {
				    currActive.moves[currActive.disabledmove].disabled = false;
				}
				currActive = newpoke;
			}

			else {currActive = newpoke;}
			//if name not in opponentside, add new Pokemon(name, forme)
			if (!opponentSide.hasOwnProperty(newpoke.name)) {
				opponentSide.addPokemon(newpoke);
				console.log(opponentSide);
				console.log('\n');
		    }
		}



		//UPDATE MOVES
		//there might be moves with varying types (technoblast, weatherball)
		var moveP1Pos = msg.indexOf('|move|p1a');
		if (moveP1Pos!=-1) {
			endPos = msg.substr(moveP1Pos).indexOf('\n');
			var move_arr = msg.substring(moveP1Pos+11, moveP1Pos+endPos).split("|"); //["Slowbro", "Calm Mind", "p1a: Slowbro"]
			var moveName = move_arr[1]
			//in case of error, hopefully this won't happen
			if (currActive.name != move_arr[0]) {
				console.log("ERROR: currActive is not the same as move source");
				console.log("currActive: "+currActive.name);
				console.log("move source: "+move_arr[0]);
			}
			
			//if the move recently used had already been revealed
			if (currActive.moves.hasOwnProperty(moveName)) {
				currActive.moves[moveName].pp -= 1; 
				}//TODO: HOW ABOUT PRESSURE???
			else { //otherwise, it is a new move
				var newmove = new Move(moveName);
				
				// SETMAXPP GOES HERE
				var moveId = moveName;
				while (moveId.indexOf(" ")!=-1 || moveId.indexOf("-")!=-1) {
                    moveId = moveId.replace(' ','');
                    moveId = moveId.replace('-',''); //THIS LINE IS FOR WILL-O-WISP, NEEDS TESTING
                    }
				moveId = moveId.toLowerCase()
				newmove.maxPp = (8/5)*BattleMovedex[moveId]["pp"]; //might be buggy. doesn't work for Multi-Attack
				newmove.pp = newmove.maxPp-1; //TODO: HOW ABOUT PRESSURE???
				
				//add new move to moveset
				currActive.moves.addMove(newmove);
			}
			console.log("Update Moves: ")
			console.log(currActive);
		    console.log("\n");
		}
		//when a move is disabled
		//needs testing
		var startPos = msg.indexOf('|-start|p1');
		if (startPos!=-1) {
		    endPos = msg.substr(startPos).indexOf('\n');
		    msgStr = msg.substring(startPos+1,startPos+endPos);
		    var start_arr = msgStr.split("|") //["-start", "p1a: Seviper", "Disable", "X-Scissor", "[from] ability...",...]
		    var opp_arr = start_arr[1].split(': '); //["p1a", "Seviper"]
		    if (msgStr.indexOf("Disable")!=-1 && opp_arr[0] == "p1a") { //if there is Disable and if target is opponent
		        // a layer of error checking here
		        if (currActive.name != start_arr[1].split(": ")[1]) {
		            console.log("ERROR: currActive is not the same as disabled mon");
		            console.log("currActive: " + currActive.name);
		            console.log("disabled mon: " + start_arr[1].split(": ")[1])
		        }
		        else {
                    currActive.moves[start_arr[3]].disabled = true;
                    currActive.disabledmove = start_arr[3]
		        }
		        console.log("Update disabled move: ")
		        console.log(currActive);
		        console.log("\n");
		    }
		} //end disable
		var end = msg.indexOf('|-end|');
		if (end!=-1) {
		    endPos = msg.substr(end).indexOf('\n');
		    var end_arr = msg.substring(end+1, end+endPos).split("|"); //["-end", "p1a: Forretress", "Disable"]
		    if (end_arr[0]=="-end" && end_arr[1].split(": ")[0] == "p1a" &&end_arr[2]=="Disable") {
		        currActive.moves[currActive.disabledmove].disabled = false;
		        console.log("Update disabled move: ")
		        console.log(currActive);
		        console.log("\n");
		    }
		}
		//or when currActive is switched out, also end disable (this is handled in UPDATE SWITCH)
		
		
		//UPDATE HP
        var damageP1Pos = msg.indexOf('|-damage|p1a: '); // damage msg: |-damage|p1a: Seaking|49/100|[from] item: Life Orb
		if (damageP1Pos!=-1) {
		    var newlinePos = msg.substr(damageP1Pos).indexOf('\n')
			endPos = (newlinePos!=-1) ? newlinePos : msg.substr(damageP1Pos).length;
			erroneousString =  msg.substring(damageP1Pos+14, damageP1Pos+endPos)
			var damage_arr = msg.substring(damageP1Pos+14, damageP1Pos+endPos).split("|"); //['Seaking', '49/100 brn', "[from] item: Life Orb"]
			var hp = parseInt(damage_arr[1].split("/")[0]);
			if (currActive.name != damage_arr[0]) { //set HP
			    console.log("ERRONEOUS STRING: " +erroneousString);
			    console.log("ERROR: currActive is not the same as damaged pokemon");
			    console.log("currActive: "+currActive.name);
			    console.log("damaged pokemon: "+damage_arr[0])
			}
			else {
			    currActive.setHp(hp);
			}
			//update item
			if (damage_arr.length > 2) {
			    if (damage_arr[2].startsWith("[from] item:")) {
			        var item = damage_arr[2].split(": ")[1];
			        currActive.setItem(item);
			    }
			}
			console.log("Update HP: ")
			console.log(currActive);
			console.log("\n");
		}
		//heal, needs verification
		var healP1Pos = msg.indexOf('|-heal|p1a: ');
		if (healP1Pos!=-1) {
			var newlinePos = msg.substr(healP1Pos).indexOf('\n')
			endPos = (newlinePos!=-1) ? newlinePos : msg.substr(healP1Pos).length;
			var heal_arr = msg.substring(healP1Pos+12, healP1Pos+endPos).split("|"); //['Seaking', '49/100 brn', "[from] item: Life Orb"]
			var hp = parseInt(heal_arr[1].split("/")[0]);
			if (currActive.name != heal_arr[0]) { //set HP
			    console.log("ERROR: currActive is not the same as healed pokemon");
			    console.log("currActive: "+currActive.name);
			    console.log("healed pokemon: "+heal_arr[0])
			}
			else {
			    currActive.setHp(hp);
			}
			//update item
			if (heal_arr.length > 2) {
			    if (heal_arr[2].startsWith("[from] item:")) {
			        var item = heal_arr[2].split(": ")[1];
			        currActive.setItem(item);
			    }
			}
		}



		//UPDATE VOLATILESTATUS: activate, start, end, mustrecharge?



		
		//UPDATE FORM
		var detailschangeP1Pos = msg.indexOf('|detailschange|p1a'); //working fine
		if (detailschangeP1Pos!=-1) {
			endPos = msg.substr(detailschangeP1Pos).indexOf('\n');
			var details_arr = msg.substring(detailschangeP1Pos+20, detailschangeP1Pos+endPos).split("|"); //['Slowbro', 'Slowbro-Mega, L76, F']
			var forme = details_arr[1].split(", ")[0];
			currActive.setForme(forme);
			console.log("Update details: ")
			console.log(currActive);
            //update mega stone
			var megaP1Pos = msg.indexOf("|-mega|p1a: ");
			if (megaP1Pos!=-1) {
			    endPos = msg.substr(megaP1Pos).indexOf('\n');
			    var mega_arr = msg.substring(megaP1Pos+12, megaP1Pos+endPos).split("|"); // ["Glalie", "Glalie", "Glalitite"]
                var item = mega_arr[2];
                if (currActive.name != mega_arr[0]) {
			    console.log("ERROR: currActive is not the same as mega pokemon");
			    console.log("currActive: "+currActive.name);
			    console.log("mega pokemon: "+mega_arr[0])
			    }
                else {
                    currActive.setItem(item);
                }
			    //update mega ability
			    var formeId = forme;
			    while (formeId.indexOf("-")!=-1 || formeId.indexOf(" ")!=-1) {
                    formeId = formeId.replace("-", "");
                    formeId = formeId.replace(" ", "");
			    }
			    formeId = formeId.toLowerCase();
			    console.log(formeId);
			    var ability = Pokedex[formeId].abilities[0];
			    currActive.setAbility(ability);
			}
		}
		var formechangeP1Pos = msg.indexOf('|-formechange|p1a');
		if (formechangeP1Pos!=-1) {
			endPos = msg.substr(formechangeP1Pos).indexOf('\n');
			var forme_arr = msg.substring(formechangeP1Pos+19, formechangeP1Pos+endPos).split("|"); //['Wishiwashi', 'Wishiwashi-School', '[from] ability:...']
			var forme = forme_arr[1];
			currActive.setForme(forme);
			console.log("Update forme: ")
			console.log(currActive);
		}
		
		
		//UPDATE STATUS (status is in the form of psn, tox, brn, slp, frz,...)
		//needs testing
		var statusP1Pos = msg.indexOf("|-status|p1a:");
		if (statusP1Pos!=-1) {
		    endPos = msg.substr(statusP1Pos).indexOf('\n');
		    var status_arr = msg.substring(statusP1Pos+14, statusP1Pos+endPos).split("|"); //["Volcarona", "psn"]
		    var status = status_arr[1]
		    if (currActive.name != status_arr[0]) { //in case of error somehow
				console.log("ERROR: status target is not the same as currActive")
				console.log("status target: " + status_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
			    currActive.setStatus(status);
			}
			console.log("Update status: ")
			console.log(currActive);
		}
		//update cure status
		var curestatusP1Pos = msg.indexOf("|-curestatus|p1a:");
		if (curestatusP1Pos!=-1) {
		    endPos = msg.substr(curestatusP1Pos).indexOf("\n");
		    cure_arr = msg.substring(curestatusP1Pos+18, curestatusP1Pos+endPos).split("|"); //["Politoed", "slp", "[msg]"]
		    var status = cure_arr[1];
		    if (currActive.name != cure_arr[0]) {
		        console.log("ERROR: currActive is not the same as cure target");
		        console.log("cure target: "+cure_arr[0]);
		        console.log("currActive: "+currActive);
		    }
		    else {
		        currActive.setStatus(null);
		    }
		    console.log("Update cure status: ")
		    console.log(currActive);
            //cure team, needs testing
		    curestatusP1Pos = msg.indexOf("|-curestatus|p1:");
		    var submsg = msg;
		    while (curestatusP1Pos!=-1) { //if there is |-curestatus:p1
		        endPos = submsg.substr(curestatusP1Pos).indexOf("\n");
		        cure_arr = submsg.substring(curestatusP1Pos+17, curestatusP1Pos+endPos).split("|"); //["Politoed", "slp", "[msg]"]
                var status = cure_arr[1];
                if (currActive.name != cure_arr[0]) {
                    console.log("ERROR: currActive is not the same as cure target");
                    console.log("cure target: "+cure_arr[0]);
                    console.log("currActive: "+currActive);
                }
                else {
                    currActive.setStatus(null);
                }
		        submsg = submsg.substr(curestatusP1Pos+17);
		        curestatusP1Pos = submsg.indexOf("|-curestatus|p1:")
		    }
		}
		
		
		// UPDATE BOOST
		//needs testing
		var msgStr = msg;
		var boostP1Pos;
		while (msgStr.indexOf('|-boost|p1a')!=-1) {
			boostP1Pos = msgStr.indexOf('|-boost|p1a');
			endPos = msgStr.substr(boostP1Pos).indexOf('\n');
			var boost_arr = msgStr.substring(boostP1Pos+13, boostP1Pos+endPos).split("|"); //["Slowbro", "spa", "1"]
			var stat = boost_arr[1];
			var bst = parseInt(boost_arr[2]);
			
			if (currActive.name != boost_arr[0]) { //in case of error somehow
				console.log("ERROR: boost target is not the same as currActive")
				console.log("boost target: " + boost_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
				currActive.setBoost(stat, bst);
			}
			msgStr = msgStr.substr(boostP1Pos+1); //to search for the next |-boost|p1a
		}
        //unboost
		msgStr = msg;
		var unboostP1Pos;
		while (msgStr.indexOf('|-unboost|p1a')!=-1) {
			unboostP1Pos = msgStr.indexOf('|-unboost|p1a');
			endPos = msgStr.substr(unboostP1Pos).indexOf('\n');
			var unboost_arr = msgStr.substring(unboostP1Pos+15, unboostP1Pos+endPos).split("|"); //["Slowbro", "spa", "1"]
			var stat = unboost_arr[1];
			var bst = parseInt(unboost_arr[2]);

			if (currActive.name != unboost_arr[0]) { //in case of error somehow
				console.log("ERROR: unboost target is not the same as currActive")
				console.log("unboost target: " + unboost_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
				currActive.setBoost(stat, -bst);
			}
			msgStr = msgStr.substr(unboostP1Pos+1); //to search for the next |-unboost|p1a
		}
		// |-clearnegativeboost|p1a: Torkoal|[silent] (often caused by white herb)
		var negboostP1Pos = msg.indexOf("|-clearnegativeboost|p1a: ");
		if (negboostP1Pos != -1) {
		    var newlinePos = msg.substr(negboostP1Pos).indexOf('\n')
			endPos = (newlinePos!=-1) ? newlinePos : msg.substr(negboostP1Pos).length;
			var clear_arr = msg.substring(negboostP1Pos, negboostP1Pos+endPos) // ["-clearnegativeboost", "p1a: Torkoal", "[silent]"]
			var targetPokemon = clear_arr[1].split(": ")[1];
            var boost = opponentSide[targetPokemon].boost;
            for (stat in boost) {
                if (boost[stat] < 0) {boost[stat] = 0};
            }
		}
		
		
		
		//UPDATE ITEM
		//also buggy, doesn't work with air balloon (probably resolved)
		//test: update item with harvest
		var itemP1Pos = msg.indexOf("|-item|p1a");
		if (itemP1Pos!=-1) {
		    endPos = msg.substr(itemP1Pos).indexOf('\n');
		    var item_arr = msg.substring(itemP1Pos+12, itemP1Pos+endPos).split("|"); //["Aggron", "Aggronite", "[from] ability: Frisk", ...]
		    console.log(item_arr) //to be removed once bug is fixed
		    var item = item_arr[1]
		    if (currActive.name != item_arr[0]) { //in case of error somehow
				console.log("ERROR: item source is not the same as currActive")
				console.log("item source: " + item_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
			    currActive.setItem(item);
			}
			console.log("Update item: ")
			console.log(currActive);
		}
		


		//UPDATE ABILITY
		//need to autoupdate ability for mega poke
		var abilityP1Pos = msg.indexOf("|-ability|p1a");
		if (abilityP1Pos!=-1) {
		    endPos = msg.substr(abilityP1Pos).indexOf('\n');
		    var ability_arr = msg.substring(abilityP1Pos+15, abilityP1Pos+endPos).split("|"); // ["Rayquaza", "Air Lock"]
		    console.log(ability_arr); //to be removed once bug is fixed
		    var ability = ability_arr[1]
		    if (currActive.name != ability_arr[0]) { //in case of error somehow
				console.log("ERROR: ability source is not the same as currActive")
				console.log("ability source: " + ability_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
			    opponentSide[ability_arr[0]].setAbility(ability);
			}
			console.log("Update Ability: ")
			console.log(currActive);
			console.log("\n");
	    }
	    //in case opponent has Frisk ability (bot item is revealed by Frisk)
	    abilityP1Pos = msg.indexOf("|[from] ability:");
	    if (abilityP1Pos!=-1) {
	        endPos = msg.substr(abilityP1Pos).indexOf('\n');
	        var ability_arr = msg.substring(abilityP1Pos, abilityP1Pos+endPos).split("|"); //["[from] ability: Frisk", "[of] p1a: Furret",...]
	        if (ability_arr[1].startsWith("[of] p1a:")) {
	            ability = ability_arr[0].split(": ")[1];
	            if (currActive.name != ability_arr[1].split(": ")[1]) { //in case of error somehow
				console.log("ERROR: ability source is not the same as currActive")
				console.log("ability source: " + ability_arr[0]);
				console.log("currActive: " + currActive.name);
			}
			else {
			    opponentSide[ability_arr[0]].setAbility(ability);
			}
	        }
	    }
		//in case ability is revealed by Trace
		//needs testing
		var abilityP2Pos = msg.indexOf("|-ability|p2a:")
		if (abilityP2Pos!=-1) {
		    endPos = msg.substr(abilityP2Pos).indexOf("\n");
		    if (msg.substring(abilityP2Pos+1, endPos).indexOf("[from] ability: Trace")!=-1) {
		        var trace_arr = msg.substring(abilityP2Pos+1, endPos).split("|"); //["-ability", "p2a: Gardevoir", "Filter", "[from] ability: Trace",...]
		        ability = trace_arr[2];
		        currActive.setAbility(ability);

		        console.log("Update Trace: ")
		        console.log(currActive);
		        console.log("\n")
		    }
		}


		
		//UPDATE WEATHER/TERRAIN/PSEUDOWEATHER
		var weatherPos = msg.indexOf("|-weather|");
		if (weatherPos!=-1) {
			endPos = msg.substr(weatherPos).indexOf('\n');
			var weather_arr = msg.substring(weatherPos+10, weatherPos+endPos).split("|"); //["Rain Dance", "[from] ability: Drizzle", "[of] p1a: Kyogre"]
			// or weather_arr = ["Sandstorm", "[upkeep]]
			//update opponent's ability
			if (weather_arr.length > 2) {
                var source = weather_arr[1].split(": ") // ["[from] ability", "Drizzle"]
                var origin = weather_arr[2].split(": ") // ["[of] p1a", "Kyogre"]
                if (source[0]=="[from] ability" && origin[0]=="[of] p1a" && currActive.name==origin[1]) {
                    currActive.setAbility(source[1])
                }
                else {
                    console.log("Weather does not come from opponent's ability");
                }
			}
			//set
			var weather = weather_arr[0];
			if (weather!="none") {
			    field.setWeather(weather);
			}
			else {
			    field.setWeather(null);
			}
            console.log(field)
		}

        //update terrain/pseudoweather, needs testing with terrain shit
		var pseudoWeatherPos = msg.indexOf("|-fieldstart|move: ")
		if (pseudoWeatherPos!=-1) {
		    endPos = msg.substr(pseudoWeatherPos).indexOf('\n');
		    var pseudoWeather_arr = msg.substring(pseudoWeatherPos+19, pseudoWeatherPos+endPos).split("|"); //["Trick Room","[of] p1a: Slowking"]
		    var pseudoWeather = pseudoWeather_arr[0];
		    //there may be more than one pseudoweather
		    if (pseudoWeather.indexOf("Terrain")==-1){ // if not a terrain move
                field.addPseudoWeather(pseudoWeather);
                console.log(field);
		    }
		    else { // if is a terrain move
		        field.setTerrain(pseudoWeather);
		        console.log(field);
		    }
		}
		var fieldendPos = msg.indexOf("|-fieldend|move: ")
		if (fieldendPos!=-1) {
		    endPos = msg.substr(fieldendPos).indexOf('\n');
            var fieldend_arr = msg.substring(fieldendPos+17, fieldendPos+endPos).split("|"); //TODO: buggy: array is empty
            pseudoweather = fieldend_arr[0];
            if (pseudoWeather.indexOf("Terrain")==-1){ // if not a terrain move
                field.removePseudoWeather(pseudoweather);
                console.log(field);
            }
            else { // if is a terrain move
                field.terrain = null;
                console.log(field);
            }
		}
		


		//UPDATE CONDITION (stealth rock, spikes, toxic spikes, sticky web, reflect, tailwind, safeguard...)
		var sidestartP1Pos = msg.indexOf("|-sidestart|p1"); // msg.substr(..) = "|-sidestart|p1: daDangminh| move: Stealth Rock"
		if (sidestartP1Pos!=-1) {
		    endPos = msg.substr(sidestartP1Pos).indexOf('\n');
		    var oppcondition = msg.substring(sidestartP1Pos+16, sidestartP1Pos+endPos).split(": ")[1];
            field.setOppCondition(oppcondition);
            console.log(field);
		}
		var sidestartP2Pos = msg.indexOf("|-sidestart|p2"); // msg.substr(..) = "|-sidestart|p2: CynthiAI| move: Stealth Rock"
		if (sidestartP2Pos!=-1) {
		    endPos = msg.substr(sidestartP2Pos).indexOf('\n');
		    var botcondition = msg.substring(sidestartP2Pos+16, sidestartP2Pos+endPos).split(": ")[1];
            field.setBotCondition(botcondition);
            console.log(field);
		}
		var sideendP1Pos = msg.indexOf("|-sideend|p1"); // sideend msg: "|-sideend|p1: daDangminh|Stealth Rock|[from] move: Defog|[of] p1a: Watchog"
		if (sideendP1Pos!=-1) {
		    endPos = msg.substr(sideendP1Pos).indexOf('\n');
		    var oppcondition = msg.substring(sideendP1Pos+14, sideendP1Pos+endPos).split("|")[1];
            field.removeOppCondition(oppcondition); //probably wrong
            console.log(field);
		}
		var sideendP2Pos = msg.indexOf("|-sideend|p2");
		if (sideendP2Pos!=-1) {
		    endPos = msg.substr(sideendP2Pos).indexOf('\n');
		    var botcondition = msg.substring(sideendP2Pos+14, sideendP2Pos+endPos).split("|")[1];
            field.removeBotCondition(botcondition); //probably wrong
            console.log(field);
		}
		
        //TODO: fieldactivate: perish song, ion deluge. man screw this shit
	}
	
	
	
	//automate bot response
	//temporarily
	if (parts[0].includes('gen7randombattle')) {
		if (parts[1] === 'init') {
			room = parts[0];
			room = room.replace(/\n|\r/g,'');

			//initiate timer
			client.write(room+"|/timer on");
		}

		if (parts[1] === 'error') {
			_switchChoice++;
			client.write(room + "|/switch " + _switchChoice);
			if (_switchChoice>=6) _switchChoice = 1;
		}

		if (parts[1] === 'request') {
			//side = JSON.parse(parts[2]);
			client.write(room + '|/move');
			_switchChoice = 1;
		}

	}
		
}