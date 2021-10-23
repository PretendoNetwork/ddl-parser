const fs = require('fs');
const DDL_PARSE_TREE_MAGIC = Buffer.from([
	0xCD, 0x65, 0x23, 0x12
]);

class DDLParseTree {
	constructor(fd) {
		this.fd = fd;

		this.major;
		this.minor;
		this.micro;
		this.build;
		this.rootNamespace = new DDLNameSpace(fd);
	}

	parse() {
		const majorBuffer = Buffer.alloc(4);
		const minorBuffer = Buffer.alloc(4);
		const microBuffer = Buffer.alloc(4);
		const buildBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, Buffer.alloc(1)); // skip unknown
		fs.readSync(this.fd, majorBuffer);
		fs.readSync(this.fd, minorBuffer);
		fs.readSync(this.fd, microBuffer);
		fs.readSync(this.fd, buildBuffer);

		this.major = majorBuffer.readUInt32BE();
		this.minor = minorBuffer.readUInt32BE();
		this.micro = microBuffer.readUInt32BE();
		this.build = buildBuffer.readUInt32BE();

		this.rootNamespace.parse();
	}
}

class DDLNameSpace {
	constructor(fd) {
		this.fd = fd;

		this.elementCount;
		this.elements = [];
	}

	parse() {
		const elementCountBuffer = Buffer.alloc(4);
		fs.readSync(this.fd, elementCountBuffer);
		this.elementCount = elementCountBuffer.readUInt32BE();

		for (let i = 0; i < this.elementCount; i++) {
			const element = new DDLElement(this.fd);
			element.parse();

			this.elements.push(element);
		}
	}
}

class DDLElement {
	constructor(fd) {
		this.fd = fd;

		this.type;
		this.body;
	}

	parse() {
		const typeBuffer = Buffer.alloc(1);
		fs.readSync(this.fd, typeBuffer);
		this.type = typeBuffer.readUInt8();

		switch (this.type) {
			case 1: // NameSpaceItem
				this.body = new DDLNameSpaceItem(this.fd);
				break;
			case 6: // Variable
				this.body = new DDLVariable(this.fd);
				break;
			case 8: // Variable
				this.body = new DDLRMC(this.fd);
				break;
			case 11: // PropertyDeclaration
				this.body = new DDLPropertyDeclaration(this.fd);
				break;
			case 12: // ProtocolDeclaration
				this.body = new DDLProtocolDeclaration(this.fd);
				break;
			case 13: // Parameter
				this.body = new DDLParameter(this.fd);
				break;
			case 15: // ClassDeclaration
				this.body = new DDLClassDeclaration(this.fd);
				break;
			case 16: // TemplateDeclaration
				this.body = new DDLTemplateDeclaration(this.fd);
				break;
			case 18: // TemplateInstance
				this.body = new DDLTemplateInstance(this.fd);
				break;
			case 19: // DDLUnitDeclaration
				this.body = new DDLUnitDeclaration(this.fd);
				break;

			default:
				// For debugging. Remove this later
				console.log('Unknown DDLElement type:', this.type, '\nExiting');
				process.exit(0);
				break;
		}

		if (this.body) {
			this.body.parse();
		}
	}
}

class DDLTemplateDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.typeDeclaration = new DDLTypeDeclaration(this.fd);
		this.templateArgumentsNumber;
	}

	parse() {
		this.typeDeclaration.parse();

		const templateArgumentsNumberBuffer = Buffer.alloc(4);
		
		fs.readSync(this.fd, templateArgumentsNumberBuffer);

		this.templateArgumentsNumber = templateArgumentsNumberBuffer.readUInt32BE();
	}
}

class DDLParameter {
	constructor(fd) {
		this.fd = fd;

		this.variable = new DDLVariable(this.fd);
		this.declarationUse = new DDLDeclarationUse(this.fd);
		this.arraySize;
		this.type;
	}

	parse() {
		this.variable.parse();
		this.declarationUse.parse();

		const arraySizeMaskBuffer = Buffer.alloc(4);
		const typeMaskBuffer = Buffer.alloc(1);

		fs.readSync(this.fd, arraySizeMaskBuffer);
		fs.readSync(this.fd, typeMaskBuffer);

		this.arraySize = arraySizeMaskBuffer.readUInt32BE();
		this.type = typeMaskBuffer.readUInt8();
	}
}

class DDLRMC {
	constructor(fd) {
		this.fd = fd;

		this.methodDeclaration = new DDLMethodDeclaration(this.fd);
		this.parameters = new DDLNameSpace(this.fd);
	}

	parse() {
		this.methodDeclaration.parse();
		this.parameters.parse();
	}
}

class DDLMethodDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.parameters = new DDLNameSpace(this.fd);
	}

	parse() {
		this.declaration.parse();
		this.parameters.parse();
	}
}

class DDLProtocolDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.methods = new DDLNameSpace(this.fd);
	}

	parse() {
		this.declaration.parse();
		this.methods.parse();
	}
}

class DDLPropertyDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.categoryMask;
		this.allowedTargetMask;
	}

	parse() {
		this.declaration.parse();

		const categoryMaskBuffer = Buffer.alloc(4);
		const allowedTargetMaskBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, categoryMaskBuffer);
		fs.readSync(this.fd, allowedTargetMaskBuffer);

		this.categoryMask = categoryMaskBuffer.readUInt32BE();
		this.allowedTargetMask = allowedTargetMaskBuffer.readUInt32BE();
	}
}

