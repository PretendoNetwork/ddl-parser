const DDL = require('..');
const pokemonDumpPath = `${__dirname}/../pokemony/exefs/code.bin`;

const trees = DDL.parse(pokemonDumpPath);

console.log(trees);