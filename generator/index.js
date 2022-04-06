const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');

const config = require('../config');
const codeGen = require('./generators/code.generator');
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
		fs.writeFileSync(path.join(folderPath, 'route.js'), codeGen.parseFlow(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'stage.utils.js'), codeGen.parseStages(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'validation.utils.js'), codeGen.parseDataStructures(flowJSON));
		fs.writeFileSync(path.join(folderPath, 'flow.json'), JSON.stringify(flowJSON));
		fs.writeFileSync(path.join(folderPath, '.env'), getEnvFile(config.release, flowJSON.port, flowJSON));

		fs.rmdirSync(path.join(folderPath, 'test'), { recursive: true });
		fs.rmdirSync(path.join(folderPath, 'generators'), { recursive: true });

		logger.info('Project Created!');
	} catch (e) {
		logger.error('Project Error!', e);
	}
}

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';


function getEnvFile(release, port, flowData) {
	return `
    DATA_STACK_NAMESPACE="${config.DATA_STACK_NAMESPACE}"
    DATA_STACK_APP="${flowData.app}"
    DATA_STACK_FLOW_NAMESPACE="${flowData.namespace}"
    DATA_STACK_FLOW_ID="${flowData._id}"
    DATA_STACK_FLOW_NAME="${flowData.name}"
    DATA_STACK_FLOW_VERSION="${flowData.version}"
    DATA_STACK_DEPLOYMENT_NAME="${flowData.deploymentName}"
    RELEASE="${release}"
    PORT="${port}"
    ENV IMAGE_TAG="${flowData._id}:${flowData.version}"
    DATA_DB="${config.dataStackNS}-${flowData.appName}"
  `;
}


module.exports.createProject = createProject;