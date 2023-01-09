const { writeFileSync } = require('fs');

const codeGen = require('./code.generator');
const flowJSON = require('./sample.json');

// const stages = codeGen.parseFlow(sampleJSON);
const code = codeGen.parseFlow(flowJSON);


(async () => {
	const nodeUtilsContent = await codeGen.parseNodes(flowJSON);
	writeFileSync('../route.js', codeGen.parseFlow(flowJSON));
	writeFileSync('../node.utils.js', nodeUtilsContent);
	writeFileSync('../file.utils.js', codeGen.parseDataStructuresForFileUtils(flowJSON));
	writeFileSync('../validation.utils.js', codeGen.parseDataStructures(flowJSON));
	// writeFileSync('../flow.json', JSON.stringify(flowJSON));
})();