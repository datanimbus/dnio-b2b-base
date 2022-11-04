const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');

const codeGen = require('./code.generator');
const schemaUtils = require('./schema.utils');

const logger = log4js.getLogger(global.loggerName);

async function createProject(flowJSON) {
	try {
		if (!flowJSON.port) {
			flowJSON.port = 31000;
		}
		// const folderPath = path.join(process.cwd(), 'generatedFlows', flowJSON._id);
		const folderPath = process.cwd();

		mkdirp.sync(path.join(folderPath, 'schemas'));

		if (flowJSON.dataStructures && Object.keys(flowJSON.dataStructures).length > 0) {
			Object.keys(flowJSON.dataStructures).forEach(schemaID => {
				let schema = flowJSON.dataStructures[schemaID];
				schema._id = schemaID;
				if (schema.definition) {
					fs.writeFileSync(path.join(folderPath, 'schemas', `${schemaID}.schema.json`), JSON.stringify(schemaUtils.convertToJSONSchema(schema)));
				}
			});
		}
		const nodeUtilsContent = await codeGen.parseNodes(flowJSON);
		fs.writeFileSync(path.join(folderPath, 'route.js'), codeGen.parseFlow(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'node.utils.js'), nodeUtilsContent);
		fs.writeFileSync(path.join(folderPath, 'file.utils.js'), codeGen.parseDataStructuresForFileUtils(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'validation.utils.js'), codeGen.parseDataStructures(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'flow.json'), JSON.stringify(flowJSON));

		// fs.rmdirSync(path.join(folderPath, 'generator'), { recursive: true });

		logger.info('Project Created!');
	} catch (e) {
		logger.error('Project Error!', e);
	}
}

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';


module.exports.createProject = createProject;