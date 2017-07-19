'use strict';

var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;
var TypeChart = require('./zarel/data/typechart.js').BattleTypeChart;
var MoveSets = require('./zarel/data/formats-data.js').BattleFormatsData;

function CynthiAgent() {
	//working well
	this.getOptions = function (gameState) { //this function only returns BOT's options
		var options = [];
		var moves = gameState.sides[1].active[0].moves;
		for (var i=0; i < moves.length; i++) { //iterate through moves
			var action = 'move ' + moves[i];
			options.push(action);
		}
		if (gameState.sides[1] && !(gameState.sides[1].active[0] && gameState.sides[1].active[0].trapped)) {
			for (var j=1; j < Object.keys(gameState.sides[1].pokemon).length; j++) {
				var Pokemon = gameState.sides[1].pokemon[j];
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

	this.addFakeMove = function (gameState, moveid, oppside) {
		var move = gameState.getMove(moveid);
		var pokemon = gameState.sides[oppside].active[0];
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

	this.typeCompare = function (gameState, log) {
		var opptypes = gameState.sides[0].active[0].types //this is an array of opp type
		if (log) console.log(opptypes);
		var bottypes = gameState.sides[1].active[0].types
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

	this.oppAction = function (gameState, log) {
		//main idea: compare typing, see if the opp is likely to switch
		//need to get the type of pokemon, and need to be able to compare type interactivity
		//TODO: check last move, basically if previous turn the guy didn't switch as expected, then probably will also stay

		var typeInteraction = this.typeCompare(gameState);
		var opp_against_bot = typeInteraction.oppvbot;
		var bot_against_opp = typeInteraction.botvopp;
		if (log) console.log('OPP AGAINST BOT: ' + gameState.sides[0].active[0].species + ': ' + opp_against_bot);
		if (log) console.log('BOT AGAINST OPP: ' + gameState.sides[1].active[0].species + ': ' + bot_against_opp);
		if (log) console.log("\n");

		if (false) { //opp_against_bot < 1 || bot_against_opp > 1
			return 'forceskip' //TODO: temporarily
		}
		else {
			//likely stay, try to predict move
			//find function that returns damage
			//if (log) console.log(gameState.sides[0].active[0].moveset);
			var KOMoves = []
			var maxDamage = 0;
			var attacker = gameState.sides[0].active[0];
            var defender = gameState.sides[1].active[0];
            var hpleft = defender.hp;
            if (log) console.log("HP: " + hpleft);

			if (gameState.sides[0].active[0].moves.length >= 2) { //gameState.sides[0].active[0].moves.length == 4
				for (var i = 0; i < gameState.sides[0].active[0].moves.length; i++) {
					var move = gameState.sides[0].active[0].moves[i]; //this is only a move id
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
				if (log) console.log("PREDICTION: most accurate Move " + mostAccurateMove);
				return 'move ' + mostAccurateMove;
			}
			else if (strongestMove) {
				if (log) console.log("PREDICTION: strongest Move " + strongestMove);
				return 'move ' + strongestMove;
			}
			else return 'forceskip';
		}
	}

	this.stateScore = function (gameState, copiedState) {
		//(tested) works well for destiny bond and priority moves
		var score = 0;
		var oldOpp = gameState.sides[0].active[0];
		var newOpp = copiedState.sides[0].active[0];
		var oldBot = gameState.sides[1].active[0];
		var newBot = copiedState.sides[1].active[0];
		if (oldBot.species !== newBot.species) {
			for (var Poke in gameState.sides[1].pokemon) {
				if (gameState.sides[1].pokemon[Poke].species == newBot.species) {
					oldBot = gameState.sides[1].pokemon[Poke];
				}
			}
		}

		//compare type interaction, but this should play only a small part, because moves are more important
		//if type is shit but has awesome moves, huge plus!
		var typeInteraction = this.typeCompare(copiedState);
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
		if (oppHpDiff/oldOpp.maxhp <= 0.1) { //penalize in case opp HP stays relatively the same
			score -= 11;
			HPscore -= 11;
			HPoppscore -= 11;
		}

		var botHpDiff = oldBot.hp-newBot.hp;
		if (oldBot.maxhp != 0) {
			score -= 20*(botHpDiff/oldBot.maxhp);
			HPscore -= 20*(botHpDiff/oldBot.maxhp)
			HPbotscore -= 20*(botHpDiff/oldBot.maxhp);
		}
		}

		//compare status conditions
		if (true) {
		var Statscore = 0
		var oppStatus = newOpp.status;
		var botStatus = newBot.status;
		if (oppStatus != oldOpp.status) {
			if (oppStatus == 'tox') {
				score += 8;
				Statscore += 8;
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
					score += 7;
					Statscore += 7;
				}
			}
			else if (oppStatus == 'par') {
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
				score += 10;
				Statscore += 10;
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
				score -= 10;
				Statscore -= 10;
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
				score -= 7;
				Statscore -= 7;
			}
		}
		}
		//compare volatile
		if (true) {
		if (Object.keys(newOpp.volatiles).length > 0) {
			score += (5*Object.keys(newOpp.volatiles).length);
			if (newOpp.volatiles['substitute'] || newOpp.volatiles['perish1']) {
				score -= 13;
			}
			if (newOpp.volatiles['encore'] && copiedState.getMove(newOpp.lastMove).category == 'Status') {
            	score += 10;
            }
            if (newOpp.volatiles['flinch']) {
            	score += 5;
            }
            if (newOpp.volatiles['perish2'] || newOpp.volatiles['drowsy']) {
				score -= 5;
			}
		}
		if (Object.keys(newBot.volatiles).length > 0) {
        	score -= (5*Object.keys(newBot.volatiles).length);
        	if (newBot.volatiles['substitute']) {
            	score += 13;
            }
            if (newBot.volatiles['encore'] && copiedState.getMove(newBot.lastMove).category == 'Status') {
            	score -= 15;
            }
        }
        }
        //TODO: must be able to break substitute of opp.

		//compare boosts/unboosts
		//TODO: must do sth about unboosts when hp is low, because moves like superpower and draco meteor arent used
		if (true) {
		var Boostscore = 0;
		var oppBoosts = newOpp.boosts;
		var botBoosts = newBot.boosts;
		for (var stat in oppBoosts) {
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
						score -= 4/temp;
						Boostscore -= 4/temp;
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
			if (botBoosts[stat] > 0) {
				var temp = 1;
				while (temp <= botBoosts[stat]) {
					if (temp != 0) {
						score += 5/temp;
						Boostscore += 5/temp;
					}
					temp += 1;
				}
			}
			if (botBoosts[stat] < 0) {
				var temp = -1;
				while (temp >= botBoosts[stat]) {
					if (temp != 0) {
						score += 3/temp; //to lower the effects of unboosts
						Boostscore += 3/temp;
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
		//lightscreen reflect? probably compare atl and spatk stats

		//weather, terrain
		//return score;
		//return {'score': score, 'O : ': oldBot.hp, 'N : ': newBot.hp};
		//return {'score': score, 'O': [newOpp.species, typeInteraction.oppvbot], 'B': [newBot.species, typeInteraction.botvopp]};
		return {'score': this.round(score, 2), T: this.round(Typescore), H: this.round(HPscore), S: this.round(Statscore), B: this.round(Boostscore), P: newBot.species};
		//return {score: this.round(score, 2), HP: this.round(HPscore), O: this.round(HPoppscore), B: this.round(HPbotscore), P: newBot.species};
	}

	this.minimax = function (gameState, options, level) {
		if (options.constructor === Object) { //basically if it is an object, make it an array
			var options = Object.keys(options);
		}
		//choose oppmove
        if (gameState.sides[1].active[0].hp == 0 && (!gameState.sides[0].active[0].faint)) return;
        //this.oppAction(gameState, true); //only for logging
		if (level == 0) {
			var result = {};
			//iterate through each option, replicate copiedState choose botmove, minimax again with level-1
			for (var i=0; i < options.length; i++) {
				var action = options[i];
				var copiedState = gameState.copy();

				copiedState.p1.currentRequest = 'move'; //what is this for? idk what it's for but it's required for the sim to work
                copiedState.p2.currentRequest = 'move';
                if (i==0) {
                	var oppaction = this.oppAction(copiedState, true);
                }
                else oppaction = this.oppAction(copiedState);
				if (oppaction.startsWith('move')) {
					var moveid = oppaction.split(' ')[1];
					if (copiedState.sides[0].active[0].moves.indexOf(moveid) == -1) {
						this.addFakeMove(copiedState, moveid, 0);
					}
				}

				if (options[0].startsWith('switch')) {
					copiedState.choose('p1', 'forceskip');
				}
				else copiedState.choose('p1', oppaction);
				copiedState.choose('p2', action);
				//console.log('Simulated action: ' + action);
				//console.log(copiedState.sides[0].active[0].hp + '/' +copiedState.sides[0].active[0].maxhp)

				var score = this.stateScore(gameState, copiedState)
				result[action] = score;
			}
			//HOW ABOUT RETURNING AN OBJECT WITH MOVE AND SCORE?
			return result;
		}
		else {
			var result = {};
			for (var i=0; i < options.length; i++) {
				var action = options[i];
        		var copiedState = gameState.copy();
        		copiedState.choose('p1', this.oppAction(copiedState));
        		copiedState.choose('p2', action);
        		var currentscore = this.stateScore(gameState, copiedState)

        		var nextOptions = this.getOptions(gameState);
        		var future = this.minimax(copiedState, nextOptions, level-1);
        		var futureScore = 0;
        		for (var key in future) {
        			futureScore += future[key];
        		}

        		result[action] = currentscore + futureScore;
            }
            return result;
		}
	}

    this.decide = function (gameState, options, mySide, forceSwitch) { //TODO: mega evolve and z moves
    	//AI algo goes here
    	//basic idea: this function will first make a copy of gameState (in order to avoid tampering with gameState which
    	//is what hold our actual battle information), after that the copy of gameState will be modified as we simulate
    	//future turns by sending choice request to local simulator, and return the best choice

    	//sending choice request to local simulator by invoking copiedState.receive(...) or copiedState.choose(sideid, input, rqid)
    	//where copiedState is the copy of gameState. receive() will eventually call choose() method, so we need to consider
    	//whether we call choose() directly or we call receive(). Basically after copiedState.choose() is invoked,
    	//local simulation will take place and copiedState will be modified accordingly, that is why we use copiedState
    	//instead of gameState since we don't want gameState to be modified by our simulation.

    	//at any simulated state, use this.getOptions(state, mySide.id) to get an array of feasible options
    	//options has the form of "move blabla" or "switch number". message sent will be |\choose move blabbla or |\choose switch 3

    	//servcom.js will call this decide function and it will send final choice to server as the bot's decision
		this.mySID = mySide.n;
    	var botSide = mySide.id;
    	//console.log("mySide:");
    	//console.log(botSide); //p2

    	var copiedState = gameState.copy();
    	copiedState.p1.currentRequest = 'move'; //what is this for? idk what it's for but it's required for the sim to work
		copiedState.p2.currentRequest = 'move';

		if (options && copiedState.sides[0].active[0] && copiedState.sides[1].active[0]) {
			var results = this.minimax(copiedState, options, 0); //basically print out scores.
			console.log('\n');
			console.log(results); //an Object
			console.log('\n');

			var bestScore = -10000;
			var bestScoreAction = [];
			for (var action in results) {
				if (action == 'move protect' || action == 'move destinybond') {
					if (gameState.sides[1].active[0].lastMove == 'protect' || gameState.sides[1].active[0].lastMove == 'destinybond') {
						results[action].score -= 7;
					}
				}
				if (results[action].score > bestScore) {
					bestScore = results[action].score;
				}
			}
			for (var action in results) {
				if (results[action].score == bestScore) {
					bestScoreAction.push(action);
				}
			}
			if (bestScoreAction.length == 1) return bestScoreAction[0];
			else { //TODO: consider accuracy; also when there is more than one best score, go to strongestmove
				var strongestMove;
				var bestDamage = 0;
				var KOMoves = [];
				var attacker = gameState.sides[1].active[0];
				var defender = gameState.sides[0].active[0];
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

				if (KOMoves.length > 0) {
                	var bestAccuracy = 0;
                	var mostAccurateMove;
                	for (i=0; i < KOMoves.length; i++) {
                		var move = KOMoves[i]
                		var accuracy = gameState.getMove(move).accuracy;
                		if (accuracy > bestAccuracy) {
                			bestAccuracy = accuracy;
                			mostAccurateMove = move;
                		}
                	}
                	return 'move ' + mostAccurateMove;
                }
                else if (strongestMove) {
                	return 'move ' + strongestMove;
                }
                else return bestScoreAction[0];
			}
			/*
			var firstchoice = Object.keys(options)[0];
			console.log(firstchoice);
			if (firstchoice) { //added condition coz run into bug when using outrage, probably because of locked move
				copiedState.choose(botSide, firstchoice);
				copiedState.choose('p1', 'forceskip');
			}
			*/

		}

		//JUST LOGGGING STUFF
		if (copiedState.sides[0].active[0]) {
			//this.oppAction(gameState);
			console.log(copiedState.sides[0].active[0]);
			//console.log(copiedState.sides[0].active[0].hp + '/' +copiedState.sides[0].active[0].maxhp);
			//console.log(gameState.sides[0].active[0].moveset);
			//if (gameState.sides[0].active[0].moveset[0]) console.log(gameState.getMove(gameState.sides[0].active[0].moveset[0].id));
			//this.oppAction (gameState, true);
		}
		if (gameState.sides[1].active[0]) {
			//console.log(this.getOptions(gameState));
			//console.log(gameState.sides[0].active[0]);
        	//console.log(gameState.sides[1].active[0].moves);
        	//console.log(gameState.sides[0].active[0].moveset); //important: contains pp
        	//console.log(Object.keys(gameState.sides[1].pokemon).length);
			//console.log(gameState.sides[1].pokemon[0].fainted);
        	//console.log(copiedState.sides[0].active[0].hp + '/' +copiedState.sides[0].active[0].maxhp);
        }

    }

    this.assumePokemon = function (pname, plevel, pgender, side) {
        var nSet = {
            species: pname,
            name: pname,
            level: plevel,
            gender: pgender,
            evs: { hp: 84, atk: 84, def: 84, spa: 84, spd: 84, spe: 84 }, //apparently all evs are 84, as heard from somebody
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: "Hardy",
            ability: "Honey Gather"
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