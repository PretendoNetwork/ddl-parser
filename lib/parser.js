const fs = require('fs');
const DDL_PARSE_TREE_MAGIC = Buffer.from([
	0xCD, 0x65, 0x23, 0x12
]);

let CURRENT_TREE_POSITION = 0;

class DDLParseTree {
	constructor(fd) {
		this.fd = fd;

		this.major;
		this.minor;
		this.micro;
		this.build;
		this.rootNamespace = new DDLNamespace(fd);
	}

	toJSON() {
		return {
			major: this.major,
			minor: this.minor,
			micro: this.micro,
			build: this.build,
			rootNamespace: this.rootNamespace
		};
	}

	parse() {
		const majorBuffer = Buffer.alloc(4);
		const minorBuffer = Buffer.alloc(4);
		const microBuffer = Buffer.alloc(4);
		const buildBuffer = Buffer.alloc(4);

		CURRENT_TREE_POSITION++; // skip unknown uint8

		fs.readSync(this.fd, majorBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		fs.readSync(this.fd, minorBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		fs.readSync(this.fd, microBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		fs.readSync(this.fd, buildBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		this.major = majorBuffer.readUInt32BE();
		this.minor = minorBuffer.readUInt32BE();
		this.micro = microBuffer.readUInt32BE();
		this.build = buildBuffer.readUInt32BE();

		this.rootNamespace.parse();
	}
}

class DDLNamespace {
	constructor(fd) {
		this.fd = fd;

		this.elementCount;
		this.elements = [];
	}

	toJSON() {
		return {
			elements: this.elements
		};
	}

	parse() {
		const elementCountBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, elementCountBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

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

	toJSON() {
		return {
			body: this.body
		};
	}

	parse() {
		const typeBuffer = Buffer.alloc(1);

		fs.readSync(this.fd, typeBuffer, 0, 1, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION++;

		this.type = typeBuffer.readUInt8();

		switch (this.type) {
			case 1: // NamespaceItem
				this.body = new DDLNamespaceItem(this.fd);
				break;
			case 2: // Declaration
				this.body = new DDLDeclaration(this.fd);
				break;
			case 3: // DOClassDeclaration
				this.body = new DDLDOClassDeclaration(this.fd);
				break;
			case 4: // DatasetDeclaration
				this.body = new DDLDatasetDeclaration(this.fd);
				break;
			case 5: // TypeDeclaration
				this.body = new DDLTypeDeclaration(this.fd);
				break;
			case 6: // Variable
				this.body = new DDLVariable(this.fd);
				break;
			case 8: // Variable
				this.body = new DDLRMC(this.fd);
				break;
			case 9: // Action
				this.body = new DDLAction(this.fd);
				break;
			case 10: // AdapterDeclaration
				this.body = new DDLAdapterDeclaration(this.fd);
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
			case 14: // ReturnValue
				this.body = new DDLReturnValue(this.fd);
				break;
			case 15: // ClassDeclaration
				this.body = new DDLClassDeclaration(this.fd);
				break;
			case 16: // TemplateDeclaration
				this.body = new DDLTemplateDeclaration(this.fd);
				break;
			case 17: // SimpleTypeDeclaration
				this.body = new DDLSimpleTypeDeclaration(this.fd);
				break;
			case 18: // TemplateInstance
				this.body = new DDLTemplateInstance(this.fd);
				break;
			case 19: // DDLUnitDeclaration
				this.body = new DDLUnitDeclaration(this.fd);
				break;
			case 20: // DupSpaceDeclaration
				this.body = new DDLDupSpaceDeclaration(this.fd);
				break;

			default:
				// For debugging. Remove this later
				throw new Error(`Unknown DDLElement type: ${this.type}`);
		}

		if (this.body) {
			this.body.parse();
		}
	}
}

class DDLDupSpaceDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration
		};
	}

	parse() {
		this.declaration.parse();
	}
}

class DDLAdapterDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration
		};
	}

	parse() {
		this.declaration.parse();
	}
}

class DDLAction {
	constructor(fd) {
		this.fd = fd;

		this.methodDeclaration = new DDLMethodDeclaration(this.fd);
		this.parameters = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			methodDeclaration: this.methodDeclaration,
			parameters: this.parameters
		};
	}

	parse() {
		this.methodDeclaration.parse();
		this.parameters.parse();
	}
}

class DDLDatasetDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.variables = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration,
			variables: this.variables
		};
	}

	parse() {
		this.declaration.parse();
		this.variables.parse();
	}
}

class DDLDOClassDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.declaration = new DDLDeclaration(this.fd);
		this.parentClassName = new DDLString(this.fd);
		this.classID;
		this.namespace = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration,
			parentClassName: this.parentClassName,
			classID: this.classID,
			namespace: this.namespace
		};
	}

	parse() {
		const classIDBuffer = Buffer.alloc(4);

		this.declaration.parse();
		this.parentClassName.parse();

		fs.readSync(this.fd, classIDBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		this.classID = classIDBuffer.readUInt32BE();

		this.namespace.parse();
	}
}

class DDLReturnValue {
	constructor(fd) {
		this.fd = fd;

		this.variable = new DDLVariable(this.fd);
		this.declarationUse = new DDLDeclarationUse(this.fd);
		this.arraySize;
	}

	toJSON() {
		return {
			variable: this.variable,
			declarationUse: this.declarationUse,
			arraySize: this.arraySize
		};
	}

	parse() {
		const arraySizeBuffer = Buffer.alloc(4);

		this.variable.parse();
		this.declarationUse.parse();

		fs.readSync(this.fd, arraySizeBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		this.arraySize = arraySizeBuffer.readUInt32BE();
	}
}

class DDLSimpleTypeDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.typeDeclaration = new DDLTypeDeclaration(this.fd);
	}

	toJSON() {
		return {
			typeDeclaration: this.typeDeclaration
		};
	}

	parse() {
		this.typeDeclaration.parse();
	}
}

class DDLTemplateDeclaration {
	constructor(fd) {
		this.fd = fd;

		this.typeDeclaration = new DDLTypeDeclaration(this.fd);
		this.templateArgumentsNumber;
	}

	toJSON() {
		return {
			typeDeclaration: this.typeDeclaration,
			templateArgumentsNumber: this.templateArgumentsNumber
		};
	}

