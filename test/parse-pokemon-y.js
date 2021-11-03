const DDL = require('..');
const ESSerializer = require('esserializer');
const fs = require('fs');
const pokemonDumpPath = `${__dirname}/../pokemony/exefs/code.bin`;

const trees = DDL.parse(pokemonDumpPath);

for (const tree of trees) {
	const serialized = ESSerializer.serialize(tree, {
		ignoreProperties: ['fd']
	});
	fs.writeFileSync(`${__dirname}/pokemon-y-tree-${trees.indexOf(tree)}.json`, JSON.stringify(JSON.parse(serialized), null, 4)); // write pretty-printed
}