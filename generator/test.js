const { writeFileSync } = require('fs');

const codeGen = require('./code.generator');
const sampleJSON = require('./sample.json');

const stages = codeGen.parseStages(sampleJSON);
const code = codeGen.parseFlow(sampleJSON);

writeFileSync('../stage.utils.js', stages);
writeFileSync('../route.js', code);