	parse() {
		this.typeDeclaration.parse();

		const templateArgumentsNumberBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, templateArgumentsNumberBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

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

	toJSON() {
		return {
			variable: this.variable,
			declarationUse: this.declarationUse,
			arraySize: this.arraySize,
			type: this.type
		};
	}

	parse() {
		this.variable.parse();
		this.declarationUse.parse();

		const arraySizeBuffer = Buffer.alloc(4);
		const typeBuffer = Buffer.alloc(1);

		fs.readSync(this.fd, arraySizeBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		fs.readSync(this.fd, typeBuffer, 0, 1, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION++;

		this.arraySize = arraySizeBuffer.readUInt32BE();
		this.type = typeBuffer.readUInt8();
	}
}

class DDLRMC {
	constructor(fd) {
		this.fd = fd;

		this.methodDeclaration = new DDLMethodDeclaration(this.fd);
		this.parameters = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			methodDeclaration: this.methodDeclaration,
			parameters: this.parameters
		};
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
		this.parameters = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration,
			parameters: this.parameters
		};
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
		this.methods = new DDLNamespace(this.fd);
	}

	toJSON() {
		return {
			declaration: this.declaration,
			methods: this.methods
		};
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

	toJSON() {
		return {
			declaration: this.declaration,
			categoryMask: this.categoryMask,
			allowedTargetMask: this.allowedTargetMask
		};
	}

	parse() {
		this.declaration.parse();

		const categoryMaskBuffer = Buffer.alloc(4);
		const allowedTargetMaskBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, categoryMaskBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		fs.readSync(this.fd, allowedTargetMaskBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

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

	toJSON() {
		return {
			typeDeclaration: this.typeDeclaration,
			baseTypeName: this.baseTypeName,
			templateArgumentsLength: this.templateArgumentsLength,
			templateArguments: this.templateArguments
		};
	}

	parse() {
		this.typeDeclaration.parse();
		this.baseTypeName.parse();

		const templateArgumentsLengthBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, templateArgumentsLengthBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

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

		this.nameSpaceItem = new DDLNamespaceItem(this.fd);
		this.declarationUse = new DDLDeclarationUse(this.fd);
		this.arraySize;
	}

	toJSON() {
		return {
			nameSpaceItem: this.nameSpaceItem,
			declarationUse: this.declarationUse,
			arraySize: this.arraySize
		};
	}

	parse() {
		this.nameSpaceItem.parse();
		this.declarationUse.parse();

		const arraySizeBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, arraySizeBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

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

	toJSON() {
		const data = {
			type: this.type,
			name: this.name
		};

		if (this.type === 'TemplateInstance') {
			data.baseTypeName = this.baseTypeName;
			data.argumentsLength = this.argumentsLength;
			data.arguments = this.arguments;
		}

		return data;
	}

	parse() {
		const typeBuffer = Buffer.alloc(1);

		fs.readSync(this.fd, typeBuffer, 0, 1, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION++;

		this.type = typeBuffer.readUInt8();

		this.name.parse();

		if (this.type === 18) { // TemplateInstance
			this.baseTypeName.parse();

			const argumentsLengthBuffer = Buffer.alloc(1);
			
			fs.readSync(this.fd, argumentsLengthBuffer, 0, 1, CURRENT_TREE_POSITION);
			CURRENT_TREE_POSITION++;

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
		this.classMembers = new DDLNamespace(this.fd);
	}

	toJSON() {

		return {
			typeDeclaration: this.typeDeclaration,
			parentClassName: this.parentClassName,
			classMembers: this.classMembers
		};
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

	toJSON() {

		return {
			declaration: this.declaration
		};
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

	toJSON() {

		return {
			declaration: this.declaration,
			unitName: this.unitName,
			unitDirectory: this.unitDirectory
		};
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

		this.nameSpaceItem = new DDLNamespaceItem(this.fd);
		this.unitName = new DDLString(this.fd);
		this.properties = new DDLNamespace(this.fd);
	}

	toJSON() {

		return {
			nameSpaceItem: this.nameSpaceItem,
			unitName: this.unitName,
			properties: this.properties
		};
	}

	parse() {
		this.nameSpaceItem.parse();
		this.unitName.parse();
		this.properties.parse();
	}
}

class DDLNamespaceItem {
	constructor(fd) {
		this.fd = fd;

		this.parseTreeItem1 = new DDLParseTreeItem(this.fd);
		this.parseTreeItem2 = new DDLParseTreeItem(this.fd);
	}

	toJSON() {

		return {
			parseTreeItem1: this.parseTreeItem1,
			parseTreeItem2: this.parseTreeItem2
		};
	}

	parse() {
		this.parseTreeItem1.parse();
		this.parseTreeItem2.parse();
	}
}

class DDLParseTreeItem {
	constructor(fd) {
		this.fd = fd;

		this.name = new DDLString(this.fd);
	}

	toJSON() {

		return {
			name: this.name
		};
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

	toJSON() {

		return {
			value: this.value
		};
	}

	parse() {
		const lengthBuffer = Buffer.alloc(4);

		fs.readSync(this.fd, lengthBuffer, 0, 4, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += 4;

		const length = lengthBuffer.readUInt32BE();

		const stringBuffer = Buffer.alloc(length);

		fs.readSync(this.fd, stringBuffer, 0, length, CURRENT_TREE_POSITION);
		CURRENT_TREE_POSITION += length;

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

	let checkPosition = 0;
	let read;
	const magicCheckBuffer = Buffer.alloc(4);
	const trees = [];

	do {
		read = fs.readSync(fd, magicCheckBuffer, 0, 4, checkPosition);

		if (DDL_PARSE_TREE_MAGIC.equals(magicCheckBuffer)) {
			CURRENT_TREE_POSITION = checkPosition+4;
			try {
				const tree = new DDLParseTree(fd);
				// Pushing first and then parsing ensures that even partially read
				// trees are in the array. If we parse first and then push, if the
				// parser exits early then it won't make it into the array
				// (this is useful for debugging)
				trees.push(tree);
				tree.parse();
			} catch (error) {
				console.log(error);
			}
		}

		checkPosition++;
	} while (read != 0);

	return trees;
}

module.exports = {
	parse,
	DDLParseTree,
	DDLNamespace,
	DDLElement,
	DDLDupSpaceDeclaration,
	DDLAdapterDeclaration,
	DDLAction,
	DDLDatasetDeclaration,
	DDLDOClassDeclaration,
	DDLReturnValue,
	DDLSimpleTypeDeclaration,
	DDLTemplateDeclaration,
	DDLParameter,
	DDLRMC,
	DDLMethodDeclaration,
	DDLProtocolDeclaration,
	DDLPropertyDeclaration,
	DDLTemplateInstance,
	DDLVariable,
	DDLDeclarationUse,
	DDLClassDeclaration,
	DDLTypeDeclaration,
	DDLUnitDeclaration,
	DDLDeclaration,
	DDLNamespaceItem,
	DDLParseTreeItem,
	DDLString,
};