class DDLTemplateInstance {
	constructor(fd) {
		this.fd = fd;

		this.typeDeclaration = new DDLTypeDeclaration(this.fd);
		this.baseTypeName = new DDLString(this.fd);
		this.templateArgumentsLength;
		this.templateArguments = [];
	}

	parse() {
		this.typeDeclaration.parse();
		this.baseTypeName.parse();

		const templateArgumentsLengthBuffer = Buffer.alloc(4);
		fs.readSync(this.fd, templateArgumentsLengthBuffer);
		this.templateArgumentsLength = templateArgumentsLengthBuffer.readUInt32BE();

		for (let i = 0; i < this.templateArgumentsLength; i++) {
			const string = new DDLString(this.fd);
			string.parse();
			this.templateArguments.push(string);
		}
	}
}

class DDLVariable {
	constructor(fd) {
		this.fd = fd;

		this.nameSpaceItem = new DDLNameSpaceItem(this.fd);
		this.declarationUse = new DDLDeclarationUse(this.fd);
		this.arraySize;
	}

	parse() {
		this.nameSpaceItem.parse();
		this.declarationUse.parse();

		const arraySizeBuffer = Buffer.alloc(4);
		fs.readSync(this.fd, arraySizeBuffer);
		this.arraySize = arraySizeBuffer.readUInt32BE();
	}
}

class DDLDeclarationUse {
	constructor(fd) {
		this.fd = fd;

		this.type;
		this.name = new DDLString(this.fd);

		// only if declaration type is TemplateInstance
		this.baseTypeName = new DDLString(this.fd);
		this.argumentsLength;
		this.arguments = [];
	}

	parse() {
		const typeBuffer = Buffer.alloc(1);
		fs.readSync(this.fd, typeBuffer);
		this.type = typeBuffer.readUInt8();

		this.name.parse();

		if (this.type === 18) { // TemplateInstance
			this.baseTypeName.parse();

			const argumentsLengthBuffer = Buffer.alloc(1);
			fs.readSync(this.fd, argumentsLengthBuffer);
			this.argumentsLength = argumentsLengthBuffer.readUInt8();

			for (let i = 0; i < this.argumentsLength; i++) {
				const declarationUse = new DDLDeclarationUse(this.fd);
				declarationUse.parse();
				this.arguments.push(declarationUse);
			}
		}
	}
}

class DDLClassDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.typeDeclaration = new DDLTypeDeclaration(this.fd);
		this.parentClassName = new DDLString(this.fd);
		this.classMembers = new DDLNameSpace(this.fd);
	}

	parse() {
		this.typeDeclaration.parse();
		this.parentClassName.parse();
		this.classMembers.parse();
	}
}

class DDLTypeDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
	}

	parse() {
		this.declaration.parse();
	}
}

class DDLUnitDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.unitName = new DDLString(this.fd);
		this.unitDirectory = new DDLString(this.fd);
	}

	parse() {
		this.declaration.parse();
		this.unitName.parse();
		this.unitDirectory.parse();
	}
}

class DDLDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.nameSpaceItem = new DDLNameSpaceItem(this.fd);
		this.unitName = new DDLString(this.fd);
		this.properties = new DDLNameSpace(this.fd);
	}

	parse() {
		this.nameSpaceItem.parse();
		this.unitName.parse();
		this.properties.parse();
	}
}

class DDLNameSpaceItem {
	constructor(fd) {
		this.fd = fd;

		this.parseTreeItem1 = new ParseTreeItem(this.fd);
		this.parseTreeItem2 = new ParseTreeItem(this.fd);
	}

	parse() {
		this.parseTreeItem1.parse();
		this.parseTreeItem2.parse();
	}
}

class ParseTreeItem {
	constructor(fd) {
		this.fd = fd;

		this.name = new DDLString(this.fd);
	}

	parse() {
		this.name.parse();
	}
}

class DDLString {
	constructor(fd) {
		this.fd = fd;

		this.value;
	}

	parse() {
		const lengthBuffer = Buffer.alloc(4);
		fs.readSync(this.fd, lengthBuffer);
		const length = lengthBuffer.readUInt32BE();

		const stringBuffer = Buffer.alloc(length);
		fs.readSync(this.fd, stringBuffer);

		this.value = stringBuffer.toString();

		return this.value;
	}
}

function parse(pathOrFileDescriptor) {
	let fd;
	if (typeof pathOrFileDescriptor !== 'number') {
		fd = fs.openSync(pathOrFileDescriptor);
	} else {
		fd = pathOrFileDescriptor;
	}

	const trees = [];
	const magicCheckBuffer = Buffer.alloc(4);

	let read;
	do {
		read = fs.readSync(fd, magicCheckBuffer);
		read;

		if (DDL_PARSE_TREE_MAGIC.equals(magicCheckBuffer)) {
			const tree = new DDLParseTree(fd);
			// Pushing first and then parsing ensures that even partially read
			// trees are in the array. If we parse first and then push, if the
			// parser exits early then it won't make it into the array
			// (this is useful for debugging)
			trees.push(tree);
			tree.parse();
		}
	} while (read != 0);

	return trees;
}

module.exports = {
	parse
};