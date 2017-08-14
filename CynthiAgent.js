'use strict';

var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;
var TypeChart = require('./zarel/data/typechart.js').BattleTypeChart;
var MoveSets = require('./zarel/data/formats-data.js').BattleFormatsData;

function CynthiAgent() {
	//working well
	this.getOptions = function (gameState, mySID) { //this function only returns BOT's options
		var options = [];
		var moves = gameState.sides[mySID].active[0].moves;
		for (var i=0; i < moves.length; i++) { //iterate through moves
			var action = 'move ' + moves[i];
			options.push(action);
		}
		if (gameState.sides[mySID] && !(gameState.sides[mySID].active[0] && gameState.sides[mySID].active[0].trapped)) {
			for (var j=1; j < Object.keys(gameState.sides[mySID].pokemon).length; j++) {
				var Pokemon = gameState.sides[mySID].pokemon[j];
				if (!Pokemon.fainted) {
					var action = 'switch ' + (j+1);
					options.push(action);
				}
			}
		}
		return options;
	}

	this.round = function(number, decimal) {
		if (decimal == 2) return Math.round(number*100)/100;
		else return Math.round(number*10)/10;
	}

	this.addFakeMove = function (gameState, moveid, mySID) { //moves always added to opp
		var move = gameState.getMove(moveid);
		var pokemon = gameState.sides[1-mySID].active[0];
		if (move.id && pokemon.moves.indexOf(move.id)==-1) { //if move not yet revealed
			pokemon.moves.push(move.id);
 			var nMove = {
				move: move.name,
				id: move.id,
				pp: (move.noPPBoosts ? move.pp : move.pp * 8 / 5)-1,
				maxpp: (move.noPPBoosts ? move.pp : move.pp * 8 / 5),
				target: move.target,
				disabled: false,
				disabledSource: '',
				used: false,
			};
		pokemon.baseMoveset.push(nMove);
		pokemon.moveset.push(nMove);
		}
	}

	this.typeCompare = function (gameState, mySID, log) {
		var opptypes = gameState.sides[1-mySID].active[0].types //this is an array of opp type
		if (log) console.log(opptypes);
		var bottypes = gameState.sides[mySID].active[0].types
		if (log) console.log(bottypes);
		var opp_against_bot = 0;
		var bot_against_opp = 0;

		for (var i=0; i < opptypes.length; i++) {
			var temp = 1;
			for (var j=0; j < bottypes.length; j++) {

				if (TypeChart[bottypes[j]].damageTaken[opptypes[i]] == 1) { //meaning bottype is weak to opptype
					temp *= 2;
				}
				if (TypeChart[bottypes[j]].damageTaken[opptypes[i]] == 2) { //meaning bottype resists opptype
					temp /= 2;
				}
				if (TypeChart[bottypes[j]].damageTaken[opptypes[i]] == 3) { //meaning bottype is immune to opptype
					temp = 0;
				}
			}
			if (temp > opp_against_bot) {opp_against_bot = temp;}
		}

		for (var j=0; j < bottypes.length; j++) {
			temp = 1;
			for (var i=0; i < opptypes.length; i++) {
				if (TypeChart[opptypes[i]].damageTaken[bottypes[j]] == 1) { //meaning opptype is weak to bottype
					temp *= 2;
				}
				if (TypeChart[opptypes[i]].damageTaken[bottypes[j]] == 2) { //meaning opptype resists bottype
					temp /= 2;
				}
				if (TypeChart[opptypes[i]].damageTaken[bottypes[j]] == 3) { //meaning opptype is immune to bottype
					temp = 0;
				}
			}
			if (temp > bot_against_opp) {bot_against_opp = temp;}
		}
		return {botvopp: bot_against_opp, oppvbot: opp_against_bot}
	}

	this.oppAction = function (gameState, mySID, log) { //TODO: doesn't work when there is choice band/scarf/specs
		//main idea: compare typing, see if the opp is likely to switch
		//need to get the type of pokemon, and need to be able to compare type interactivity
		//TODO: check pokemon.position, predict blabla

		var typeInteraction = this.typeCompare(gameState, mySID);
		var opp_against_bot = typeInteraction.oppvbot;
		var bot_against_opp = typeInteraction.botvopp;
		if (log) console.log('OPP AGAINST BOT: ' + gameState.sides[1-mySID].active[0].species + ': ' + opp_against_bot);
		if (log) console.log('BOT AGAINST OPP: ' + gameState.sides[mySID].active[0].species + ': ' + bot_against_opp);
		if (log) console.log("\n");

		if (false) { //opp_against_bot < 1 || bot_against_opp > 1
			return 'forceskip' //TODO: temporarily
		}
		else {
			//likely stay, try to predict move
			//find function that returns damage
			//if (log) console.log(gameState.sides[1-mySID].active[0].moveset);
			var KOMoves = []
			var maxDamage = 0;
			var attacker = gameState.sides[1-mySID].active[0];
            var defender = gameState.sides[mySID].active[0];
            var hpleft = defender.hp;
            if (log) console.log("HP: " + hpleft);

			if (gameState.sides[1-mySID].active[0].moves.length >= 2) { //gameState.sides[1-mySID].active[0].moves.length == 4
				for (var i = 0; i < gameState.sides[1-mySID].active[0].moves.length; i++) {
					var move = gameState.sides[1-mySID].active[0].moves[i]; //this is only a move id
					//if (log) console.log(gameState.getMove(move));

					if (true) {
						var damage = gameState.getDamage(attacker, defender, move, null);
						if (damage > hpleft) {
							KOMoves.push(move); //store a list of moves that kills
						}
						var strongestMove;
						if (log) console.log(move + ' ' +damage) //this apparently returns false when immune and when defender dies
						if (damage > maxDamage) {
							maxDamage = damage;
							strongestMove = move;
						}
					}
				}
			}
			else { //otherwise, check all possible moves. temporarily doesn't work for now. will be revisited
				for (var i = 0; i < MoveSets[toId(attacker.name)].randomBattleMoves.length; i++) {
					var moveid = MoveSets[toId(attacker.species)].randomBattleMoves[i]; //this is only a move id
					var move = gameState.getMove(moveid);
					//if (log) console.log(gameState.getMove(move));

					if (move.category != 'Status') {
						var damage = gameState.getDamage(attacker, defender, move, null);
						if (damage > hpleft) {
							KOMoves.push(moveid); //store a list of moves that kills
						}
						var strongestMove;
						if (log) console.log(moveid + ' ' +damage) //this apparently returns false when immune and when defender dies
						if (damage > maxDamage) {
							maxDamage = damage;
							strongestMove = moveid;
						}
					}
				}
			}

			//check if there is any move that is sufficient to kill with highest accuracy, if not, use strongest move
			if (KOMoves.length > 0) {
				var bestAccuracy = 0;
				var mostAccurateMove;
				for (i=0; i < KOMoves.length; i++) {
					move = KOMoves[i]
					var accuracy = gameState.getMove(move).accuracy;
					if (accuracy > bestAccuracy) {
						bestAccuracy = accuracy;
						mostAccurateMove = move; //TODO: fireblast appears to be more accurate than aurasphere, needs fix
					}
				}
				if (log) console.log('KO Moves: '+KOMoves);
				if (log) console.log("PREDICTION: most accurate Move " + mostAccurateMove + ' KO' + '\n');
				return 'move ' + mostAccurateMove;
			}
			else if (strongestMove) {
				if (log) console.log("PREDICTION: strongest Move " + strongestMove + ' ' + maxDamage+'/'+hpleft+ '\n');
				return 'move ' + strongestMove;
			}
			else return 'forceskip';
		}
	}

	this.stateScore = function (gameState, copiedState, mySID) {
		//(tested) works well for destiny bond and priority moves
		var score = 0;
		var oldOpp = gameState.sides[1-mySID].active[0];
		var newOpp = copiedState.sides[1-mySID].active[0];
		var oldBot = gameState.sides[mySID].active[0];
		var newBot = copiedState.sides[mySID].active[0];
		if (oldBot.species !== newBot.species) {
			for (var Poke in gameState.sides[mySID].pokemon) {
				if (gameState.sides[mySID].pokemon[Poke].species == newBot.species) {
					oldBot = gameState.sides[mySID].pokemon[Poke];
				}
			}
		}

		//faster speed should be a bonus
		var speedscore = 0;
		if (newBot.speed > newOpp.speed) {
			score += 4; //don't go to 5;
			speedscore += 4;
		}

		//compare type interaction, but this should play only a small part, because moves are more important
		//if type is shit but has awesome moves, huge plus!

		/*
		var typeInteraction = this.typeCompare(copiedState, mySID);
		var Typescore = 0;
		if (typeInteraction.botvopp > typeInteraction.oppvbot) {
			if (typeInteraction.oppvbot != 0) {
				score += 2*(typeInteraction.botvopp/typeInteraction.oppvbot);
				Typescore += 2*(typeInteraction.botvopp/typeInteraction.oppvbot)
			}
			else {
				score += 5;
				Typescore += 5;
			}
		}
		else if (typeInteraction.botvopp < typeInteraction.oppvbot) {
			if (typeInteraction.botvopp != 0) {
				score -= 2*(typeInteraction.oppvbot/typeInteraction.botvopp);
				Typescore -= 2*(typeInteraction.oppvbot/typeInteraction.botvopp);
			}
			else {
				score -= 5;
				Typescore -= 5;
			}
		}
		*/

		//Compare HP
		if(true) { //to be removed
		var HPscore = 0
		var HPoppscore = 0;
		var HPbotscore = 0
		if (newOpp.hp == 0) {
			score += 20; //if ded lol
			HPscore += 20;
		}
		else {
			var oppHpDiff = oldOpp.hp - newOpp.hp;
			if (oldOpp.maxhp != 0) {
				score += 20*(oppHpDiff/oldOpp.maxhp); //should compare to maxhp. set!
				HPscore += 20*(oppHpDiff/oldOpp.maxhp);
				HPoppscore = 20*(oppHpDiff/oldOpp.maxhp);
			}

		}
		if (oppHpDiff/oldOpp.maxhp <= 0.12) { //penalize in case opp HP stays relatively the same, should not go to 9
			score -= 9;
			HPscore -= 9;
			HPoppscore -= 9;
		}

		var botHpDiff = oldBot.hp-newBot.hp;
		if (oldBot.maxhp != 0) {
			score -= 20*(botHpDiff/oldBot.maxhp);
			HPscore -= 20*(botHpDiff/oldBot.maxhp)
			HPbotscore -= 20*(botHpDiff/oldBot.maxhp);
		}
		if (newBot.hp == 0) {// if bot ded
			score -= 7;
			HPscore -= 7;
		}
		}

		//compare status conditions
		if (true) {
		var Statscore = 0
		var oppStatus = newOpp.status;
		var botStatus = newBot.status;
		if (oppStatus != oldOpp.status) {
			if (oppStatus == 'tox') {
				score += 14;
				Statscore += 14;
			}
			else if (oppStatus == 'brn') {
				if (newOpp.stats.atk > newOpp.stats.spa) {
					score += 10;
					Statscore += 10;
					if (newOpp.boosts.atk > 0) {
						score += 5;
						Statscore +=5;
					}
				}
				else {
					score += 5;
					Statscore += 5;
				}
			}
			else if (oppStatus == 'par') { //use par when opp is faster
				score += 6;
				Statscore += 6;
				if (newOpp.stats.spe > 160) {
					score += 2;
					Statscore += 2;
				}
				if (newOpp.stats.spe > 200 || newOpp.boosts.spe > 0) {
					score += 3;
					Statscore += 3;
				}
			}
			else if (oppStatus == 'slp') {
				score += 7;
				Statscore += 7;
			}
			else if (oppStatus == 'psn') {
				score += 6;
				Statscore += 6;
			}
			if (oldOpp.status == 'tox') {
				score -= 8;
				Statscore -= 8;
			}
			else if (oldOpp.status == 'brn') {
				score -= 7;
				Statscore -= 7
			}
			else if (oldOpp.status == 'par') {
				score -= 6;
				Statscore -= 6;
			}
			else if (oldOpp.status == 'slp') {
				score -= 7;
				Statscore -= 7;
			}
			else if (oldOpp.status == 'psn') {
				score -= 6;
				Statscore -= 6;
			}
		}
		if (botStatus != oldBot.status) {
			if (oldBot.status == 'tox') {
				score += 12;
				Statscore += 12;
			}
			else if (oldBot.status == 'brn') {
				score += 8;
				Statscore += 8;
			}
			else if (oldBot.status == 'par') {
				score += 7;
				Statscore += 7;
			}
			else if (oldBot.status == 'slp') {
				score += 8;
				Statscore += 8;
			}
			else if (oldBot.status == 'psn') {
				score += 7;
				Statscore += 7;
			}
			if (botStatus == 'tox') {
				score -= 12;
				Statscore -= 12;
			}
			else if (botStatus == 'brn') {
				score -= 8;
				Statscore -= 8;
			}
			else if (botStatus == 'par') {
				score -= 7;
				Statscore -= 7;
			}
			else if (botStatus == 'slp') {
				score -= 8;
				Statscore -=8;
			}
			else if (botStatus == 'psn') {
				score -= 7;
				Statscore -=7;
			}
			else if (botStatus == 'frz') {
				score -= 12;
				Statscore -= 12;
			}
		}
		}
		//compare volatile
		if (true) {
		var Volscore = 0;
		if (Object.keys(newOpp.volatiles).length > 0) {
			score += (5*Object.keys(newOpp.volatiles).length);
			if (newOpp.volatiles['substitute'] || newOpp.volatiles['perish1']) {
				score -= 13;
				Volscore -= 13;
			}
			if (newOpp.volatiles['encore'] && copiedState.getMove(newOpp.lastMove).category == 'Status') {
            	score += 10;
            	Volscore += 10;
            }
            if (newOpp.volatiles['flinch']) {
            	score += 5;
            	Volscore += 5;
            }
            if (newOpp.volatiles['perish2'] || newOpp.volatiles['drowsy'] || newOpp.volatiles['leechseed']) {
				score += 6;
				Volscore += 6
			}
            if (newOpp.volatiles['taunt']) {
				score -= 5;
				Volscore -= 5;
			}
		}
		if (Object.keys(newBot.volatiles).length > 0) {
        	score -= (5*Object.keys(newBot.volatiles).length);
        	if (newBot.volatiles['substitute']) {
            	score += 5;
            	Volscore += 5;
            }
            if (newBot.volatiles['encore'] && copiedState.getMove(newBot.lastMove).category == 'Status') {
            	score -= 15;
            	Volscore -= 15;
            }
            if (newBot.volatiles['perish2'] || newOpp.volatiles['drowsy'] || newBot.volatiles['leechseed']) {
				score -= 10;
				Volscore -= 10;
			}
            if (newOpp.volatiles['perish1']) {
				score -= 12;
				Volscore -= 12;
			}
        	if (oldBot.volatiles['substitute'] && !newBot.volatiles['substitute']) {
            	score -= 3;
            	Volscore -= 3;
            }
        }
        }

		//compare boosts/unboosts
		//TODO: must do sth about unboosts when hp is low, because moves like superpower and draco meteor arent used
		if (true) {
		var Boostscore = 0;
		var oppBoosts = newOpp.boosts;
		var botBoosts = newBot.boosts;
		for (var stat in oppBoosts) {
			if (stat == 'evasion' || stat == 'accuracy') continue;
			if (oppBoosts[stat] > 0) {
				var temp = 1;
				while (temp <= oppBoosts[stat]) {
					if (temp != 0) {
						score -= 4/temp;
						Boostscore -= 4/temp;
					}
					temp += 1;
				}
			}
			if (oppBoosts[stat] < 0) {
				var temp = -1;
				while (temp >= oppBoosts[stat]) {
					if (temp != 0) {
						score -= 3/temp;
						Boostscore -= 3/temp;
					}
					temp -= 1;
				}
			}
			if (newOpp.boosts[stat] < oldOpp.boosts[stat]) {
				score += 4*(oldOpp.boosts[stat]-newOpp.boosts[stat]);
				Boostscore += 4*(oldOpp.boosts[stat]-newOpp.boosts[stat]);
			}
		}

		for (var stat in botBoosts) {
			if (stat == 'evasion' || stat == 'accuracy') continue;
			if (botBoosts[stat] > 0) {
				var temp = 1;
				while (temp <= botBoosts[stat]) {
					if (temp != 0) {
						score += 5/temp;
						Boostscore += 5/temp;
					}
					temp += 1;
				}
				if (oldOpp.hp > 0 && oldOpp.hp/oldOpp.maxhp <= 0.3 && newBot.boosts[stat] > oldBot.boosts[stat]) {
					score -= 5.33; //discourage extra boosts when hp is low
					Boostscore -= 5.33;
				}
			}
			if (botBoosts[stat] < 0) {
				var temp = -1;
				while (temp >= botBoosts[stat]) {
					if (temp != 0) {
						score += 4/temp; //to lower the effects of unboosts
						Boostscore += 4/temp;
					}
					temp -= 1;
				}
			}
		}
		}


		//how about priority moves and speed?
		//especially after switching, speed is important when switching to finish off something
		//perhaps don't need, coz simulation already handles this

		//field hazards/conditions (maybe use when not threatened)
		if (true) {
		var Hzdscore = 0;
		var botFaintedNumber = 0;
		var oppFaintedNumber = 0;
		for (var i=0; i < Object.keys(copiedState.sides[this.mySID].pokemon).length; i++) {
			if (copiedState.sides[this.mySID].pokemon[i].fainted) {
				botFaintedNumber += 1;
			}
		}
		for (var i=0; i < Object.keys(copiedState.sides[1-this.mySID].pokemon).length; i++) {
			if (copiedState.sides[1-this.mySID].pokemon[i].fainted) {
				oppFaintedNumber += 1
			}
		}

		if (copiedState.sides[mySID].sideConditions) {
			if (copiedState.sides[mySID].sideConditions['stealthrock']) {
				score -= 3*(6-botFaintedNumber);
				Hzdscore -= 3*(6-botFaintedNumber);
			}
			if (copiedState.sides[mySID].sideConditions['stickyweb']) {
				score -= 4*(6-botFaintedNumber);
				Hzdscore -= 4*(6-botFaintedNumber);
			}
			if (copiedState.sides[mySID].sideConditions['spikes']) {
				var layers = copiedState.sides[mySID].sideConditions['spikes'].layers;
				score -= 2*(6-botFaintedNumber)*layers;
				Hzdscore -= 2*(6-botFaintedNumber)*layers;
			}
			if (copiedState.sides[mySID].sideConditions['toxicspikes']) {
				var layers = copiedState.sides[mySID].sideConditions['toxicspikes'].layers;
				score -= 2*(6-botFaintedNumber)*layers;
				Hzdscore -= 2*(6-botFaintedNumber)*layers;
			}
		}
		if (copiedState.sides[1-mySID].sideConditions) {
			if (copiedState.sides[1-mySID].sideConditions['stealthrock']) {
				score += 4.5*(6-oppFaintedNumber);
				Hzdscore += 4.5*(6-oppFaintedNumber);
			}
			if (copiedState.sides[1-mySID].sideConditions['stickyweb']) {
				score += 3*(6-oppFaintedNumber);
				Hzdscore += 3*(6-oppFaintedNumber);
			}
			if (copiedState.sides[1-mySID].sideConditions['spikes']) {
				var layers = copiedState.sides[1-mySID].sideConditions['spikes'].layers;
				score += 2*(6-oppFaintedNumber)*layers;
				Hzdscore += 2*(6-oppFaintedNumber)*layers;
			}
			if (copiedState.sides[1-mySID].sideConditions['toxspikes']) {
				var layers = copiedState.sides[1-mySID].sideConditions['toxicspikes'].layers;
				score += 1.5*(6-oppFaintedNumber);
				Hzdscore += 1.5*(6-oppFaintedNumber);
			}
		}
		}
		//lightscreen reflect? probably compare atk and spatk stats

		//weather, terrain

		//return score;
		//return {'score': score, 'O : ': oldBot.hp, 'N : ': newBot.hp};
		//return {'score': score, 'O': [newOpp.species, typeInteraction.oppvbot], 'B': [newBot.species, typeInteraction.botvopp]};
		return {score: this.round(score, 2), HP: this.round(HPscore), Status: this.round(Statscore), Boosts: this.round(Boostscore),
        Volatile: this.round(Volscore), Hazard: this.round(Hzdscore), Speed: this.round(speedscore), P: newBot.species};
		//return {score: this.round(score, 2), HP: this.round(HPscore), O: this.round(HPoppscore), B: this.round(HPbotscore), P: newBot.species};
	}

	this.minimax = function (gameState, options, level, mySID, forceSwitch) {
		var botSide = 'p'+(mySID+1);
		var oppSide = 'p'+(2-mySID);

		if (options.constructor === Object) { //basically if it is an object, make it an array
			var options = Object.keys(options);
		}

        if (gameState.sides[mySID].active[0].hp == 0 && (!gameState.sides[1-mySID].active[0].faint)) return;

        //this.oppAction(gameState, mySID, true); //only for logging
		if (level == 0) {
			var result = {};
			result['PREDICTION'] = this.oppAction(copiedState, mySID);

			//iterate through each option
			for (var i=0; i < options.length; i++) {
				var action = options[i];
				var copiedState = gameState.copy();

				copiedState.p1.currentRequest = 'move'; //what is this for? idk what it's for but it's required for the sim to work
                copiedState.p2.currentRequest = 'move';

                oppaction = this.oppAction(copiedState, mySID);
				if (oppaction.startsWith('move')) { //predict worst move when less than 2 moves have been revealed
					var moveid = oppaction.split(' ')[1];
					if (copiedState.sides[1-mySID].active[0].moves.indexOf(moveid) == -1) {
						this.addFakeMove(copiedState, moveid, mySID); //add fake move so that sim would work
					}
				}

				if (forceSwitch) { //if all options of bot are switches, then forceskip p1 (coz bot just died duh)
					var oppPoke = copiedState.sides[1-mySID].active[0];
					if (oppPoke.hp == 0 || oppPoke.fainted) {
						oppPoke.hp = 1
						oppPoke.fainted = false;

						copiedState.choose(oppSide, 'forceskip');
						copiedState.choose(botSide, action);
						copiedState.choose(botSide, action)
						oppPoke.hp = 0;
						oppPoke.fainted = true;
					}
					else {
						copiedState.choose(oppSide, 'forceskip');
						copiedState.choose(botSide, action);
						copiedState.choose(botSide, action)
					}
				}
				else {
					copiedState.choose(oppSide, oppaction);
					copiedState.choose(botSide, action);
				}
				//console.log('Simulated action: ' + action);
				//console.log(copiedState.sides[1-mySID].active[0].hp + '/' +copiedState.sides[1-mySID].active[0].maxhp)
				if (result['PREDICTION'] == 'forceskip') {
					var score = {score: 0, HP: 0, Status: 0, Boosts: 0, Volatile: 0, Hazard: 0, Speed: 0, P: copiedState.sides[mySID].active[0].species};
				}
				else var score = this.stateScore(gameState, copiedState, mySID)
				result[action] = score; // this is an object with actions as keys with corresponding object returned by statescore
			}
            //discourage switches //TODO: add condition that the active is not sleeping
            for (var key in result) {
            	if (key.startsWith('switch')) {
            		result[key].score -= 6; //7 is too low
            		if (gameState.sides[mySID].active[0].hp/gameState.sides[mySID].active[0].maxhp <= 0.30) {
            			result[key].score -= 6;
            		}
            		if (gameState.sides[mySID].sideConditions) {
            			result[key].score -= 4;
            		}
            	}
            }
			return result;
		}
		else {
		//TODO: increase score for moves that missed.
		//TODO: update stats after mega evo; at least speed, but how?
		//TODO: discourage taunt (maybe -2) because when attacking moves miss under sim, taunt may be used. which is stupid
			var result = {};
			//console.log(options);

			for (var i=0; i < options.length; i++) {
				var action = options[i];
        		var copiedState = gameState.copy();

				//what is this for? idk what it's for but it's required for the sim to work

				copiedState.p1.currentRequest = 'move';
                copiedState.p2.currentRequest = 'move';

                var oppaction = this.oppAction(copiedState, mySID)
				if (oppaction.startsWith('move')) { //predict worst move when less than 2 moves have been revealed
					var moveid = oppaction.split(' ')[1];
					if (copiedState.sides[1-mySID].active[0].moves.indexOf(moveid) == -1) {
						this.addFakeMove(copiedState, moveid, mySID); //add fake move so that sim would work
					}
				}

				if (forceSwitch) { //if all options of bot are switches, then forceskip p1 (coz bot just died duh)
					var oppPoke = copiedState.sides[1-mySID].active[0];
					if (oppPoke.hp == 0 || oppPoke.fainted) {
						oppPoke.hp = 1
						oppPoke.fainted = false;

						copiedState.choose(oppSide, 'forceskip');
						copiedState.choose(botSide, action);
						copiedState.choose(botSide, action); //this is not a bug, botside needs to be called twice if there is forceswitch, it basically works

						oppPoke.hp = 0;
						oppPoke.fainted = true;
					}
					else {
						copiedState.choose(oppSide, 'forceskip');
						copiedState.choose(botSide, action);
						copiedState.choose(botSide, action);
					}
				}
				else {
					copiedState.choose(oppSide, oppaction);
					copiedState.choose(botSide, action);
				}

        		var currentscore = this.stateScore(gameState, copiedState, mySID)

        		var nextOptions = this.getOptions(copiedState, mySID); //what? shouldn't it be copiedState?
        		var future = this.minimax(copiedState, nextOptions, level-1, mySID);
        		//console.log(future);
        		var futureBestScore = -10000; //-infinity
        		var futureBestScoreAction;
        		for (var key in future) {
        			if (future[key].score > futureBestScore) {
        				//console.log(future[key]);
        				futureBestScore = future[key].score;
        				futureBestScoreAction = key;
        			}
        		}
        		console.log(action + ': ' + "Current Score: "+ currentscore.score + ', ' + "Future Score: " + futureBestScore);
        		if (futureBestScore != -10000) {
        			if (futureBestScoreAction && (action.startsWith('switch') && !futureBestScoreAction.startsWith('switch'))) {//to prevent consecutive switches
        				currentscore['effscore'] = currentscore.score + 0.6*futureBestScore; //basically if current action is a switch, then increase significance of the next turn's score
        			}
					else currentscore['effscore'] = currentscore.score + 0.3*futureBestScore; //basically for each action on this level, score will be incremented by next level's best node's score
				}
        		result[action] = {};
        		result[action]['Current Score'] = currentscore;
        		result[action]['Future Score'] = future;
            }
            copiedState = 0; //trying to clear idk

            //discourage switches
            for (var key in result) {
            	if (key.startsWith('switch')) {
            		result[key].score -= 6;
            		if (gameState.sides[mySID].active[0].hp/gameState.sides[mySID].active[0].maxhp <= 0.30) {
            			result[key].score -= 6;
            		}
            		if (gameState.sides[mySID].sideConditions) {
            			result[key].score -= 4;
            		}
            	}
            }
            return result;
		}
	}

    this.decide = function (gameState, options, mySide, forceSwitch) {
    	//AI algo goes here
    	//basic idea: this function will first make a copy of gameState (in order to avoid tampering with gameState which
    	//is what hold our actual battle information), after that the copy of gameState will be modified as we simulate
    	//future turns by sending choice request to local simulator, and return the best choice

    	//sending choice request to local simulator by invoking copiedState.receive(...) or copiedState.choose(sideid, input, rqid)
    	//where copiedState is the copy of gameState. receive() will eventually call choose() method, so we need to consider
    	//whether we call choose() directly or we call receive(). Basically after copiedState.choose() is invoked,
    	//local simulation will take place and copiedState will be modified accordingly, that is why we use copiedState
    	//instead of gameState since we don't want gameState to be modified by our simulation.

    	//at any simulated state, use this.getOptions(state, mySID) to get an array of feasible options
    	//options has the form of "move blabla" or "switch number". message sent will be |\choose move blabbla or |\choose switch 3

    	//servcom.js will call this decide function and it will send final choice to server as the bot's decision
		this.mySID = mySide.n;
    	var botSide = mySide.id;
    	//console.log("mySide:");
    	//console.log(botSide); //p2

    	var copiedState = gameState.copy();

		this.oppAction(gameState, this.mySID, true);
		if (options && copiedState.sides[1-this.mySID].active[0] && copiedState.sides[this.mySID].active[0]) {
			var results = this.minimax(copiedState, options, 1, this.mySID, forceSwitch); //MINIMAX
			console.log('\n');
			console.log(results); //an Object
			console.log('\n');
			console.log(copiedState.sides[this.mySID].active[0]);

			var bestScore = -10000;
			var bestScoreAction = [];
			for (var action in results) { //to discourage protect and destiny bond if previously used
				if (action == 'move protect' || action == 'move destinybond' || action == 'move spikyshield' ||  action == 'move kingsshield') {
					if (gameState.sides[this.mySID].active[0].lastMove == 'protect' || gameState.sides[this.mySID].active[0].lastMove == 'destinybond'
					|| gameState.sides[this.mySID].active[0].lastMove == 'spikysiheld' || gameState.sides[this.mySID].active[0].lastMove == 'kingsshield') {
						results[action]['Current Score'].effscore -= 30;
					}
				}
				if ((action == 'move fakeout' || action == 'move firstimpression') && !gameState.sides[this.mySID].active[0].newlySwitched) {
					results[action]['Current Score'].effscore -= 50;
				}

				if (results[action]['Current Score'].effscore > bestScore) {
					bestScore = results[action]['Current Score'].score;
				}
			}
			for (var action in results) { //to score an array of bestScoreActions
				if (results[action]['Current Score'].effscore == bestScore) {
					bestScoreAction.push(action);
				}
			}
			if (bestScoreAction.length == 1) { //if there is only one best scored action
				var item = gameState.sides[this.mySID].active[0].item;
				console.log('Item: '+ item + ' line 701')
				console.log((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')));
				console.log(bestScoreAction[0].startsWith('move'));
				if ((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) && bestScoreAction[0].startsWith('move')) { //basically if item is a megastone
					if (item != 'eviolite') {
						console.log('Mega item: '+item);
						gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
						return bestScoreAction[0]+ ' mega';
					}
				}
				return bestScoreAction[0];
			}
			else {
				var strongestMove;
				var bestDamage = 0;
				var KOMoves = [];
				var attacker = gameState.sides[this.mySID].active[0];
				var defender = gameState.sides[1-this.mySID].active[0];
				var hpleft = defender.hp;
				for (var i=0; i < bestScoreAction.length; i++) { //iterate through best scored ones
					if (bestScoreAction[i].startsWith('move')) { //only choose moves, ignore switches
						var moveid = bestScoreAction[i].split(' ')[1]; //this is only a move id
						var damage = gameState.getDamage(attacker, defender, moveid, null);
						if (damage > hpleft) {
                        	KOMoves.push(moveid); //store a list of moves that kills
                        }
						if (damage > bestDamage) {
							bestDamage = damage;
							strongestMove = moveid;
						}
					}
				}
				var item = gameState.sides[this.mySID].active[0].item;
				if (KOMoves.length > 0) {
                	var bestAccuracy = 0;
                	var mostAccurateMove;
                	for (i=0; i < KOMoves.length; i++) {
                		var move = KOMoves[i]
                		var accuracy = gameState.getMove(move).accuracy;
                		if (typeof(accuracy)!= 'number') accuracy = 110;
                		if (accuracy > bestAccuracy) {
                			bestAccuracy = accuracy;
                			mostAccurateMove = move;
                		}
                	}
                	console.log('Item: '+ item + ' line 743') //TODO: mega evo failure comes from this (probably fixed)
                	if (item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) {
                		if (item != 'eviolite') {
                			console.log('Mega item: '+item);
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return 'move ' + mostAccurateMove + ' mega'
                		}
                	}
                	return 'move ' + mostAccurateMove;
                }
                else if (strongestMove) { //return strongestMove
                	console.log('Item: '+ item + ' line 754')
                	if (item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) {
                		if (item != 'eviolite') {
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return 'move ' + strongestMove + ' mega'
                		}
                	}
                	return 'move ' + strongestMove;
                }
                else {
                	console.log('Item: '+ item + ' line 765')
                	if ((item.endsWith('ite') || item.endsWith('itex') || item.endsWith('itey')) && bestScoreAction[0].startsWith('move')) {
                		if (item != 'eviolite') {
                			console.log('Mega item: '+item);
                			gameState.sides[this.mySID].active[0].item = ''; //to prevent sending mega request thereafter
                			return bestScoreAction[0]+' mega';
                		}
                	}
                	else return bestScoreAction[0];
                }
			}

		}

		//JUST LOGGGING STUFF
		if (copiedState.sides[1-this.mySID].active[0]) {
			//this.oppAction(gameState, mySID);
			//console.log(copiedState.sides[1-this.mySID].active[0]);
			console.log(copiedState.sides[1-this.mySID].active[0].hp + '/' +copiedState.sides[1-this.mySID].active[0].maxhp);
			//console.log(gameState.sides[1-this.mySID].active[0].moveset);
			//if (gameState.sides[1-this.mySID].active[0].moveset[0]) console.log(gameState.getMove(gameState.sides[1-this.mySID].active[0].moveset[0].id));
			//this.oppAction (gameState, mySID, true);
		}
		if (gameState.sides[this.mySID].active[0]) {
			//console.log(this.getOptions(gameState, mySID));
			console.log(copiedState.sides[this.mySID].active[0].fullname);
        	//console.log(gameState.sides[this.mySID].active[0].moves);
        	//console.log(gameState.sides[1-this.mySID].active[0].moveset); //important: contains pp
        	//console.log(Object.keys(gameState.sides[this.mySID].pokemon).length);
			//console.log(gameState.sides[this.mySID].pokemon[0].fainted);
        	//console.log(copiedState.sides[1-this.mySID].active[0].hp + '/' +copiedState.sides[1-this.mySID].active[0].maxhp);
        }

    }

    this.assumePokemon = function (pname, plevel, pgender, side) { //maybe add heuristics to predict certain poke's ability, item
        var nSet = {
            species: pname,
            name: pname,
            level: plevel,
            gender: pgender,
            evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, //apparently all evs are 84, as heard from somebody
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: "Hardy",
            ability: "Honey Gather",
            item: "Old Amber" //TODO: check if item was recorded in gamestate
        };
        // If the species only has one ability, then the pokemon's ability can only have the one ability.
        // Barring zoroark, skill swap, and role play nonsense.
        // This will be pretty much how we digest abilities as well
        if (Object.keys(Tools.getTemplate(pname).abilities).length == 1) {
            nSet.ability = Tools.getTemplate(pname).abilities['0'];
        }

        var basePokemon = new Pokemon(nSet, side);

        return basePokemon;
    }
}

module.exports.CynthiAgent = CynthiAgent;