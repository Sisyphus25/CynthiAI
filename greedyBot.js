'use strict'

var Tools = require("./zarel/tools");
var TypeChart = require ("./database/typechart.js")
var _ = require("underscore");

module.exports.greedyBot = function(gameState, options, mySide, forceSwitch){
	var botToOpp = function(botPkm, oppPkm) {
		var opptypes = oppPkm.types //this is an array of opp type
		//console.log(opptypes);
		var bottypes = botPkm.types
		//console.log(bottypes);
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

		/**
		console.log('Opp against bot:');
		console.log(opp_against_bot);
		console.log('Bot against opp:');
		console.log(bot_against_opp);
		console.log("\n");
		**/

		if (opp_against_bot < 1 && bot_against_opp > 1) {
			return 2; //really good matchup
		}
		else if (opp_against_bot < 1 || bot_against_opp > 1) {
			return 1; //good matchup
		}
		else if (opp_against_bot > 1 && bot_against_opp < 1) {
			return -2; //very unfavorable matchup
		}
		else if (opp_against_bot > 1 || bot_against_opp < 1) {
			return -1; //unfavorable matchup
		}
		return 0;
	}

	var switchPriority = function(bot, opp) {
		/**
		var pkmList = bot.pokemon.map( function(obj) {
			return toId(obj.id.slice(4));
		});
		**/
		//console.log(pkmList);

		var oppPkm = opp.active[0];
		var botPkm;
		var switchlist = [];
		var advantage;

		if (oppPkm == null) {
			for (var i = 0; i<bot.pokemon.length;i++) {
				if (botPkm.hp <= 0 || bot.active[i]) {
					switchlist[i] = -1;
				}
				else if (botPkm.hp/botPkm.maxhp < 0.2)
					switchlist[i] = 1;
				else {
					switchlist[i] = 2;
				}	
			}
		}

		else {
			for (var i = 0; i<bot.pokemon.length;i++) {
				botPkm = bot.pokemon[i];				
				if (botPkm.hp <= 0 || bot.active[i]) {
					switchlist[i] = -1;
				}
				else {
					advantage = botToOpp(botPkm,oppPkm);
					if (botPkm.hp/botPkm.maxhp < 0.2) {
						if (advantage === 2)
							switchlist[i] = 3;
						else 
							switchlist[i] = 2; //too little HP to switch in
					}
					else {
						if (advantage === 2)
							switchlist[i] = 6;
						else if (advantage === 1)
							switchlist[i] = 5;
						else if (advantage === 0 && (_.any(botPkm.getMoves(), function(move) {
			        		var moveData = Tools.getMove(move.id);
			        		return Tools.getEffectiveness(moveData, oppPkm) > 0 &&
			            	gameState.getDamage(botPkm, oppPkm, move) && Tools.getImmunity(moveData.type, oppPkm.getTypes());
			   			})))
							switchlist[i] = 4;
						else if (advantage === 0)
			   				switchlist[i] = 3;
			   			else if (advantage === -1)
			   				switchlist[i] = 2;
			   			else if (advantage === -2)
			   				switchlist[i] = 1;
			   			else
			   				switchlist[i] = 0;			
					}
				}	
			} 
		}

		var priority = findMax(switchlist);
		//console.log(switchlist);
		//console.log(pkmList);
		return "switch " + (switchlist.indexOf(priority) + 1);
	}

	var moveEvaluation = function(gameState, options) {
		var bot = gameState.sides[1];
		var opp = gameState.sides[0];

		var botPkm = gameState.sides[1].active[0];
		var oppPkm = gameState.sides[0].active[0];

		var botHP = botPkm.hp/botPkm.maxhp;
		var oppHP = oppPkm.hp/oppPkm.maxhp;
		
		var moveSet = bot.active[0].moveset;
		var movePriority = [];

		var recovery = ["softboiled", "recover", "synthesis", "moonlight", "morningsun", "roost", "rest"];
		var entryHazards = ["stealthrock","spikes","toxicspikes","stickyweb"];
		var priorityDamageMove = ["fakeout","aquajet","bulletpunch","iceshard","machpunch","quickattack","shadowsneak","suckerpunch","vacuumwave"];
		
		for (var i = 0; i<moveSet.length; i++) {
			var move = moveSet[i];
			var moveData = Tools.getMove(move.id);

			if (move.pp <= 1 || move.disabled == true) {
				movePriority[i] = -1;
			}
			else if (oppHP < 0.2 && priorityDamageMove.indexOf(move.id) >= 0 && gameState.getDamage(botPkm, oppPkm, move.id) > oppPkm.hp) {
				movePriority[i] = 12;
			} //priority move 
			else if (botPkm.speed > oppPkm.speed && gameState.getDamage(botPkm, oppPkm, move.id) > oppPkm.hp) {
				movePriority[i] = 10;
			} //finishing move
			else if (botHP > 0.5 && gameState.getDamage(botPkm, oppPkm, move.id) > oppPkm.hp) {
				movePriority[i] = 9;
			} //finishing move
			else if (botHP < 0.4 && recovery.indexOf(move.id) >= 0 ){
				movePriority[i] = 9
			} //recovery
			else if (botHP > 0.6 && entryHazards.indexOf(move.id) >= 0 && !opp.getSideCondition(move.id)) {
				movePriority[i] = 8;
			} //entry hazard
			else {
				if(Tools.getEffectiveness(moveData, oppPkm) > 0 && (gameState.getDamage(botPkm, oppPkm, move.id) > 0 && botPkm.getTypes().indexOf(moveData.type) >= 0 && 
				Tools.getImmunity(moveData, oppPkm.getTypes()))) {
			        movePriority[i] = 7;
			    } //super effective
			    else if(Tools.getEffectiveness(moveData, oppPkm) === 0 && gameState.getDamage(botPkm, oppPkm, move.id) > 0 &&
			    Tools.getImmunity(moveData, oppPkm.getTypes())) {
			        movePriority[i] = 6;
			    } //effective move
			    else if (gameState.getDamage(botPkm, oppPkm, move.id) > 0 && Tools.getEffectiveness(moveData, oppPkm) < 0){
			    	movePriority[i] = 2;
			    } //bad move
			    else if(Tools.getEffectiveness(moveData, oppPkm) < 0 && !Tools.getImmunity(moveData, oppPkm.getTypes())){
			    	movePriority[i] = 1;
			    } //useless tier
			    else {
			    	movePriority[i] = 3;
			    } //non damage move
			} //other cases
			if (moveData.desc.includes("Lowers the user")) //moves affecting stat
				movePriority[i] -= 1;
		}
		
		//console.log(moveSet);
		console.log(bot.active[0].moves);
		//console.log(options);
		console.log(movePriority);

		var priority = findMax(movePriority);

		var advantage = botToOpp(botPkm, oppPkm);	

		if ((advantage === -2 && priority < 9) || (advantage <= 0 && priority < 6 )) {
			return switchPriority(bot,opp);
		}

		var moveChosen = movePriority.indexOf(priority) + 1;
		return "move " + moveChosen;
	}

	var move ='';
	var bot = gameState.sides[1];
	var opp = gameState.sides[0];

	if (gameState.sides[0].active[0]) {
		if (!forceSwitch) {
			move = moveEvaluation(gameState, options);
		}
		else {
			move = switchPriority(bot,opp);
		}	
	}
	return move;	
}

var findMax = function(array) {
	var max = 0;
	for (i=0; i<array.length; i++) {
		if (array[i] > max)
			max = array[i];
	}
	return max;
}