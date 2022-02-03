const { writeFileSync } = require('fs');

const codeGen = require('../generator/code.generator');
// const sampleJSON = require('./sample.json');
const sampleJSON = require('./test.01.simpleAPI.json');

const stages = codeGen.generateStages(sampleJSON);
const code = codeGen.generateCode(sampleJSON);

writeFileSync('../stage.utils.js', stages);
writeFileSync('../route.js', code);