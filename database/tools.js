//database
var BattlePokedex = require('./pokedex.js');
var BattleAliases = require('./aliases.js');
var BattleTypeChart = require('./typechart.js');
var BattleStatIDs = require('./basespecies.js');
var baseSpeciesChart = require('./basespecies');

//Handling teams
module.exports = {

	//Import team from text and convert to a team array
	importTeam: function (text) {
		var text = text.split("\n");
		var team = [];
		var curSet = null;

		for (var i = 0; i < text.length; i++) {
			var line = (text[i]).trim();
			if (line === '' || line === '---') {
				curSet = null;
			} else if (line.substr(0, 3) === '===') {
				team = [];
				line = (line.substr(3, line.length - 6)).trim();
				var format = '';
				var bracketIndex = line.indexOf(']');
				if (bracketIndex >= 0) {
					format = line.substr(1, bracketIndex - 1);
					if (format && format.slice(0, 3) !== 'gen') format = 'gen6' + format;
					line = (line.substr(bracketIndex + 1)).trim();
				}


				var slashIndex = line.lastIndexOf('/');
				var folder = '';
				if (slashIndex > 0) {
					folder = line.slice(0, slashIndex);
					line = line.slice(slashIndex + 1);
				}
				

			} else if (!curSet) {
				curSet = {name: '', species: '', gender: ''};
				team.push(curSet);
				var atIndex = line.lastIndexOf(' @ ');
				if (atIndex !== -1) {
					curSet.item = line.substr(atIndex + 3);
					if (toId(curSet.item) === 'noitem') curSet.item = '';
					line = line.substr(0, atIndex);
				}
				if (line.substr(line.length - 4) === ' (M)') {
					curSet.gender = 'M';
					line = line.substr(0, line.length - 4);
				}
				if (line.substr(line.length - 4) === ' (F)') {
					curSet.gender = 'F';
					line = line.substr(0, line.length - 4);
				}
				var parenIndex = line.lastIndexOf(' (');
				if (line.substr(line.length - 1) === ')' && parenIndex !== -1) {
					line = line.substr(0, line.length - 1);
					curSet.species = getTemplate(line.substr(parenIndex + 2)).species;
					line = line.substr(0, parenIndex);
					curSet.name = line;
				} else {
					curSet.species = getTemplate(line).species;
					curSet.name = '';
				}
			} else if (line.substr(0, 7) === 'Trait: ') {
				line = line.substr(7);
				curSet.ability = line;
			} else if (line.substr(0, 9) === 'Ability: ') {
				line = line.substr(9);
				curSet.ability = line;
			} else if (line === 'Shiny: Yes') {
				curSet.shiny = true;
			} else if (line.substr(0, 7) === 'Level: ') {
				line = line.substr(7);
				curSet.level = +line;
			} else if (line.substr(0, 11) === 'Happiness: ') {
				line = line.substr(11);
				curSet.happiness = +line;
			} else if (line.substr(0, 5) === 'EVs: ') {
				line = line.substr(5);
				var evLines = line.split('/');
				curSet.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
				for (var j = 0; j < evLines.length; j++) {
					var evLine = (evLines[j]).trim();
					var spaceIndex = evLine.indexOf(' ');
					if (spaceIndex === -1) continue;
					var statid = BattleStatIDs[evLine.substr(spaceIndex + 1)];
					var statval = parseInt(evLine.substr(0, spaceIndex), 10);
					if (!statid) continue;
					curSet.evs[statid] = statval;
				}
			} else if (line.substr(0, 5) === 'IVs: ') {
				line = line.substr(5);
				var ivLines = line.split(' / ');
				curSet.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
				for (var j = 0; j < ivLines.length; j++) {
					var ivLine = ivLines[j];
					var spaceIndex = ivLine.indexOf(' ');
					if (spaceIndex === -1) continue;
					var statid = BattleStatIDs[ivLine.substr(spaceIndex + 1)];
					var statval = parseInt(ivLine.substr(0, spaceIndex), 10);
					if (!statid) continue;
					if (isNaN(statval)) statval = 31;
					curSet.ivs[statid] = statval;
				}
			} else if (line.match(/^[A-Za-z]+ (N|n)ature/)) {
				var natureIndex = line.indexOf(' Nature');
				if (natureIndex === -1) natureIndex = line.indexOf(' nature');
				if (natureIndex === -1) continue;
				line = line.substr(0, natureIndex);
				if (line !== 'undefined') curSet.nature = line;
			} else if (line.substr(0, 1) === '-' || line.substr(0, 1) === '~') {
				line = line.substr(1);
				if (line.substr(0, 1) === ' ') line = line.substr(1);
				if (!curSet.moves) curSet.moves = [];
				if (line.substr(0, 14) === 'Hidden Power [') {
					var hptype = line.substr(14, line.length - 15);
					line = 'Hidden Power ' + hptype;
					if (!curSet.ivs && BattleTypeChart) {
						curSet.ivs = {};
						for (var stat in BattleTypeChart[hptype].HPivs) {
							curSet.ivs[stat] = BattleTypeChart[hptype].HPivs[stat];
						}
					}
				}
				if (line === 'Frustration') {
					curSet.happiness = 0;
				}
				curSet.moves.push(line);
			}
		}

		return team;
	},

	//Convert team array to mess to send to server
	packTeam: function (team) {
		var buf = '';
		if (!team) return '';

		for (var i = 0; i < team.length; i++) {
			var set = team[i];
			if (buf) buf += ']';

			// name
			buf += set.name;

			// species
			var id = toId(set.species);
			buf += '|' + (toId(set.name) === id ? '' : id);

			// item
			buf += '|' + toId(set.item);

			// ability
			var template = getTemplate(set.species || set.name);
			//var abilities = template.abilities;
			var abilities = getAbilities(set.species || set.name); //replacement function since original code doesn't request abilities
			id = toId(set.ability);
			if (abilities) {
				if (id == toId(abilities['0'])) {
					buf += '|';
				} else if (id === toId(abilities['1'])) {
					buf += '|1';
				} else if (id === toId(abilities['H'])) {
					buf += '|H';
				} else {
					buf += '|' + id;
				}
			} else {
				buf += '|' + id;
			}

			// moves
			if (set.moves) {
				buf += '|' + set.moves.map(toId).join(',');
			} else {
				buf += '|';
			}

			// nature
			buf += '|' + (set.nature || '');

			// evs
			var evs = '|';
			if (set.evs) {
				evs = '|' + (set.evs['hp'] || '') + ',' + (set.evs['atk'] || '') + ',' + (set.evs['def'] || '') + ',' + (set.evs['spa'] || '') + ',' + (set.evs['spd'] || '') + ',' + (set.evs['spe'] || '');
			}
			if (evs === '|,,,,,') {
				buf += '|';
				// doing it this way means packTeam doesn't need to be past-gen aware
				if (set.evs['hp'] === 0) buf += '0';
			} else {
				buf += evs;
			}

			// gender
			if (set.gender && set.gender !== template.gender) {
				buf += '|' + set.gender;
			} else {
				buf += '|';
			}

			// ivs
			var ivs = '|';
			if (set.ivs) {
				ivs = '|' + (set.ivs['hp'] === 31 || set.ivs['hp'] === undefined ? '' : set.ivs['hp']) + ',' + (set.ivs['atk'] === 31 || set.ivs['atk'] === undefined ? '' : set.ivs['atk']) + ',' + (set.ivs['def'] === 31 || set.ivs['def'] === undefined ? '' : set.ivs['def']) + ',' + (set.ivs['spa'] === 31 || set.ivs['spa'] === undefined ? '' : set.ivs['spa']) + ',' + (set.ivs['spd'] === 31 || set.ivs['spd'] === undefined ? '' : set.ivs['spd']) + ',' + (set.ivs['spe'] === 31 || set.ivs['spe'] === undefined ? '' : set.ivs['spe']);
			}
			if (ivs === '|,,,,,') {
				buf += '|';
			} else {
				buf += ivs;
			}

			// shiny
			if (set.shiny) {
				buf += '|S';
			} else {
				buf += '|';
			}

			// level
			if (set.level && set.level != 100) {
				buf += '|' + set.level;
			} else {
				buf += '|';
			}

			// happiness
			if (set.happiness !== undefined && set.happiness !== 255) {
				buf += '|' + set.happiness;
			} else {
				buf += '|';
			}
		}
		return buf;
	}


};

