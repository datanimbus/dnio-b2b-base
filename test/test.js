const { writeFileSync } = require('fs');

const codeGen = require('../generator/code.generator');
const validator = require('../generator/schema.validator');

const sampleJSON = require('./test.01.simpleAPI.json');
// const sampleJSON = require('./test.01.error.json');

try{
	validator(sampleJSON);
	const stages = codeGen.generateStages(sampleJSON);
	const code = codeGen.generateCode(sampleJSON);
	console.log("Flow code generated!");
	writeFileSync('../stage.utils.js', stages);
	writeFileSync('../route.js', code);
} catch(e){
	console.log(e.message);
}
