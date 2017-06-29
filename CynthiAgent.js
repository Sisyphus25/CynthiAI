'use strict';

var Pokemon = require('./zarel/battle-engine.js').BattlePokemon;
var BattleSide = require('./zarel/battle-engine.js').BattleSide;

function CynthiAgent() {
	/*
    getOptions(state, player) {
        if (typeof (player) == 'string' && player.startsWith('p')) {
            player = parseInt(player.substring(1)) - 1;
        }
        return Tools.parseRequestData(state.sides[player].getRequestData());
    }

    fetch_random_key(obj) {
        var temp_key, keys = [];
        for (temp_key in obj) {
            if (obj.hasOwnProperty(temp_key)) {
                keys.push(temp_key);
            }
        }
        return keys[Math.floor(Math.random() * keys.length)];
    }
	*/

    this.decide = function (gameState, options, mySide, forceSwitch) { //todo: learn format of options, where does options come from, and why doesn't there seem to be any switches?
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

    	//test2.js will call this decide function and it will send final choice to server as the bot's decision
		this.mySID = mySide.n;
    	var botSide = mySide.id;
    	console.log("mySide:");
    	console.log(botSide); //p2

    	var copiedState = gameState.copy();
    	copiedState.p1.currentRequest = 'move'; //what is this for? idk what it's for but it's required for the sim to work
		copiedState.p2.currentRequest = 'move';

		if (options) {
			var firstchoice = Object.keys(options)[0];
			console.log(firstchoice);
			copiedState.choose(botSide, firstchoice);
			copiedState.choose('p1', 'forceskip');
		}
		if (copiedState.sides[0].active[0]) {
			console.log(copiedState.sides[0].active[0].hp + '/' +copiedState.sides[0].active[0].maxhp);
		}
    }

    this.assumePokemon = function (pname, plevel, pgender, side) {
        var nSet = {
            species: pname,
            name: pname,
            level: plevel,
            gender: pgender,
            evs: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: "Hardy",
            ability: "Honey Gather"
        };
        // If the species only has one ability, then the pokemon's ability can only have the one ability.
        // Barring zoroark, skill swap, and role play nonsense.
        // This will be pretty much how we digest abilities as well
        if (Object.keys(Tools.getTemplate(pname).abilities).length == 1) { //TODO: buggy, problem is it doesn't support gen 7. update data files
            nSet.ability = Tools.getTemplate(pname).abilities['0'];
        }

        var basePokemon = new Pokemon(nSet, side);

        return basePokemon;
    }
}

module.exports.CynthiAgent = CynthiAgent;