//get Pokemon abilities
function getAbilities (speciesName) {
	var abilities = {};
	var name = speciesName;
	var id = toId(name);
	var speciesid = id;
	if (BattleAliases && BattleAliases[id]) {
		name = BattleAliases[id];
		id = toId(name);
	}
	if (BattlePokedex[id]) 
		abilities = BattlePokedex[id]["abilities"];
	return abilities;
}

function getTemplate (template) {
	if (!template || typeof template === 'string') {
		var name = template;
		var id = toId(name);
		var speciesid = id;
		if (BattleAliases && BattleAliases[id]) {
			name = BattleAliases[id];
			id = toId(name);
		}
		if (!id) name = '';
		if (!BattlePokedex) BattlePokedex = {};
		if (!BattlePokedex[id]) {
			template = BattlePokedex[id] = {};
			for (var i = 0; i < baseSpeciesChart.length; i++) {
				var baseid = baseSpeciesChart[i];
				if (id.length > baseid.length && id.substr(0, baseid.length) === baseid) {
					template.baseSpecies = baseid;
					template.forme = id.substr(baseid.length);
				}
			}
			if (id !== 'yanmega' && id.slice(-4) === 'mega') {
				template.baseSpecies = id.slice(0, -4);
				template.forme = id.slice(-4);
			} else if (id.slice(-6) === 'primal') {
				template.baseSpecies = id.slice(0, -6);
				template.forme = id.slice(-6);
			} else if (id.slice(-5) === 'alola') {
				template.baseSpecies = id.slice(0, -5);
				template.forme = id.slice(-5);
			}
			template.exists = false;
		}
		template = BattlePokedex[id];
		if (template.species) name = template.species;
		if (template.exists === undefined) template.exists = true;
		if (!template.id) template.id = id;
		if (!template.name) template.name = name = escapeHTML(name);
		if (!template.speciesid) template.speciesid = id;
		if (!template.species) template.species = name;
		if (!template.baseSpecies) template.baseSpecies = name;
		if (!template.forme) template.forme = '';
		if (!template.formeLetter) template.formeLetter = '';
		if (!template.formeid) {
			var formeid = '';
			if (template.baseSpecies !== name) {
				formeid = '-' + toId(template.forme);
			}
			template.formeid = formeid;
		}
		if (!template.spriteid) template.spriteid = toId(template.baseSpecies) + template.formeid;
		if (!template.effectType) template.effectType = 'Template';
		if (!template.gen) {
			if (template.forme && template.formeid in {'-mega':1, '-megax':1, '-megay':1}) {
				template.gen = 6;
				template.isMega = true;
				template.battleOnly = true;
			} else if (template.formeid === '-primal') {
				template.gen = 6;
				template.isPrimal = true;
				template.battleOnly = true;
			} else if (template.formeid === '-alola') {
				template.gen = 7;
			} else if (template.num >= 722) {
				template.gen = 7;
			} else if (template.num >= 650) {
				template.gen = 6;
			} else if (template.num >= 494) {
				template.gen = 5;
			} else if (template.num >= 387) {
				template.gen = 4;
			} else if (template.num >= 252) {
				template.gen = 3;
			} else if (template.num >= 152) {
				template.gen = 2;
			} else if (template.num >= 1) {
				template.gen = 1;
			} else {
				template.gen = 0;
			}
		}
		if (template.otherForms && template.otherForms.indexOf(speciesid) >= 0) {
			if (!BattlePokedexAltForms) BattlePokedexAltForms = {};
			if (!BattlePokedexAltForms[speciesid]) {
				template = window.BattlePokedexAltForms[speciesid] = $.extend({}, template);
				var form = speciesid.slice(template.baseSpecies.length);
				var formid = '-' + form;
				form = form[0].toUpperCase() + form.slice(1);
				template.form = form;
				template.species = template.baseSpecies + (form ? '-' + form : '');
				template.speciesid = toId(template.species);
				template.spriteid = toId(template.baseSpecies) + formid;
			}
			template = BattlePokedexAltForms[speciesid];
		}
	}
	return template;
}


//Helper function: handle strings and pokemon names
function getString(str) {
	if (typeof str === 'string' || typeof str === 'number') return '' + str;
	return '';
}

function escapeHTML(str, jsEscapeToo) {
	str = getString(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	if (jsEscapeToo) str = str.replace(/'/g, '\\\'');
	return str;
}

function toId(text) {
	if (text && text.id) {
		text = text.id;
	} else if (text && text.userid) {
		text = text.userid;
	}
	if (typeof text !== 'string' && typeof text !== 'number') return '';
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

//check if string.prototype.trim is a function or not and declare the function if not
if (typeof String.prototype.trim != 'function') { // detect native implementation
  String.prototype.trim = function () {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  };
}
