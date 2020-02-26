import Chance from "chance";
import adjectives from "./data/adjectives.json";
import animals from "./data/animals.json";

function generateUsernameFromSeed(seed: string): string{
  const chance = new Chance(seed);
  const index1 = chance.integer({min: 0, max: adjectives.length - 1});
  const index2 = chance.integer({min: 0, max: adjectives.length - 1});
  const index3 = chance.integer({min: 0, max: animals.length - 1});
  return [adjectives[index1], adjectives[index2], animals[index3]].map(u => u[0].toUpperCase() + u.slice(1)).join(" ");
}

export default {
  generateUsernameFromSeed
};
