const Chance = require('chance');
const adjectives = require('./data/adjectives.json');
const animals = require('./data/animals.json');

const Utils = {
  generateUsernameFromSeed: function(seed) {
    const chance = new Chance(seed);
    let index_1 = chance.integer({min: 0, max: adjectives.length - 1})
    let index_2 = chance.integer({min: 0, max: adjectives.length - 1})
    let index_3 = chance.integer({min: 0, max: animals.length - 1})
		return [adjectives[index_1], adjectives[index_2], animals[index_3]].map((u) => u[0].toUpperCase() + u.slice(1)).join(' ');
  }
}

module.exports = Utils;
