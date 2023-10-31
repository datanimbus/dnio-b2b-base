// const log4js = require('log4js');
const _ = require('lodash');
const { v4: uuid } = require('uuid');
const config = require('../config');
const commonUtils = require('../utils/common.utils');

let logger = global.logger;
let flowData;
let hasGlobaErrorHandler = false;

let visitedNodes = [];
let visitedValidation = [];
let hasAtLeastOneCondition = false;

function tab(len) {
	let d = '';
	while (len > 0) {
		d += '\t';
		len--;
	}
	return d;
}

function countDuplicates(nodeId, nodes) {
	let count = 0;
	nodes.forEach(item => {
		if (item == nodeId) {
			count++;
		}
	});
	return count;
}

function fixCondition(condition) {
	if (!condition || condition == 'undefined' || condition == 'null') {
		return true;
	}
	if (typeof condition != 'string') {
		return condition;
	}
	if (condition) {
		// condition.replace(/{{|}}/g, '')
		return condition.replace(/{{/g, '_.get(node, \'').replace(/}}/g, '\')')
			.replace('= =', '==')
			.replace('! =', '!=')
			.replace('< =', '<=')
			.replace('> =', '>=');
	}
	return condition;
}

function CreateNodeVariables(flowData) {
	let code = [];
	code.push(`${tab(1)}node['${flowData.inputNode._id}'] = {};`);
	flowData.nodes.forEach(item => {
		code.push(`${tab(1)}node['${item._id}'] = {};`);
	});
	if (flowData.errorNode && flowData.errorNode._id) {
		code.push(`${tab(1)}node['${flowData.errorNode._id}'] = {};`);
	}

	code.push(`${tab(1)}let ${flowData.inputNode._id} = node['${flowData.inputNode._id}'];`);
	flowData.nodes.forEach(item => {
		code.push(`${tab(1)}let ${item._id} = node['${item._id}'];`);
	});
	if (flowData.errorNode && flowData.errorNode._id) {
		code.push(`${tab(1)}let ${flowData.errorNode._id} = node['${flowData.errorNode._id}'];`);
	}
	return code;
}

function ResetNodeVariables(flowData, init) {
	let code = [];
	code.push(`${tab(1)}${init ? 'let ' : ''}${flowData.inputNode._id} = node['${flowData.inputNode._id}'];`);
	flowData.nodes.forEach(item => {
		code.push(`${tab(1)}${init ? 'let ' : ''}${item._id} = node['${item._id}'];`);
	});
	if (flowData.errorNode && flowData.errorNode._id) {
		code.push(`${tab(1)}${init ? 'let ' : ''}${flowData.errorNode._id} = node['${flowData.errorNode._id}'];`);
	}
	return code;
}

/**
 * 
 * @param {any} dataJson 
 */
async function parseFlow(dataJson) {
	visitedNodes = [];
	flowData = dataJson;
	if (flowData && flowData.errorNode && flowData.errorNode.onSuccess && flowData.errorNode.onSuccess.length > 0) {
		hasGlobaErrorHandler = true;
	}
	const inputNode = dataJson.inputNode;
	const nodes = dataJson.nodes;
	let apiHasParams = false;
	let params = [];
	let api = '/' + dataJson.app + inputNode.options.path;
	if (api.match(/.*{(.*)}.*/)) {
		let tempPath = api;
		api = api.replace(/}/g, '').replace(/{/g, ':');
		apiHasParams = true;
		let tempPathSegment = tempPath.split('/').filter(_d => _d != '');
		tempPathSegment.forEach((_k, i) => {
			if (_k.startsWith('{') && _k.endsWith('}')) {
				params.push(_k.replace('{', '').replace('}', ''));
			}
		});
	}
	let code = [];
	code.push('/* eslint-disable camelcase */');
	code.push('/* eslint-disable quotes */');
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const express = require(\'express\');');
	code.push('const router = express.Router({ mergeParams: true });');
	code.push('const log4js = require(\'log4js\');');
	code.push('const fileUpload = require(\'express-fileupload\');');
	code.push('const { XMLBuilder, XMLParser } = require(\'fast-xml-parser\');');
	code.push('const fastcsv = require(\'fast-csv\');');
	code.push('const XLSX = require(\'xlsx\');');
	code.push('const { v4: uuid } = require(\'uuid\');');
	code.push('const _ = require(\'lodash\');');
	code.push('const cron = require(\'node-cron\');');
	code.push('const solace = require(\'solclientjs\');');
	// code.push('const { Kafka } = require(\'kafkajs\');');
	code.push('const tf = require(\'@tensorflow/tfjs-node\');');
	code.push('const chokidar = require(\'chokidar\');');
	code.push('var builder = require(\'xmlbuilder\');');
	code.push('var ldap = require(\'ldapjs\');');
	code.push('const Kafka = require(\'node-rdkafka\');');
	code.push('');
	// if (config.b2bAllowNpmInstall === 'true') {
	// 	const npmLibraries = await commonUtils.getAllLibraries();
	// 	npmLibraries.forEach((item) => {
	// 		if (item.code) {
	// 			code.push(`${item.code};`);
	// 		}
	// 	});
	// }
	code.push('');
	code.push('const stateUtils = require(\'./utils/state.utils\');');
	code.push('const nodeUtils = require(\'./utils/node.utils\');');
	code.push('const fileUtils = require(\'./utils/file.utils\');');
	code.push('const maskingUtils = require(\'./utils/masking.utils\');');
	code.push('const kafkaUtils = require(\'./utils/kafka.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('const xmlBuilder = new XMLBuilder();');
	code.push('const xmlParser = new XMLParser();');
	code.push('const httpClient = require(\'./http-client\');');
	code.push('');
	// TODO: Method to be fixed.
	// code.push(`router.${(inputNode.options.method || 'POST').toLowerCase()}('${api}', async function (req, res) {`);

	if (inputNode.type === 'FILE' || (inputNode.options && inputNode.options.contentType === 'multipart/form-data')) {
		code.push(`${tab(0)}router.use(fileUpload({`);
		code.push(`${tab(1)}useTempFiles: true,`);
		code.push(`${tab(1)}tempFileDir: './uploads'`);
		code.push(`${tab(0)}}));`);
	} else if (inputNode.options && inputNode.options.contentType === 'application/json') {
		code.push(`${tab(0)}router.use(express.json({ inflate: true, limit: '100mb' }));`);
	} else if (inputNode.options && inputNode.options.contentType === 'application/xml') {
		code.push(`${tab(0)}router.use(express.raw({ type: ['application/xml'] }));`);
		code.push(`${tab(0)}router.use((req, res, next) => {`);
		code.push(`${tab(1)}if (req.get('content-type') === 'application/xml') {`);
		code.push(`${tab(2)}req.body = xmlParser.parse(req.body);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}next();`);
		code.push(`${tab(0)}});`);
	} else {
		code.push(`${tab(0)}router.use(express.json({ inflate: true, limit: '100mb' }));`);
		// code.push(`${tab(0)}router.use(express.raw());`);
	}


	code.push('const CONSTANTS = {};');
	const constants = flowData.constants;
	constants.forEach((item) => {
		if (item.dataType == 'String') {
			code.push(`CONSTANTS['${item.key}'] = '${item.value}';`);
		} else {
			code.push(`CONSTANTS['${item.key}'] = ${item.value};`);
		}
	});
	code.push(`${tab(0)}const ENV = {};`);
	code.push(`${tab(1)}Object.keys(process.env).forEach((key)=>{`);
	code.push(`${tab(2)}ENV[key] = process.env[key];`);
	code.push(`${tab(1)}});`);


	if (!inputNode.options.method) {
		inputNode.options.method = 'POST';
	}
	if (!inputNode.dataStructure) {
		inputNode.dataStructure = {};
	}
	if (!inputNode.dataStructure.outgoing) {
		inputNode.dataStructure.outgoing = {};
	}
	let method = inputNode.options.method.toLowerCase();
	code.push(`router.${method}('${api}', handleRequest);`);

	if (inputNode.type === 'TIMER') {
		code.push(`${tab(0)}cron.schedule('${(inputNode.options.cron || '1 * * * *')}', async () => {`);
		code.push(`${tab(1)}try {`);
		code.push(`${tab(2)}const date = new Date();`);
		code.push(`${tab(2)}const payload = { triggerTime: date.toISOString() };`);
		code.push(`${tab(2)}makeRequestToThisFlow(payload);`);
		code.push(`${tab(1)}} catch (err) {`);
		code.push(`${tab(2)}logger.error(err);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(0)}});`);
	} else if (inputNode.type === 'PLUGIN') {
		const nodeData = await commonUtils.getCustomNode(inputNode.options.plugin._id);
		code.push(`${tab(0)}try {`);
		code.push(`${tab(1)}(async () => {`);
		code.push(`${tab(2)}${nodeData.code}`);
		code.push(`${tab(1)}})();`);
		code.push(`${tab(0)}} catch (err) {`);
		code.push(`${tab(1)}logger.error(err);`);
		code.push(`${tab(0)}}`);
	} else if (inputNode.type === 'KAFKA_CONSUMER') {
		const connector = await commonUtils.getConnector(inputNode.options.connector._id);
		code.push(`${tab(0)}try {`);
		code.push(`${tab(1)}(async () => {`);
		code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
		code.push(`${tab(2)}connectorConfig.topic = '${inputNode.options.topicName}';`);
		code.push(`${tab(2)}connectorConfig.batch = ${inputNode.options.throttle};`);
		code.push(`${tab(2)}connectorConfig.interval = ${inputNode.options.interval};`);
		code.push(`${tab(2)}connectorConfig.groupId = '${config.flowId}';`);
		code.push(`${tab(2)}logger.info('Creating Kafka Consumer');`);
		code.push(`${tab(2)}logger.trace(\`Connecting to Kafka Topic :: \${connectorConfig.topic}\`);`);
		code.push(`${tab(2)}kafkaUtils.createConsumer(connectorConfig, (message) => {`);
		code.push(`${tab(3)}logger.trace(\`Processig Message from Kafka :: \${JSON.stringify(message)}\`);`);
		code.push(`${tab(3)}makeRequestToThisFlow(message);`);
		code.push(`${tab(2)}});`);
		code.push(`${tab(2)}`);
		code.push(`${tab(2)}process.on('SIGINT', () => {`);
		code.push(`${tab(3)}logger.info('Disconnecting consumer ...');`);
		code.push(`${tab(3)}consumer.disconnect();`);
		code.push(`${tab(2)}});`);
		code.push(`${tab(1)}})();`);
		code.push(`${tab(0)}} catch (err) {`);
		code.push(`${tab(1)}logger.error(err);`);
		code.push(`${tab(0)}}`);
	}

	code.push(`${tab(0)}function StartProcess(payload){`);
	code.push(`${tab(1)}return makeRequestToThisFlow(payload);`);
	code.push(`${tab(0)}}`);

	code.push(`${tab(0)}async function makeRequestToThisFlow(payload){`);
	code.push(`${tab(1)}try {`);
	code.push(`${tab(2)}const options = {};`);
	code.push(`${tab(2)}options.method = 'POST';`);
	code.push(`${tab(2)}options.url = '${config.get('bm')}/b2b/pipes${api}';`);
	code.push(`${tab(2)}options.json = payload;`);
	code.push(`${tab(2)}logger.trace({ options });`);
	code.push(`${tab(2)}let response = await httpClient.request(options);`);
	code.push(`${tab(2)}logger.trace('Response From Flow: ', response);`);
	code.push(`${tab(1)}} catch (err) {`);
	code.push(`${tab(2)}logger.error(err);`);
	code.push(`${tab(1)}}`);
	code.push(`${tab(0)}}`);

	code.push('async function handleRequest(req, res) {');
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push(`${tab(1)}res.setHeader('dnio-interaction-id', (req.query.interactionId || 'TEST'));`);
	code.push(`${tab(1)}let response = req;`);
	code.push(`${tab(1)}let state = stateUtils.getState(response, '${inputNode._id}', false, '${(inputNode.options.contentType || '')}');`);
	code.push(`${tab(1)}state.inputFormatId = '${inputNode.dataStructure.outgoing._id}';`);
	code.push(`${tab(1)}state.outputFormatId = '${inputNode.dataStructure.outgoing._id}';`);
	code.push(`${tab(1)}let node = {};`);
	code.push(`${tab(1)}node['CONSTANTS'] = {};`);
	constants.forEach((item) => {
		if (item.dataType == 'String') {
			code.push(`${tab(1)}node['CONSTANTS']['${item.key}'] = '${item.value}';`);
		} else {
			code.push(`${tab(1)}node['CONSTANTS']['${item.key}'] = ${item.value};`);
		}
	});
	code.push(`${tab(1)}node['ENV'] = {};`);
	code.push(`${tab(1)}Object.keys(process.env).forEach((key)=>{`);
	code.push(`${tab(2)}node['ENV'][key] = process.env[key];`);
	code.push(`${tab(1)}});`);

	code = code.concat(CreateNodeVariables(flowData));

	// code.push(`${tab(1)}const ${_.snakeCase(inputNode.name)} = state;`);
	code.push(`${tab(1)}let isResponseSent = false;`);
	if (inputNode.type === 'API') {
		code.push(`${tab(1)}setTimeout(function() {`);
		code.push(`${tab(2)}if (!isResponseSent) {`);
		code.push(`${tab(3)}res.status(202).json({ message: 'Your requested process is taking more then expected time, Please check interactions for final status.' });`);
		code.push(`${tab(3)}isResponseSent = true;`);
		code.push(`${tab(2)}}`);
		code.push(`${tab(1)}}, ${(inputNode.options.timeout || 60) * 1000});`);
	}

	if (inputNode.type === 'FILE' || (inputNode.options && inputNode.options.contentType === 'multipart/form-data')) {
		if (inputNode.type === 'FILE') {
			code.push(`${tab(1)}res.status(202).json({ message: 'File is being processed' });`);
			code.push(`${tab(1)}isResponseSent = true;`);
		}
		code.push(`${tab(1)}const reqFile = req.files.file;`);
		code.push(`${tab(1)}logger.debug(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Request file info - \`, reqFile);`);
		code.push(`${tab(1)}if (!req.files || _.isEmpty(req.files)) {`);
		code.push(`${tab(2)}state.status = "ERROR";`);
		code.push(`${tab(2)}state.statusCode = 400;`);
		code.push(`${tab(2)}state.body = { message: 'No files were uploaded' };`);
		code.push(`${tab(2)}state.responseBody = { message: 'No files were uploaded' };`);
		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(2)}return;`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { payloadMetaData: reqFile });`);
		if (!inputNode.dataStructure.outgoing) {
			inputNode.dataStructure.outgoing = {
				_id: uuid()
			};
		}
		const dataFormat = dataJson.dataStructures[inputNode.dataStructure.outgoing._id] || { _id: inputNode.dataStructure.outgoing._id };
		if (!dataFormat.formatType) {
			dataFormat.formatType = 'BINARY';
		}
		inputNode.dataStructure.outgoing = dataFormat;
		if (dataFormat.formatType == 'EXCEL') {
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Converting EXCEL to CSV \`);`);
			code.push(`${tab(1)}const workBook = XLSX.readFile(reqFile.tempFilePath);`);
			code.push(`${tab(1)}XLSX.writeFile(workBook, reqFile.tempFilePath, { bookType: "csv" });`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] EXCEL to CSV Conversion Done! \`);`);
		}

		if (dataFormat.formatType === 'CSV' || dataFormat.formatType == 'EXCEL' || dataFormat.formatType === 'DELIMITER') {
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Parsing File\`);`);
			let rowDelimiter = '';
			if (dataFormat.lineSeparator === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (dataFormat.lineSeparator === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (dataFormat.lineSeparator === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}
			code.push(`${tab(1)}const pr = await new Promise((resolve, reject) => {`);
			code.push(`${tab(2)}let records = [];`);
			code.push(`${tab(2)}const fileStream = fs.createReadStream(reqFile.tempFilePath);`);
			code.push(`${tab(2)}fastcsv.parseStream(fileStream, {`);
			code.push(`${tab(3)}headers: fileUtils.getHeaderOf${inputNode.dataStructure.outgoing._id}(),`);
			code.push(`${tab(3)}skipLines: ${inputNode.options.skipLines || 0},`);
			code.push(`${tab(3)}skipRows: ${inputNode.options.skipRows || 0},`);
			code.push(`${tab(3)}maxRows: ${inputNode.options.maxRows || 0},`);
			code.push(`${tab(3)}rowDelimiter: '${rowDelimiter}',`);
			code.push(`${tab(3)}delimiter: '${dataFormat.character}',`);
			code.push(`${tab(3)}ignoreEmpty: true,`);
			if (dataFormat.strictValidation) {
				code.push(`${tab(3)}strictColumnHandling: true,`);
			} else {
				code.push(`${tab(3)}discardUnmappedColumns: true,`);
			}
			code.push(`${tab(2)}}).transform(row => {`);
			code.push(`${tab(3)}let temp = fileUtils.convertData${dataFormat._id}(row);`);
			code.push(`${tab(3)}return temp;`);
			code.push(`${tab(2)}}).on('error', err => {`);
			code.push(`${tab(3)}state.status = "ERROR";`);
			code.push(`${tab(3)}state.statusCode = 400;`);
			code.push(`${tab(3)}state.body = err;`);
			code.push(`${tab(3)}state.responseBody = err;`);
			code.push(`${tab(3)}stateUtils.upsertState(req, state);`);
			code.push(`${tab(3)}reject(err);`);
			code.push(`${tab(2)}}).on('data', row => records.push(row))`);
			code.push(`${tab(2)}.on('end', rowCount => {`);
			code.push(`${tab(3)}logger.debug('Parsed rows = ', rowCount);`);
			code.push(`${tab(3)}state.totalRecords = rowCount;`);
			code.push(`${tab(3)}state.statusCode = 200;`);
			code.push(`${tab(3)}state.body = records;`);
			code.push(`${tab(3)}state.responseBody = records;`);
			// code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.fileContent = reqFile.tempFilePath;`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
			// code.push(`${tab(3)}logger.trace('Parsed Data - ', state.body);`);
			code.push(`${tab(3)}resolve(records);`);
			code.push(`${tab(2)}});`);
			code.push(`${tab(1)}});`);
			code.push(`${tab(1)} `);
		} else if (dataFormat.formatType === 'JSON') {
			code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.status = "SUCCESS";`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.body = JSON.parse(contents);`);
			code.push(`${tab(2)}state.responseBody = JSON.parse(contents);`);
			code.push(`${tab(2)}state.fileContent = reqFile.tempFilePath;`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
		} else if (dataFormat.formatType === 'XML') {
			code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.status = "SUCCESS";`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.body = xmlParser.parse(contents);`);
			code.push(`${tab(2)}state.responseBody = xmlParser.parse(contents);`);
			code.push(`${tab(2)}state.fileContent = reqFile.tempFilePath;`);
			code.push(`${tab(2)}state.xmlContent = contents;`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
		} else if (dataFormat.formatType === 'FLATFILE') {
			code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.body = fileUtils.fromFlatFile${dataFormat._id}(contents, ${inputNode.options.isFirstRowHeader || false});`);
			code.push(`${tab(2)}state.responseBody = state.body;`);
			code.push(`${tab(2)}state.status = "SUCCESS";`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.fileContent = reqFile.tempFilePath;`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
		} else if (dataFormat.formatType === 'BINARY') {
			// code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.status = "SUCCESS";`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			// code.push(`${tab(2)}state.body = contents;`);
			// code.push(`${tab(2)}state.responseBody = contents;`);
			code.push(`${tab(2)}state.fileContent = reqFile.tempFilePath;`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
			// code.push(`${tab(2)}fs.copyFileSync(reqFile.tempFilePath, path.join(process.cwd(), 'downloads', req['local']['output-file-name']));`);
			// code.push(`${tab(2)}}`);
			// code.push(`${tab(2)}}`);
		}
	} else if (inputNode.options && inputNode.options.contentType === 'application/json') {
		code.push(`${tab(1)}const metaData = {};`);
		code.push(`${tab(1)}if (Array.isArray(state.body)) {`);
		code.push(`${tab(2)}metaData.type = 'Array';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body && state.body[0] ? Object.keys(state.body[0]).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = state.body ? state.body.length : 0;`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}metaData.type = 'Object';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body ? Object.keys(state.body).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = 1;`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { payloadMetaData: metaData });`);
	} else if (inputNode.options && inputNode.options.contentType === 'application/xml') {
		code.push(`${tab(1)}const metaData = {};`);
		code.push(`${tab(1)}if (Array.isArray(state.body)) {`);
		code.push(`${tab(2)}metaData.type = 'Array';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body && state.body[0] ? Object.keys(state.body[0]).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = state.body ? state.body.length : 0;`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}metaData.type = 'Object';`);
		code.push(`${tab(2)}metaData.attributeCount = state.body ? Object.keys(state.body).length : 0;`);
		code.push(`${tab(2)}metaData.totalRecords = 1;`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { payloadMetaData: metaData });`);
	}

	if (apiHasParams) {
		params.forEach(p => {
			code.push(`${tab(1)}if (!req.params['${p}']) {`);
			code.push(`${tab(2)}state.statusCode = 400;`);
			code.push(`${tab(2)}state.status = 'ERROR';`);
			code.push(`${tab(2)}state.responseBody = { message: "Request Param '${p}' Not Found in the request"};`);
			code.push(`${tab(2)}node['${inputNode._id}'] = state;`);
			code.push(`${tab(2)}isResponseSent = true;`);
			code.push(`${tab(2)}return res.status((state.statusCode || 400)).json(state.responseBody);`);
			code.push(`${tab(1)}}`);
		});
	}

	// code.push(`${tab(2)}response = { statusCode: 200, body: state.body, headers: state.headers };`);
	code.push(`${tab(1)}state.statusCode = 200;`);
	code.push(`${tab(1)}state.status = 'SUCCESS';`);
	code.push(`${tab(1)}state.responseBody = state.body;`);
	code.push(`${tab(1)}node['${inputNode._id}'] = state;`);
	code.push(`${tab(1)}response = _.cloneDeep(state);`);
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
	// code.push(`${tab(1)}logger.trace(\`[\${txnId}] [\${remoteTxnId}] Input node Request Body - \`, JSON.stringify(state.body));`);
	code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Input node Request Headers - \`, JSON.stringify(state.headers));`);
	let tempNodes = (inputNode.onSuccess || []);
	let noOfConditions = tempNodes.length;
	for (let index = 0; index < tempNodes.length; index++) {
		const ss = tempNodes[index];
		const nextNode = nodes.find(e => e._id === ss._id);
		if (nextNode) {
			ss.condition = fixCondition(ss.condition);
			if (index + 1 == noOfConditions) {
				if (ss.condition) {
					code.push(`${tab(1)}if (${ss.condition}) {`);
				} else {
					code.push(`${tab(1)} {`);
				}
			} else {
				code.push(`${tab(1)}if (${ss.condition}) {`);
			}
			if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
				visitedNodes.push(nextNode._id);
				code = code.concat(generateCode(nextNode, nodes));
			}
			if (index + 1 == noOfConditions) {
				code.push(`${tab(1)}}`);
			} else {
				if (inputNode.conditionType == 'ifElse') {
					code.push(`${tab(1)}} else`);
				} else {
					code.push(`${tab(1)}}`);
				}
			}
		}
	}
	if (!tempNodes || tempNodes.length == 0) {
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { status: 'SUCCESS' });`);
	}

	code.push(`${tab(1)}if (!isResponseSent) {`);
	if (inputNode.dataStructure.outgoing && inputNode.dataStructure.outgoing._id) {
		code.push(`${tab(2)}if(Array.isArray(response.responseBody)) {`);
		code.push(`${tab(3)}response.responseBody = response.responseBody.map(item => {`);
		code.push(`${tab(4)}return maskingUtils.maskDataFor${inputNode.dataStructure.outgoing._id}(item);`);
		code.push(`${tab(3)}});`);
		code.push(`${tab(2)}} else {`);
		code.push(`${tab(3)}response.responseBody = maskingUtils.maskDataFor${inputNode.dataStructure.outgoing._id}(response.responseBody);`);
		code.push(`${tab(2)}}`);
	}

	code.push(`${tab(2)}res.status((response.statusCode || 200)).json(response.responseBody);`);
	code.push(`${tab(2)}isResponseSent = true;`);
	code.push(`${tab(1)}}`);
	code.push('}');

	code.push('async function handleError(response, req, res, txnId, remoteTxnId, state, node, isResponseSent) {');
	code.push(`${tab(1)}node['CONSTANTS'] = {};`);
	constants.forEach((item) => {
		if (item.dataType == 'String') {
			code.push(`${tab(1)}node['CONSTANTS']['${item.key}'] = '${item.value}';`);
		} else {
			code.push(`${tab(1)}node['CONSTANTS']['${item.key}'] = ${item.value};`);
		}
	});
	code.push(`${tab(1)}node['ENV'] = {};`);
	code.push(`${tab(1)}Object.keys(process.env).forEach((key)=>{`);
	code.push(`${tab(2)}node['ENV'][key] = process.env[key];`);
	code.push(`${tab(1)}});`);
	code = code.concat(ResetNodeVariables(flowData, true));
	if (flowData.errorNode && flowData.errorNode._id) {
		code.push(`${tab(1)}state = stateUtils.getState(response, '${flowData.errorNode._id}', false, '${(flowData.errorNode.options.contentType || '')}');`);
		code.push(`${tab(1)}node['${flowData.errorNode._id}'] = state;`);
		code.push(`${tab(1)}state.responseBody = state.body;`);
	}
	if (flowData && flowData.errorNode && flowData.errorNode.onSuccess && flowData.errorNode.onSuccess.length > 0) {
		let errNodes = (flowData.errorNode.onSuccess || []);

		let elseIndex = errNodes.findIndex(e => !e.condition);
		if (elseIndex > -1) {
			errNodes = errNodes.concat(errNodes.splice(elseIndex, 1));
		}

		for (let index = 0; index < errNodes.length; index++) {
			let last = errNodes.length - 1 == index;
			const ss = errNodes[index];
			const node = nodes.find(e => e._id === ss._id);
			if (node) {
				if (ss.condition) {
					node.condition = fixCondition(ss.condition);
				}
				// if (visitedNodes.indexOf(node._id) > -1) {
				// 	return;
				// }
				visitedNodes.push(node._id);

				if (inputNode.options.conditionType == 'parallel') {
					code = code.concat(generateCode(node, nodes, true));
				} else {
					if (node.condition) {
						code.push(`${tab(1)}if (${node.condition}) {`);
						code = code.concat(generateCode(node, nodes, true));
						if (last) {
							code.push(`${tab(1)}} `);
						} else {
							code.push(`${tab(1)}} else `);
						}
					} else {
						code.push(`${tab(1)}{`);
						code = code.concat(generateCode(node, nodes, true));
						code.push(`${tab(1)}} `);
					}
				}
			}
		}
		if (!errNodes || errNodes.length == 0) {
			code.push(`${tab(1)}stateUtils.updateInteraction(req, { status: 'ERROR' });`);
		}
	}
	code.push('}');
	code.push('module.exports = router;');
	return code.join('\n');
}

function generateCodeForLoop(node, nodes) {
	let code = [];
	code.push(`${tab(2)}tempState = _.cloneDeep(response);`);
	code.push(`${tab(2)}tempState.body = item;`);
	code.push(`${tab(2)}response = await nodeUtils.func_${(node._id)}(req, tempState, node);`);
	code.push(`${tab(2)}tempState.responseBody = response.body;`);
	if (node.onSuccess && node.onSuccess.length > 0) {
		let tempNodes = (node.onSuccess || []);
		let elseIndex = tempNodes.findIndex(e => !e.condition);
		if (elseIndex > -1) {
			tempNodes = tempNodes.concat(tempNodes.splice(elseIndex, 1));
		}
		for (let index = 0; index < tempNodes.length; index++) {
			let last = tempNodes.length - 1 == index;
			const ss = tempNodes[index];
			const nextNode = nodes.find(e => e._id === ss._id);
			if (nextNode) {
				if (ss.condition) {
					nextNode.condition = fixCondition(ss.condition);
				}
				if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
					visitedNodes.push(nextNode._id);

					if (node.options.conditionType == 'parallel') {
						code = code.concat(generateCodeForLoop(nextNode, nodes));
					} else {
						if (nextNode.condition) {
							code.push(`${tab(1)}if (${nextNode.condition}) {`);
							code = code.concat(generateCodeForLoop(nextNode, nodes));
							if (last) {
								code.push(`${tab(1)}} `);
							} else {
								code.push(`${tab(1)}} else `);
							}
						} else {
							code.push(`${tab(1)}{`);
							code = code.concat(generateCodeForLoop(nextNode, nodes));
							code.push(`${tab(1)}} `);
						}
					}
				}
			}
		}
	}
	return code;
}

/**
 * 
 * @param {any} dataJson 
 */
function generateCode(node, nodes, isErrorNode) {
	let code = [];
	if (!node.dataStructure) {
		node.dataStructure = {};
	}
	if (!node.dataStructure.outgoing) {
		node.dataStructure.outgoing = {};
	}
	if (!node.dataStructure.incoming) {
		node.dataStructure.incoming = {};
	}
	code = code.concat(ResetNodeVariables(flowData));
	code.push(`${tab(1)}\n\n// ═══════════════════ ${node._id} / ${node.name} / ${node.type} ══════════════════════`);
	code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Invoking node :: ${node._id} / ${node.name} / ${node.type}\`);`);
	code.push(`${tab(1)}try {`);
	if (node.type === 'CONDITION') {
		if (node.conditions && node.conditions.length > 0) {
			let noOfConditions = node.conditions.length;
			for (let index = 0; index < noOfConditions; index++) {
				const item = node.conditions[index];
				const nextNode = nodes.find(e => e._id === item._id);
				if (nextNode) {
					item.condition = fixCondition(item.condition);
					if (index + 1 == noOfConditions) {
						if (item.condition) {
							code.push(`${tab(1)}if (${item.condition}) {`);
						} else {
							code.push(`${tab(1)} {`);
						}
					} else {
						code.push(`${tab(1)}if (${item.condition}) {`);
					}
					if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
						visitedNodes.push(nextNode._id);
						code = code.concat(generateCode(nextNode, nodes, isErrorNode));
					}
					if (index + 1 == noOfConditions) {
						code.push(`${tab(1)}}`);
					} else {
						if (node.conditionType == 'ifElse') {
							code.push(`${tab(1)}} else`);
						} else {
							code.push(`${tab(1)}}`);
						}
					}
				}
			}
		}
	} else if (node.type === 'RESPONSE') {
		code.push(`${tab(2)}state = stateUtils.getState(response, '${node._id}', false, '${(node.options.contentType || '')}');`);
		code.push(`${tab(1)}state.inputFormatId = '${node.dataStructure.incoming._id}';`);
		code.push(`${tab(1)}state.outputFormatId = '${node.dataStructure.outgoing._id}';`);
		if (node.options && node.options.statusCode) {
			code.push(`${tab(2)}state.statusCode = ${node.options.statusCode.replace(/{{/g, '_.get(node, \'').replace(/}}/g, '\')')};`);
		}
		code.push(`${tab(2)}state.status = 'SUCCESS';`);


		code.push(`${tab(2)}let newBody = {};`);
		if (node.mappingType == 'custom') {
			generateMappingCode(node, code, true);
			code.push(`${tab(2)}state.body = newBody;`);
		} else {
			generateMappingCode(node, code, false);
			code.push(`${tab(2)}state.body = newBody.body;`);
			// code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
			// code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
			// code.push(`${tab(2)}}`);
		}

		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(2)}if (!isResponseSent) {`);
		code.push(`${tab(2)}isResponseSent = true;`);
		if (node.options.contentType == 'application/xml') {
			code.push(`${tab(2)}state.xmlContent = xmlBuilder.build({ROOT:state.body});`);
			code.push(`${tab(2)}res.set('Content-Type','application/xml');`);
			code.push(`${tab(2)}res.status(state.statusCode).end(state.xmlContent);`);
		} else if (node.options.contentType == 'multipart/form-data') {
			// code.push(`${tab(2)}fs.writeFileSync(state.body);`);
			code.push(`${tab(2)}res.set('Content-Type','application/octet-stream');`);
			code.push(`${tab(2)}res.status(state.statusCode).send(state.body);`);
		} else {
			code.push(`${tab(2)}res.status(state.statusCode).json(state.body);`);
		}
		code.push(`${tab(2)}}`);
	} else {
		code.push(`${tab(2)}state = stateUtils.getState(response, '${node._id}', false, '${(node.options.contentType || '')}');`);
		code.push(`${tab(1)}state.inputFormatId = '${node.dataStructure.incoming._id}';`);
		code.push(`${tab(1)}state.outputFormatId = '${node.dataStructure.outgoing._id}';`);
		if (node.type === 'FOREACH') {
			code.push(`${tab(2)}let tempBody = state.body;`);
			code.push(`${tab(2)}if (!Array.isArray(state.body)) {`);
			code.push(`${tab(3)}tempBody = [state.body];`);
			code.push(`${tab(2)}}`);

			code.push(`${tab(2)}let promises = tempBody.map(async(item) => {`);
			code.push(`${tab(3)}try {`);
			code.push(`${tab(2)}let tempState;`);
			let startNode = node.options.startNode;
			if (startNode) {
				let nextNode = nodes.find(e => e._id === startNode._id);
				let tempNodes = [nextNode];
				for (let index = 0; index < tempNodes.length; index++) {
					const ss = tempNodes[index];
					nextNode = nodes.find(e => e._id === ss._id);
					if (nextNode) {
						if (ss.condition) {
							nextNode.condition = fixCondition(ss.condition);
						}
						if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
							visitedNodes.push(nextNode._id);
							if (nextNode.condition) code.push(`${tab(1)}if (${nextNode.condition}) {`);
							code = code.concat(generateCodeForLoop(nextNode, nodes));
							if (nextNode.condition) code.push(`${tab(1)}}`);
						}
					}
				}
			}


			code.push(`${tab(4)}`);
			code.push(`${tab(3)}} catch(err) {`);
			code.push(`${tab(4)}tempState.statusCode = 500;`);
			code.push(`${tab(4)}tempState.status = 'ERROR';`);
			code.push(`${tab(4)}tempState.responseBody = err;`);
			code.push(`${tab(4)}tempState.error = err;`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(3)}return tempState;`);
			code.push(`${tab(2)}});`);

			code.push(`${tab(2)}response = _.cloneDeep(state);`);
			code.push(`${tab(2)}response.stateList = await Promise.all(promises);`);
			code.push(`${tab(2)}response.responseBody = state.stateList.map(e => e.responseBody);`);
			code.push(`${tab(2)}response.statusCode = 200;`);
			code.push(`${tab(2)}response.status = 'SUCCESS';`);
		} else {
			code.push(`${tab(2)}response = await nodeUtils.func_${(node._id)}(req, state, node);`);
		}
		code.push(`${tab(2)}if (typeof response.statusCode == 'string') {`);
		code.push(`${tab(3)}response.statusCode = parseInt(response.statusCode);`);
		code.push(`${tab(2)}}`);
		code.push(`${tab(2)}if (response.statusCode >= 400) {`);
		if (node.onError && node.onError.length > 0) {
			let tempNodes = (node.onError || []);
			const nextNode = tempNodes[0];
			const tNode = nodes.find(e => e._id === nextNode._id);
			if (tNode) {
				visitedNodes.push(tNode._id);
				code = code.concat(generateCode(tNode, nodes, isErrorNode));
			}
		} else if (hasGlobaErrorHandler && !isErrorNode) {
			code.push(`${tab(4)}return handleError(response, req, res, txnId, remoteTxnId, state, node, isResponseSent);`);
		} else {
			code.push(`${tab(3)}if (!isResponseSent) {`);
			code.push(`${tab(4)}isResponseSent = true;`);
			// code.push(`${tab(4)}return res.status((response.statusCode || 200)).json({ message: 'Error occured at ${node.name || node._id}' });`);
			code.push(`${tab(4)}return res.status((response.statusCode || 400)).json(response.responseBody);`);
			code.push(`${tab(3)}}`);
		}
		code.push(`${tab(2)}}`);
	}
	if (node.onSuccess && node.onSuccess.length > 0) {
		let tempNodes = (node.onSuccess || []);
		let noOfConditions = tempNodes.length;
		for (let index = 0; index < tempNodes.length; index++) {
			const ss = tempNodes[index];
			const nextNode = nodes.find(e => e._id === ss._id);
			if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
				ss.condition = fixCondition(ss.condition);
				if (index + 1 == noOfConditions) {
					if (ss.condition) {
						code.push(`${tab(1)}if (${ss.condition}) {`);
					} else {
						code.push(`${tab(1)} else {`);
					}
				} else {
					code.push(`${tab(1)}if (${ss.condition}) {`);
				}
				if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
					visitedNodes.push(nextNode._id);
					code = code.concat(generateCode(nextNode, nodes, isErrorNode));
				}
				if (index + 1 == noOfConditions) {
					code.push(`${tab(1)}}`);
				} else {
					if (node.conditionType == 'ifElse') {
						code.push(`${tab(1)}} else`);
					} else {
						code.push(`${tab(1)}}`);
					}
				}
			}
		}
	}
	code.push(`${tab(1)}} catch (err) {`);
	code.push(`${tab(2)}logger.error(err);`);
	code.push(`${tab(2)}if (!isResponseSent) {`);
	// code.push(`${tab(3)}res.status(500).json({ message: 'Error occured at ${node.name || node._id}' });`);
	code.push(`${tab(4)}res.status(500).json(err.body ? err.body : err);`);
	code.push(`${tab(3)}isResponseSent = true;`);
	code.push(`${tab(2)}}`);
	code.push(`${tab(1)}} finally {`);
	code.push(`${tab(2)}node['${node._id}'] = state;`);
	// code.push(`${tab(2)}try {`);
	// code.push(`${tab(3)}let response = await httpClient.request({url:'https://jugnu.in.ngrok.io/postHook', method:'POST', body: JSON.stringify({ stateId:'${node._id}', state })});`);
	// code.push(`${tab(2)}} catch(err) {`);
	// code.push(`${tab(3)}logger.error('HOOK-ERROR', err);`);
	// code.push(`${tab(2)}}`);
	code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
	if (!node.onSuccess || node.onSuccess.length == 0) {
		code.push(`${tab(2)}stateUtils.updateInteraction(req, { status: 'SUCCESS' });`);
	}
	code.push(`${tab(1)}}`);
	return code;
}

async function parseNodes(dataJson) {
	visitedNodes = [];
	const code = [];
	code.push('/* eslint-disable camelcase */');
	code.push('/* eslint-disable quotes */');
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const _ = require(\'lodash\');');
	code.push('const { v4: uuid } = require(\'uuid\');');
	code.push('const moment = require(\'moment\');');
	code.push('const { XMLBuilder, XMLParser } = require(\'fast-xml-parser\');');
	code.push('const fastcsv = require(\'fast-csv\');');
	code.push('const XLSX = require(\'xlsx\');');
	code.push('const xlsxPopulate = require(\'xlsx-populate\');');
	code.push('const { mssql, mysql, psql } = require(\'@appveen/rest-crud\');');
	code.push('const Mustache = require(\'mustache\');');
	code.push('const solace = require(\'solclientjs\');');
	code.push('const { Kafka } = require(\'kafkajs\');');
	code.push('const tf = require(\'@tensorflow/tfjs-node\');');
	code.push('const chokidar = require(\'chokidar\');');
	code.push('var builder = require(\'xmlbuilder\');');
	code.push('var ldap = require(\'ldapjs\');');
	code.push('const FormData = require(\'form-data\');');
	code.push('const mongoose = require(\'mongoose\');');
	code.push('');
	code.push('const httpClient = require(\'../http-client\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	code.push('const stateUtils = require(\'./state.utils\');');
	code.push('const validationUtils = require(\'./validation.utils\');');
	code.push('const fileUtils = require(\'./file.utils\');');
	code.push('const storageEngine = require(\'./storage.utils\');');
	code.push('const kafkaUtils = require(\'./kafka.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('const xmlBuilder = new XMLBuilder();');
	code.push('const xmlParser = new XMLParser();');
	code.push('');
	// if (config.b2bAllowNpmInstall === 'true') {
	// 	const npmLibraries = await commonUtils.getAllLibraries();
	// 	npmLibraries.forEach((item) => {
	// 		if (item.code) {
	// 			code.push(`${item.code};`);
	// 		}
	// 	});
	// }

	const formulas = await commonUtils.getAllFormulas();
	formulas.forEach((item) => {
		if (item.code) {
			code.push(`function ${item.name}(${item.params.map(e => e.name)}) {`);
			code.push(`${item.code}`);
			code.push('}');
		}
	});

	const tempCode = await generateNodes(dataJson);
	return _.concat(code, tempCode).join('\n');
}


async function generateNodes(pNode) {
	const nodes = pNode.nodes;
	const dataStructures = pNode.dataStructures;
	let code = [];
	const exportsCode = [];
	let loopCode = [];
	const nodeVariables = [{ key: _.snakeCase(pNode.inputNode.name), value: pNode.inputNode._id }];
	nodes.forEach((node) => {
		nodeVariables.push({ key: _.snakeCase(node.name), value: node._id });
	});
	// let promises = nodes.map(async (node) => {
	await nodes.reduce(async (prev, node) => {
		await prev;
		if (!node.dataStructure) {
			node.dataStructure = {};
		}
		if (!node.dataStructure.outgoing) {
			node.dataStructure.outgoing = {};
		}
		const dataFormat = dataStructures[node.dataStructure.outgoing._id] || { _id: node.dataStructure.outgoing._id };
		if (!dataFormat.formatType) {
			dataFormat.formatType = 'JSON';
		}
		node.dataStructure.outgoing = dataFormat;
		if (node.options) {
			if (!node.options.get &&
				!node.options.update &&
				!node.options.insert &&
				!node.options.delete) {
				node.options.insert = true;
			}
		}
		exportsCode.push(`module.exports.func_${(node._id)} = func_${(node._id)};`);
		code.push(`async function func_${(node._id)}(req, state, node) {`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Starting ${node.name ? node.name : ''}(${(node._id)}) Node\`);`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Node type :: ${node.type}\`);`);
		code = code.concat(ResetNodeVariables(pNode, true));
		// nodeVariables.forEach((item) => {
		// 	code.push(`${tab(1)}const ${_.snakeCase(item.key)} = node['${item.value}'];`);
		// });
		code.push(`${tab(1)}try {`);
		let functionName = 'validate_structure_' + (node._id);
		if (node.type === 'API' || node.type == 'API_MULTIPART' || node.type.startsWith('DATASERVICE') || node.type === 'FUNCTION' || node.type === 'FLOW' || node.type === 'AUTH-DATASTACK') {
			code.push(`${tab(2)}const options = {};`);
			code.push(`${tab(2)}let customHeaders = { 'content-type': 'application/json' };`);
			if (node.type.startsWith('DATASERVICE') || node.type === 'FUNCTION' || node.type === 'FLOW' || node.type === 'AUTH-DATASTACK') {
				if (node.options.authorization) {
					code.push(`${tab(3)}customHeaders['authorization'] = Mustache.render(\`${parseMustacheVariable(node.options.authorization)}\`, node);`);
					// if (node.options.authorization.startsWith('node[')) {
					// 	code.push(`${tab(3)}customHeaders['authorization'] = ${node.options.authorization};`);
					// } else {
					// 	code.push(`${tab(3)}customHeaders['authorization'] = \`${parseDynamicVariable(node.options.authorization)}\`;`);
					// }
				} else {
					code.push(`${tab(2)}if (req.header('authorization')) {`);
					code.push(`${tab(3)}customHeaders['authorization'] = req.header('authorization');`);
					code.push(`${tab(2)}}`);
				}
			}
			code.push(`${tab(2)}let customBody = state.body;`);
			if ((node.type === 'API' || node.type == 'API_MULTIPART') && node.options) {
				// code.push(`${tab(2)}state.url = Mustache.render(\`${node.options.url}\`, node);`);
				if (!node.options.url) {
					node.options.url = '';
				}
				code.push(`${tab(2)}state.url = \`${node.options.url.replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}')}\`;`);

				// code.push(`${tab(2)}state.url = \`${parseDynamicVariable(node.options.url)}\`;`);
				code.push(`${tab(2)}state.method = '${node.options.method || 'POST'}';`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				/** ---------------RE-TRY LOGIC STARTS--------------- */
				if (node.options.timeout) {
					code.push(`${tab(2)}const timeoutValue = parseInt(\`${parseDynamicVariable(node.options.timeout)}\`) * 1000;`);
					code.push(`${tab(2)}options.timeout = timeoutValue;`);
				}
				if (node.options.retry && node.options.retry.count) {
					code.push(`${tab(2)}const retryCount = parseInt(\`${parseDynamicVariable(node.options.retry.count)}\`);`);
					code.push(`${tab(2)}const retryInterval = parseInt(\`${parseDynamicVariable(node.options.retry.interval)}\`);`);
					code.push(`${tab(2)}options.retry = { limit: retryCount, methods: ['${node.options.method || 'POST'}'], calculateDelay: calculateDelay };`);
					code.push(`${tab(2)}options.hooks = { beforeRetry: [retryCallbackHook] };`);
					code.push(`${tab(2)}function calculateDelay(retryData) {`);
					code.push(`${tab(3)}if (retryData.attemptCount > retryCount) {`);
					code.push(`${tab(4)}return 0;`);
					code.push(`${tab(3)}}`);
					code.push(`${tab(3)}return (retryInterval * 1000);`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(2)}function retryCallbackHook(options, error, retryCount) {`);
					code.push(`${tab(3)}console.log(\`Retrying [\${retryCount}]: \${error.code}\`);`);
					code.push(`${tab(3)}if (!state.retry) {`);
					code.push(`${tab(4)}state.retry = [];`);
					code.push(`${tab(3)}}`);
					code.push(`${tab(3)}state.retry.push({ retryCount, error: { code: error.code, name: error.name }, timestamp: new Date().toISOString() });`);
					code.push(`${tab(2)}}`);
				}
				/** ---------------RE-TRY LOGIC ENDS--------------- */

				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				// if (node.options.body && !_.isEmpty(node.options.body)) {
				// 	// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	if (typeof node.options.body == 'object') {
				// 		code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				// 	} else {
				// 		code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	}
				// 	code.push(`${tab(2)}state.body = customBody;`);
				// }
				code.push(`${tab(2)}let newBody = {};`);
				if (node.mappingType == 'custom') {
					generateMappingCode(node, code, true);
					code.push(`${tab(2)}state.body = newBody;`);
					code.push(`${tab(2)}customBody = newBody;`);
				} else {
					generateMappingCode(node, code, false);
					code.push(`${tab(2)}state.body = newBody.body;`);
					code.push(`${tab(2)}customBody = newBody.body;`);
					code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
					code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
					code.push(`${tab(2)}}`);
				}
				// code.push(`${tab(2)}let newBody = {};`);
				// generateMappingCode(node, code);
				// code.push(`${tab(2)}state.body = newBody;`);
				// code.push(`${tab(2)}customBody = newBody;`);
			} else if (node.type === 'DATASERVICE' && node.options.dataService && node.options.dataService._id) {
				code.push(`${tab(2)}const dataService = await commonUtils.getDataService('${node.options.dataService._id}');`);
				if (config.isK8sEnv()) {
					if (node.options.get) {
						const params = [];
						code.push(`${tab(2)}let filter = Mustache.render(\`${_.trim(parseMustacheVariable(JSON.stringify(node.options.filter)), '"')}\`, node);`);
						code.push(`${tab(2)}state.body = { select: '${node.options.select}', count: ${node.options.count}, page: ${node.options.page}, sort: '${node.options.sort}', filter: filter }`);
						if (node.options.select && node.options.select != '*') {
							params.push(`select=${(node.options.select)}`);
						}
						if (node.options.count) {
							params.push(`count=${(node.options.count)}`);
						}
						if (node.options.page) {
							params.push(`page=${(node.options.page)}`);
						}
						if (!node.options.sort) {
							node.options.sort = '_metadata.lastUpdated';
						}
						params.push(`sort=${(node.options.sort)}`);
						if (!node.options.filter) {
							node.options.filter = '{}';
						}
						if (typeof node.options.filter == 'object') {
							node.options.filter = JSON.stringify(node.options.filter);
						}
						params.push('filter=${filter}');
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/?${params.join('&')}\`;`);
						// code.push(`${tab(2)}let filter = Mustache.render(\`${JSON.stringify(node.options.filter)}\`, node);`);
						// code.push(`${tab(2)}state.body = { select: '${node.options.select}', count: ${node.options.count}, page: ${node.options.page}, sort: '${node.options.sort}', filter: filter }`);
					} else if (node.options.delete) {
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/${(node.options.documentId)}\`;`);
					} else {
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/utils/bulkUpsert?update=${(node.options.update || false)}&insert=${(node.options.insert || false)}\`;`);
					}
					code.push(`${tab(2)}state.url = Mustache.render(commonUtils.parseMustacheVariable(state.url), node);`);
				} else {
					if (node.options.get) {
						const params = [];
						code.push(`${tab(2)}let filter = Mustache.render(\`${_.trim(parseMustacheVariable(JSON.stringify(node.options.filter)), '"')}\`, node);`);
						code.push(`${tab(2)}state.body = { select: '${node.options.select}', count: ${node.options.count}, page: ${node.options.page}, sort: '${node.options.sort}', filter: filter }`);
						if (node.options.select && node.options.select != '*') {
							params.push(`select=${(node.options.select)}`);
						}
						if (node.options.count) {
							params.push(`count=${(node.options.count)}`);
						}
						if (node.options.page) {
							params.push(`page=${(node.options.page)}`);
						}
						if (!node.options.sort) {
							node.options.sort = '_metadata.lastUpdated';
						}
						params.push(`sort=${(node.options.sort)}`);
						if (!node.options.filter) {
							node.options.filter = '{}';
						}
						if (typeof node.options.filter == 'object') {
							node.options.filter = JSON.stringify(node.options.filter);
						}
						params.push('filter=${filter}');
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + \`/?${params.join('&')}\`;`);
					} else if (node.options.delete) {
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + \`/${(node.options.documentId)}\`;`);
					} else {
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + '/utils/bulkUpsert?update=${(node.options.update || false)}&insert=${(node.options.insert || false)}';`);
					}
					// code.push(`${tab(2)}state.url = Mustache.render(state.url, node);`);
				}
				if (node.options.get) {
					code.push(`${tab(2)}state.method = 'GET';`);
				} else if (node.options.delete) {
					code.push(`${tab(2)}state.method = 'DELETE';`);
				} else {
					code.push(`${tab(2)}state.method = 'POST';`);
				}
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				if ((node.options.update || node.options.insert)) {
					code.push(`${tab(2)}let newBody = {};`);
					if (node.mappingType == 'custom') {
						generateMappingCode(node, code, true);
						code.push(`${tab(2)}state.body = newBody;`);
						code.push(`${tab(2)}customBody = newBody;`);
					} else {
						generateMappingCode(node, code, false);
						code.push(`${tab(2)}state.body = newBody.body;`);
						code.push(`${tab(2)}customBody = newBody.body;`);
						code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
						code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
						code.push(`${tab(2)}}`);
					}
				}

				/** ---------------RE-TRY LOGIC STARTS--------------- */
				if (node.options.timeout) {
					code.push(`${tab(2)}options.timeout = { request: ${node.options.timeout * 1000} };`);
				}
				if (node.options.retry && node.options.retry.count) {
					code.push(`${tab(2)}options.retry = { limit: ${node.options.retry.count}, methods: ['${node.options.method || 'POST'}'], calculateDelay: calculateDelay };`);
					code.push(`${tab(2)}options.hooks = { beforeRetry: [retryCallbackHook] };`);

					code.push(`${tab(2)}function calculateDelay(retryData) {`);
					code.push(`${tab(3)}if (retryData.attemptCount > ${node.options.retry.count}) {`);
					code.push(`${tab(4)}return 0;`);
					code.push(`${tab(3)}}`);
					code.push(`${tab(3)}return ${node.options.retry.interval * 1000};`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(2)}function retryCallbackHook(options, error, retryCount) {`);
					code.push(`${tab(3)}console.log(\`Retrying [\${retryCount}]: \${error.code}\`);`);
					code.push(`${tab(3)}if (!state.retry) {`);
					code.push(`${tab(4)}state.retry = [];`);
					code.push(`${tab(3)}}`);
					code.push(`${tab(3)}state.retry.push({ retryCount, error: { code: error.code, name: error.name }, timestamp: new Date().toISOString() });`);
					code.push(`${tab(2)}}`);
				}
				/** ---------------RE-TRY LOGIC ENDS--------------- */


				if ((node.options.update || node.options.insert)) {
					code.push(`${tab(2)}if (Array.isArray(state.body)) {`);
					code.push(`${tab(2)}let iterator = [];`);
					code.push(`${tab(2)}if (!Array.isArray(state.body)) {`);
					code.push(`${tab(3)}iterator = _.chunk([state.body], 100);`);
					code.push(`${tab(2)}} else {`);
					code.push(`${tab(3)}iterator = _.chunk(state.body, 100);`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(2)}let batchList = iterator.map((e,i) => {`);
					code.push(`${tab(3)}return {_id: uuid(), seqNo: (i + 1), rows: e, status: 'PENDING' };`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}state.batchList = batchList;`);
					code.push(`${tab(2)}}`);
				}
				// code.push(`${tab(2)}delete state.body;`);
				// if (node.options.body && !_.isEmpty(node.options.body)) {
				// 	code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				// }
				// code.push(`${tab(2)}customBody = { docs: state.body };`);
			} else if ((node.type === 'DATASERVICE_APPROVE' || node.type === 'DATASERVICE_REJECT') && node.options.dataService && node.options.dataService._id) {
				code.push(`${tab(2)}const dataService = await commonUtils.getDataService('${node.options.dataService._id}');`);
				if (config.isK8sEnv()) {
					if (node.options.get) {
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + '/utils/workflow/action';`);
					}
					code.push(`${tab(2)}state.url = Mustache.render(state.url, node);`);
				} else {
					code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + '/utils/workflow/action';`);
				}
				code.push(`${tab(2)}state.method = 'PUT';`);

				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}

				code.push(`${tab(2)}state.body = {};`);
				code.push(`${tab(2)}state.body.action = ${node.type === 'DATASERVICE_APPROVE' ? "\'Approve\'" : "\'Reject\'"};`);
				code.push(`${tab(2)}state.body.remarks = \`${node.options?.remarks?.replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}')}\`;`);
				code.push(`${tab(2)}state.body.filter = Mustache.render(\`${_.trim(JSON.stringify(node.options.filter), '"')}\`, node);`);
				code.push(`${tab(2)}customBody = state.body;`);

			} else if (node.type === 'FUNCTION') {
				code.push(`${tab(2)}const faas = await commonUtils.getFaaS('${node.options.faas._id}');`);
				code.push(`${tab(2)}logger.trace(JSON.stringify(faas));`);
				// code.push(`${tab(2)}state.url = \`${config.baseUrlGW}\${faas.url}\`;`);
				if (config.isK8sEnv()) {
					code.push(`${tab(2)}state.url = \`http://\${faas.deploymentName}.\${faas.namespace}\${faas.url.split('/a/').join('/')}\`;`);
				} else {
					code.push(`${tab(2)}state.url = \`http://localhost:\${faas.port}\${faas.url.split('/a/').join('/')}\`;`);
				}
				code.push(`${tab(2)}state.method = '${node.options.method || 'POST'}';`);
				code.push(`${tab(2)}logger.debug({ url: state.url });`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				// if (node.options.body && !_.isEmpty(node.options.body)) {
				// 	// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	if (typeof node.options.body == 'object') {
				// 		code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				// 	} else {
				// 		code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	}
				// 	code.push(`${tab(2)}state.body = customBody;`);
				// }
				code.push(`${tab(2)}let newBody = {};`);
				if (node.mappingType == 'custom') {
					generateMappingCode(node, code, true);
					code.push(`${tab(2)}state.body = newBody;`);
					code.push(`${tab(2)}customBody = newBody;`);
				} else {
					generateMappingCode(node, code, false);
					code.push(`${tab(2)}state.body = newBody.body;`);
					code.push(`${tab(2)}customBody = newBody.body;`);
					code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
					code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
					code.push(`${tab(2)}}`);
				}
			} else if (node.type === 'FLOW') {
				code.push(`${tab(2)}const flow = await commonUtils.getFlow('${node.options.flow._id}');`);
				code.push(`${tab(2)}logger.trace({ flow });`);
				code.push(`${tab(2)}state.url = \`${config.baseUrlFLOW}/\${flow.app}\${flow.inputNode.options.path}?parentInteraction=\${req.query.interactionId}\`;`);
				code.push(`${tab(2)}state.method = \`\${flow.inputNode.options.method || 'POST'}\`;`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				// if (node.options.body && !_.isEmpty(node.options.body)) {
				// 	// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	if (typeof node.options.body == 'object') {
				// 		code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				// 	} else {
				// 		code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				// 	}
				// 	code.push(`${tab(2)}state.body = customBody;`);
				// }
				code.push(`${tab(2)}let newBody = {};`);
				if (node.mappingType == 'custom') {
					generateMappingCode(node, code, true);
					code.push(`${tab(2)}state.body = newBody;`);
					code.push(`${tab(2)}customBody = newBody;`);
				} else {
					generateMappingCode(node, code, false);
					code.push(`${tab(2)}state.body = newBody.body;`);
					code.push(`${tab(2)}customBody = newBody.body;`);
					code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
					code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
					code.push(`${tab(2)}}`);
				}
			}
			code.push(`${tab(2)}options.headers = _.merge(state.headers, customHeaders);`);
			code.push(`${tab(2)}delete options.headers['cookie'];`);
			code.push(`${tab(2)}delete options.headers['host'];`);
			code.push(`${tab(2)}delete options.headers['connection'];`);
			code.push(`${tab(2)}delete options.headers['user-agent'];`);
			code.push(`${tab(2)}delete options.headers['content-length'];`);
			code.push(`${tab(2)}delete options.headers['content-encoding'];`);
			code.push(`${tab(2)}delete options.headers['transfer-encoding'];`);

			code.push(`${tab(2)}let finalRecords;`);
			code.push(`${tab(2)}let finalHeader;`);
			if (node.type === 'DATASERVICE' && (node.options.update || node.options.insert)) {
				if (!node.options.fields) {
					node.options.fields = '_id';
				}
				code.push(`${tab(2)}let response;`);
				code.push(`${tab(2)}if (Array.isArray(state.body)) {`);
				code.push(`${tab(3)}logger.debug('Making Requests in Batch');`);
				code.push(`${tab(2)}let results = [];`);
				code.push(`${tab(3)}logger.debug('state - ',JSON.stringify(state));`);
				code.push(`${tab(3)}logger.debug('batch list - ',JSON.stringify(state.batchList));`);
				code.push(`${tab(2)}await state.batchList.reduce(async (prev, curr) => {`);
				code.push(`${tab(3)}await prev;`);
				code.push(`${tab(3)}if (!curr) { return; }`);
				code.push(`${tab(3)}if (options.method == 'POST' || options.method == 'PUT') {`);
				code.push(`${tab(4)}options.json = { keys: [${node.options.fields.split(',').map(e => `'${e}'`).join(',') || ''}], docs: curr.rows };`);
				code.push(`${tab(3)}}`);
				code.push(`${tab(3)}try {`);
				code.push(`${tab(4)}logger.trace('trace - ',JSON.stringify(options, null, 4));`);
				code.push(`${tab(4)}response = await httpClient.request(options);`);
				code.push(`${tab(4)}logger.debug('Response - ',JSON.stringify(response));`);
				code.push(`${tab(4)}results.push(response);`);
				code.push(`${tab(4)}curr.statusCode = response.statusCode;`);
				code.push(`${tab(4)}curr.headers = response.headers;`);
				code.push(`${tab(4)}curr.responseBody = response.body;`);
				code.push(`${tab(3)}} catch(err) {`);
				code.push(`${tab(4)}results.push(err);`);
				code.push(`${tab(4)}curr.statusCode = err.statusCode || 400;`);
				code.push(`${tab(4)}curr.headers = err.headers || curr.headers;`);
				code.push(`${tab(4)}curr.responseBody = err.body ? err.body : err;`);
				code.push(`${tab(3)}}`);
				code.push(`${tab(2)}}, Promise.resolve());`);
				code.push(`${tab(2)}finalRecords = _.flatten(results.map(e => e.body ? e.body : e));`);
				code.push(`${tab(2)}finalHeader = Object.assign.apply({}, _.flatten(results.map(e => e.headers)));`);
				code.push(`${tab(2)}response = _.cloneDeep(state);`);
				code.push(`${tab(2)}response.statusCode = results.every(e => e.statusCode == 200) ? 200 : 400;`);
				code.push(`${tab(2)}} else {`);
				code.push(`${tab(3)}logger.debug('Making Requests Once');`);
				code.push(`${tab(3)}if (options.method == 'POST' || options.method == 'PUT') {`);
				code.push(`${tab(4)}options.json = { keys: [${node.options.fields.split(',').map(e => `'${e}'`).join(',') || ''}], docs: [ state.body ] };`);
				code.push(`${tab(3)}}`);
				code.push(`${tab(4)}logger.trace(JSON.stringify(options, null, 4));`);
				code.push(`${tab(3)}response = await httpClient.request(options);`);
				code.push(`${tab(3)}finalRecords = response.body;`);
				code.push(`${tab(3)}finalHeader = response.headers;`);
				code.push(`${tab(2)}}`);
			} else {
				if ((node.type === 'API' || node.type === 'FLOW') && node.options.multipleRequests) {
					code.push(`${tab(2)}logger.debug('Making Multiple Requests');`);
					code.push(`${tab(2)}if (!Array.isArray(customBody)) {`);
					code.push(`${tab(3)}customBody = [customBody];`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(3)}let promises = customBody.map(async (item) => {`);
					code.push(`${tab(4)}try {`);
					code.push(`${tab(5)}if (options.method == 'POST' || options.method == 'PUT') {`);
					code.push(`${tab(6)}options.json = item;`);
					code.push(`${tab(5)}}`);
					code.push(`${tab(5)}logger.trace(JSON.stringify(options, null, 4));`);
					code.push(`${tab(5)}return await httpClient.request(options);`);
					code.push(`${tab(4)}} catch(err) {`);
					code.push(`${tab(5)}if (err.response) {`);
					code.push(`${tab(6)}return err.response;`);
					code.push(`${tab(5)}}`);
					code.push(`${tab(5)}if (err.body) {`);
					code.push(`${tab(6)}if (!err.headers) {`);
					code.push(`${tab(7)}err.headers = options.headers;`);
					code.push(`${tab(6)}}`);
					code.push(`${tab(6)}return err;`);
					code.push(`${tab(5)}}`);
					code.push(`${tab(5)}return { statusCode: 500, body: err, headers: options.headers };`);
					code.push(`${tab(4)}}`);
					code.push(`${tab(3)}});`);
					code.push(`${tab(3)}promises = await Promise.all(promises);`);
					code.push(`${tab(3)}let response = {};`);
					code.push(`${tab(3)}response.body = promises;`);
					code.push(`${tab(3)}response.headers = promises[0].headers;`);
					code.push(`${tab(2)}finalRecords = response.body;`);
					code.push(`${tab(2)}finalHeader = response.headers;`);
				} else if (node.type === 'API_MULTIPART') {
					code.push(`${tab(2)}logger.debug('Making File Request Once');`);
					code.push(`${tab(2)}let formData = new FormData();`);
					code.push(`${tab(2)}formData.set('file', fs.createReadStream(newBody.fileContent));`);
					code.push(`${tab(2)}options.body = formData;`);
					code.push(`${tab(4)}logger.trace(JSON.stringify(options, null, 4));`);
					code.push(`${tab(2)}let response = await httpClient.request(options);`);
					code.push(`${tab(2)}finalRecords = response.body;`);
					code.push(`${tab(2)}finalHeader = response.headers;`);
				} else {
					code.push(`${tab(2)}logger.debug('Making Request Once');`);
					code.push(`${tab(2)}if (options.method == 'POST' || options.method == 'PUT') {`);
					code.push(`${tab(3)}options.json = customBody;`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(4)}logger.trace(JSON.stringify(options, null, 4));`);
					code.push(`${tab(2)}let response = await httpClient.request(options);`);
					code.push(`${tab(2)}finalRecords = response.body;`);
					code.push(`${tab(2)}finalHeader = response.headers;`);
				}
			}
			// code.push(`${tab(2)}response = { statusCode: 200, body: finalRecords, headers: finalHeader }`);
			code.push(`${tab(2)}state.statusCode = response.statusCode || 400;`);
			code.push(`${tab(2)}state.responseBody = response.body;`);
			code.push(`${tab(2)}state.responseHeaders = response.headers;`);
			code.push(`${tab(2)}response.body = finalRecords;`);
			code.push(`${tab(2)}response.headers = finalHeader;`);

			// code.push(`${tab(2)}if (options.method == 'POST' || options.method == 'PUT') {`);
			// code.push(`${tab(3)}options.json = customBody;`);
			// code.push(`${tab(2)}}`);

			// code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Request URL of ${(node._id)} \`, options.url);`);
			// code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Request Data of ${(node._id)} \`, JSON.stringify(options));`);
			// code.push(`${tab(2)}let response = await httpClient.request(options);`);


			code.push(`${tab(2)}commonUtils.handleResponse(response, state, req, node);`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Response Status Code of ${(node._id)} \`, state.statusCode);`);
			code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Response Data of ${(node._id)} \`, JSON.stringify(state));`);
			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id && node.dataStructure.outgoing.strictValidation) {
				code.push(`${tab(2)}if (state.statusCode == 200) {`);
				code.push(`${tab(3)}const errors = validationUtils.${functionName}(req, response.body);`);
				code.push(`${tab(3)}commonUtils.handleValidation(errors, state, req, node);`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}if (state.statusCode != 200) {`);
			code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${(node._id)} Node with not 200\`, response.statusCode);`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${(node._id)} Node with 200\`);`);
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: state.statusCode, body: state.body, headers: state.headers };`);
		} else if ((node.type === 'TRANSFORM' || node.type === 'MAPPING') && node.mappings) {
			code.push(`${tab(2)}let newBody = {};`);
			generateMappingCode(node, code, true);
			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id && node.dataStructure.outgoing.strictValidation) {
				code.push(`${tab(2)}const errors = validationUtils.${functionName}(req, newBody);`);
				code.push(`${tab(2)}if (errors) {`);
				code.push(`${tab(3)}state.status = "ERROR";`);
				code.push(`${tab(3)}state.statusCode = 400;`);
				code.push(`${tab(3)}state.responseBody = { message: errors };`);
				code.push(`${tab(3)}logger.error(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Error ${(node._id)} \`, errors);`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${(node._id)} Node with not 200\`);`);
				code.push(`${tab(3)}return _.cloneDeep(state);`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = _.cloneDeep(newBody);`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'UNWIND') {
			if (node.options.body && !_.isEmpty(node.options.body)) {
				if (typeof node.options.body == 'object') {
					code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				} else {
					code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
				}
				code.push(`${tab(2)}state.body = customBody;`);
			}
			code.push(`${tab(2)}let newBody = [];`);
			code.push(`${tab(2)}if (Array.isArray(state.body)) {`);
			code.push(`${tab(3)}newBody = [];`);
			code.push(`${tab(3)}newBody = state.body.map(item => {`);
			code.push(`${tab(4)}const tempBody = _.get(item, '${node.options.unwindPath}');`);
			code.push(`${tab(4)}newBody = newBody.concat(tempBody);`);
			code.push(`${tab(3)}});`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(3)}newBody = _.get(state.body, '${node.options.unwindPath}');`);
			code.push(`${tab(2)}}`);

			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id && node.dataStructure.outgoing.strictValidation) {
				code.push(`${tab(2)}const errors = validationUtils.${functionName}(req, newBody);`);
				code.push(`${tab(2)}if (errors) {`);
				code.push(`${tab(3)}state.status = "ERROR";`);
				code.push(`${tab(3)}state.statusCode = 400;`);
				code.push(`${tab(3)}state.responseBody = { message: errors };`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Error ${(node._id)} \`, errors);`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${(node._id)} Node with not 200\`);`);
				code.push(`${tab(3)}return _.cloneDeep(state);`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = newBody;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'DEDUPE' && node.options.fields) {
			code.push(`${tab(2)}if (!Array.isArray(state.body)) {`);
			code.push(`${tab(3)}state.statusCode = 200;`);
			code.push(`${tab(3)}state.status = 'SUCCESS';`);
			code.push(`${tab(3)}return _.cloneDeep(state);`);
			code.push(`${tab(2)}}`);

			code.push(`${tab(2)}function comparator(a, b) {`);
			code.push(`${tab(3)}return _.isEqual(_.at(a, ${JSON.stringify(node.options.fields.split(','))}), _.at(b, ${JSON.stringify(node.options.fields.split(','))}));`);
			code.push(`${tab(2)}}`);

			code.push(`${tab(2)}state.responseBody = _.uniqWith(state.body, comparator);`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.headers = response.headers;`);
			code.push(`${tab(2)}if (state.body.length != state.responseBody.length) {`);
			code.push(`${tab(3)}state.duplicates = _.xorWith(state.body, state.responseBody, comparator);`);
			if (node.options.rejectAll) {
				code.push(`${tab(2)}state.statusCode = 400;`);
				code.push(`${tab(2)}state.status = 'ERROR';`);
				code.push(`${tab(2)}state.error = { message: 'Duplicates Found' };`);
				code.push(`${tab(3)}state.responseBody = { message: 'Duplicates Found', duplicates: state.duplicates };`);
			} else {
				code.push(`${tab(3)}state.responseBody = _.pullAllWith(state.responseBody, state.duplicates, comparator);`);
			}
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'CODEBLOCK' && node.options.code) {
			code.push(`${tab(2)}${node.options.code}`);
			code.push(`${tab(2)}let response = await execute(state, node);`);
			code.push(`${tab(2)}state.statusCode = _.defaultTo(response.statusCode, 200);`);
			code.push(`${tab(2)}state.status = _.defaultTo(response.status, 'SUCCESS');`);
			code.push(`${tab(2)}state.headers = _.defaultTo(response.headers, state.headers);`);
			code.push(`${tab(2)}state.responseBody = response.responseBody;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'FILE_READ') {
			code.push(`${tab(2)}const content = fs.readFileSync(path.join(\`${parseDynamicVariable(node.options.folderPath)}\`,\`${parseDynamicVariable(node.options.fileName)}\`));`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.fileContent = content;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'FILE_WRITE') {
			code.push(`${tab(2)}let newBody = {};`);
			generateMappingCode(node, code, false);
			code.push(`${tab(2)}fs.copyFileSync(newBody.fileContent, path.join(\`${parseDynamicVariable(node.options.folderPath)}\`,\`${parseDynamicVariable(node.options.fileName)}}\`))`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = { message: 'File Write Successful' };`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'CONVERT_CSV_JSON'
			|| node.type === 'CONVERT_JSON_JSON'
			|| node.type === 'CONVERT_JSON_XML'
			|| node.type === 'CONVERT_XML_JSON'
			|| node.type === 'CONVERT_JSON_CSV') {
			code.push(`${tab(2)}let wasBodyArray = true;`);
			code.push(`${tab(2)}let newBody = [];`);

			code.push(`${tab(2)}let sourceBody = _.get(node, ['${node.options.source._id}','responseBody']);`);
			code.push(`${tab(2)}if (!Array.isArray(sourceBody)) {`);
			code.push(`${tab(3)}wasBodyArray = false;`);
			code.push(`${tab(3)}sourceBody = [sourceBody];`);
			code.push(`${tab(2)}}`);

			code.push(`${tab(2)}sourceBody.forEach((data, index) => {`);
			code.push(`${tab(3)}let newData = {};`);
			generateConverterCode(node, code);
			code.push(`${tab(3)}newBody.push(newData);`);
			code.push(`${tab(2)}});`);

			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}if (wasBodyArray) {`);
			code.push(`${tab(2)}state.responseBody = newBody;`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(2)}state.responseBody = newBody[0];`);
			code.push(`${tab(2)}}`);
			generateFileConvertorCode(node, code);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type.startsWith('PARSE_')) {
			code.push(`${tab(2)}let content = _.get(node, '${node.options.fileContent}');`);
			if (node.type === 'PARSE_JSON') {
				code.push(`${tab(2)}let newBody = JSON.parse(content);`);
			} else if (node.type === 'PARSE_XML') {
				code.push(`${tab(2)}let newBody = xmlParser.parse(content);`);
			} else if (node.type === 'PARSE_CSV' || node.type === 'PARSE_EXCEL') {
				if (node.type === 'PARSE_EXCEL') {
					// code.push(`${tab(2)}const workBook = XLSX.readFile(reqFile.tempFilePath);`);
					// code.push(`${tab(2)}XLSX.writeFile(workBook, reqFile.tempFilePath, { bookType: "csv" });`);
					/**	
					 * **********************************************************
					 * Incompete code for PARSE_EXCEL
					 * **********************************************************
					 */
				}
				code.push('let newBody = await new Promise((resolve, reject) => {');
				code.push('    const data = [];');
				code.push('    try {');
				code.push(`        fastcsv.parseString(content, { headers: true, delimiter: '${node.options.delimiter || ','}' })`);
				code.push('            .on(\'data\', (row) => {');
				code.push('                data.push(row);');
				code.push('            })');
				code.push('            .on(\'end\', () => {');
				code.push('                resolve(data);');
				code.push('            }).on(\'error\', (err) => {');
				code.push('                reject(err);');
				code.push('            });');
				code.push('    } catch (err) {');
				code.push('        reject(err);');
				code.push('    }');
				code.push('});');
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = newBody;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type.startsWith('FORMAT_')) {
			code.push(`${tab(2)}let body = _.get(node, '${node.options.source}');`);
			if (node.type === 'FORMAT_JSON') {
				code.push(`${tab(2)}let content = JSON.stringify(body);`);
			} else if (node.type === 'FORMAT_XML') {
				code.push(`${tab(2)}let content = xmlBuilder.build({ ROOT: body });`);
			} else if (node.type === 'FORMAT_CSV' || node.type === 'FORMAT_EXCEL') {
				code.push(`let content = fastcsv.writeToString(body, { headers: true, delimiter: '${node.options.delimiter || ','}' });`);
				if (node.type === 'FORMAT_EXCEL') {
					// code.push(`${tab(2)}const workBook = XLSX.readFile(reqFile.tempFilePath);`);
					// code.push(`${tab(2)}XLSX.writeFile(workBook, reqFile.tempFilePath, { bookType: "csv" });`);
					/**	
					 * **********************************************************
					 * Incompete code for FORMAT_EXCEL
					 * **********************************************************
					 */
				}
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.fileContent = content;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'PLUGIN') {
			const nodeData = await commonUtils.getCustomNode(node.options.plugin._id);
			code.push(`${tab(2)}async function execute(state, node) {`);
			// code = code.concat(ResetNodeVariables(flowData));
			if (nodeData && nodeData.params) {
				nodeData.params.forEach((param) => {
					if (!node.options[param.key]) {
						node.options[param.key] = '';
					}
					if (param.dataType == 'number') {
						code.push(`${tab(3)}let ${param.key} = parseFloat(\`${node.options[param.key].replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}')}\`);`);
					} else if (param.dataType == 'boolean') {
						code.push(`${tab(3)}let ${param.key} = convertToBoolean(\`${node.options[param.key].replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}')}\`);`);
					} else {
						code.push(`${tab(3)}let ${param.key} = \`${node.options[param.key].replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}')}\`;`);
					}
				});
			}
			code.push(`${tab(3)}${nodeData.code}`);
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}let response = await execute(state, node);`);
			code.push(`${tab(2)}state.statusCode = _.defaultTo(response.statusCode, 200);`);
			code.push(`${tab(2)}state.status = _.defaultTo(response.status, 'SUCCESS');`);
			code.push(`${tab(2)}state.headers = _.defaultTo(response.headers, state.headers);`);
			code.push(`${tab(2)}state.responseBody = response.responseBody;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'CONNECTOR' && node.options.connector && node.options.connector._id) {
			const connector = await commonUtils.getConnector(node.options.connector._id);
			if (connector.type == 'SFTP') {
				code.push(`${tab(2)}state.body = {};`);
				code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
				code.push(`${tab(2)}if (!connectorConfig.retry) {`);
				code.push(`${tab(3)}connectorConfig.retry = {};`);
				code.push(`${tab(2)}}`);

				code.push(`${tab(2)}if (connectorConfig.retry.count) {`);
				code.push(`${tab(2)}connectorConfig.retry.count = parseInt(Mustache.render(commonUtils.parseMustacheVariable((connectorConfig.retry.count||1)+''), node));`);
				code.push(`${tab(2)}}`);
				code.push(`${tab(2)}if (connectorConfig.retry.factor) {`);
				code.push(`${tab(2)}connectorConfig.retry.factor = parseInt(Mustache.render(commonUtils.parseMustacheVariable((connectorConfig.retry.factor||1)+''), node));`);
				code.push(`${tab(2)}}`);
				code.push(`${tab(2)}if (connectorConfig.retry.interval) {`);
				code.push(`${tab(2)}connectorConfig.retry.interval = parseInt(Mustache.render(commonUtils.parseMustacheVariable((connectorConfig.retry.interval||1)+''), node));`);
				code.push(`${tab(2)}}`);
				code.push(`${tab(2)}if (connectorConfig.timeout) {`);
				code.push(`${tab(2)}connectorConfig.timeout = parseInt(Mustache.render(commonUtils.parseMustacheVariable((connectorConfig.timeout||30)+''), node));`);
				code.push(`${tab(2)}}`);

				code.push(`${tab(2)}connectorConfig.folderPath = \`${parseDynamicVariable(node.options.folderPath || '\\')}\`;`);
				code.push(`${tab(2)}let newBody = {};`);
				generateMappingCode(node, code, false);
				if (node.options.list) {
					code.push(`${tab(2)}connectorConfig.filePattern = \`${parseDynamicVariable(node.options.filePattern || '') || ''}\`;`);
					code.push(`${tab(2)}connectorConfig.targetPath = connectorConfig.folderPath;`);
					code.push(`${tab(2)}state.body.targetPath = connectorConfig.folderPath;`);
					code.push(`${tab(2)}let fileList = await commonUtils.sftpListFile(connectorConfig);`);
					code.push(`${tab(2)}state.responseBody = fileList;`);
					code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Files File in Folder : \${state.body.targetPath} : Files - \${fileList.length}  \`);`);
				} else if (node.options.read) {
					let dataFormat = node.dataStructure.outgoing;
					let ext = '.json';
					if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
						if (dataFormat.formatType != 'EXCEL') {
							ext = '.' + _.lowerCase(dataFormat.formatType);
						} else {
							ext = '.xlsx';
						}
					}
					code.push(`${tab(2)}let ext = '${ext}';`);
					code.push(`${tab(2)}let outputFileName = '${node._id}' + ext;`);
					code.push(`${tab(2)}const filePath = path.join(process.cwd(), 'downloads', outputFileName);`);

					code.push(`${tab(2)}connectorConfig.fileName = (\`${parseDynamicVariable(node.options.fileName) || ''}\` || '${uuid()}');`);
					code.push(`${tab(2)}connectorConfig.sourcePath = path.join(connectorConfig.folderPath, connectorConfig.fileName);`);
					code.push(`${tab(2)}connectorConfig.targetPath = filePath;`);
					code.push(`${tab(2)}state.body.sourcePath = connectorConfig.sourcePath;`);
					code.push(`${tab(2)}let status = await commonUtils.sftpReadFile(connectorConfig);`);


					if (dataFormat.formatType == 'EXCEL') {
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Converting EXCEL to CSV \`);`);
						code.push(`${tab(1)}const workBook = XLSX.readFile(filePath);`);
						code.push(`${tab(1)}XLSX.writeFile(workBook, filePath, { bookType: "csv" });`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] EXCEL to CSV Conversion Done! \`);`);
					}

					if (dataFormat.formatType === 'CSV' || dataFormat.formatType == 'EXCEL' || dataFormat.formatType === 'DELIMITER') {
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Parsing File\`);`);
						let rowDelimiter = '';
						if (dataFormat.lineSeparator === '\\\\n') {
							rowDelimiter = '\\n';
						} else if (dataFormat.lineSeparator === '\\\\r\\\\n') {
							rowDelimiter = '\\r\\n';
						} else if (dataFormat.lineSeparator === '\\\\r') {
							rowDelimiter = '\\r';
						} else {
							rowDelimiter = '\\n';
						}

						code.push(`${tab(1)}const skipLines = parseInt(\`${parseDynamicVariable(node.options.skipLines || 0)}\`);`);
						code.push(`${tab(1)}const skipRows = parseInt(\`${parseDynamicVariable(node.options.skipRows || 0)}\`);`);
						code.push(`${tab(1)}const maxRows = parseInt(\`${parseDynamicVariable(node.options.maxRows || 0)}\`);`);

						code.push(`${tab(1)}const pr = await new Promise((resolve, reject) => {`);
						code.push(`${tab(2)}let records = [];`);
						code.push(`${tab(2)}const fileStream = fs.createReadStream(filePath);`);
						code.push(`${tab(2)}fastcsv.parseStream(fileStream, {`);
						code.push(`${tab(3)}headers: fileUtils.getHeaderOf${node.dataStructure.outgoing._id}(),`);
						code.push(`${tab(3)}skipLines: skipLines,`);
						code.push(`${tab(3)}skipRows: skipRows,`);
						code.push(`${tab(3)}maxRows: maxRows,`);
						code.push(`${tab(3)}rowDelimiter: '${rowDelimiter}',`);
						code.push(`${tab(3)}delimiter: '${dataFormat.character}',`);
						code.push(`${tab(3)}ignoreEmpty: true,`);
						if (dataFormat.strictValidation) {
							code.push(`${tab(3)}strictColumnHandling: true,`);
						} else {
							code.push(`${tab(3)}discardUnmappedColumns: true,`);
						}
						code.push(`${tab(2)}}).transform(row => {`);
						code.push(`${tab(3)}let temp = fileUtils.convertData${dataFormat._id}(row);`);
						code.push(`${tab(3)}return temp;`);
						code.push(`${tab(2)}}).on('error', err => {`);
						code.push(`${tab(3)}state.status = "ERROR";`);
						code.push(`${tab(3)}state.statusCode = 400;`);
						code.push(`${tab(3)}state.responseBody = err;`);
						code.push(`${tab(3)}stateUtils.upsertState(req, state);`);
						code.push(`${tab(3)}reject(err);`);
						code.push(`${tab(2)}}).on('data', row => records.push(row))`);
						code.push(`${tab(2)}.on('end', rowCount => {`);
						code.push(`${tab(3)}logger.debug('Parsed rows = ', rowCount);`);
						code.push(`${tab(3)}state.totalRecords = rowCount;`);
						code.push(`${tab(3)}state.statusCode = 200;`);
						code.push(`${tab(3)}state.responseBody = records;`);
						// code.push(`${tab(2)}const contents = fs.readFileSync(filePath, 'utf-8');`);
						code.push(`${tab(2)}state.fileContent = filePath;`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
						// code.push(`${tab(3)}logger.trace('Parsed Data - ', state.body);`);
						code.push(`${tab(3)}resolve(records);`);
						code.push(`${tab(2)}});`);
						code.push(`${tab(1)}});`);
						code.push(`${tab(1)} `);
					} else if (dataFormat.formatType === 'JSON') {
						code.push(`${tab(2)}const contents = fs.readFileSync(filePath, 'utf-8');`);
						code.push(`${tab(2)}state.status = "SUCCESS";`);
						code.push(`${tab(2)}state.statusCode = 200;`);
						code.push(`${tab(2)}state.responseBody = JSON.parse(contents);`);
						code.push(`${tab(2)}state.fileContent = filePath;`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
					} else if (dataFormat.formatType === 'XML') {
						code.push(`${tab(2)}const contents = fs.readFileSync(filePath, 'utf-8');`);
						code.push(`${tab(2)}state.status = "SUCCESS";`);
						code.push(`${tab(2)}state.statusCode = 200;`);
						code.push(`${tab(2)}state.responseBody = xmlParser.parse(contents);`);
						code.push(`${tab(2)}state.fileContent = filePath;`);
						code.push(`${tab(2)}state.xmlContent = contents;`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
					} else if (dataFormat.formatType === 'FLATFILE') {
						code.push(`${tab(2)}const contents = fs.readFileSync(filePath, 'utf-8');`);
						code.push(`${tab(2)}state.responseBody = fileUtils.fromFlatFile${dataFormat._id}(contents, ${node.options.isFirstRowHeader || false});`);
						code.push(`${tab(2)}state.status = "SUCCESS";`);
						code.push(`${tab(2)}state.statusCode = 200;`);
						code.push(`${tab(2)}state.fileContent = filePath;`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
					} else if (dataFormat.formatType === 'BINARY') {
						code.push(`${tab(2)}state.status = "SUCCESS";`);
						code.push(`${tab(2)}state.statusCode = 200;`);
						code.push(`${tab(2)}state.fileContent = filePath;`);
						code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!\`);`);
					}


					// code.push(`${tab(2)}state.responseBody = { statusCode: 200, sourcePath: connectorConfig.sourcePath };`);
					// code.push(`${tab(2)}state.fileContent = filePath;`);
					code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Read from: \${state.body.sourcePath} \`);`);
				} else if (node.options.move) {
					code.push(`${tab(2)}connectorConfig.fileName = (\`${parseDynamicVariable(node.options.fileName) || ''}\` || '${uuid()}');`);
					code.push(`${tab(2)}connectorConfig.sourcePath = path.join(\`${parseDynamicVariable(node.options.sourceFolderPath) || ''}\`, connectorConfig.fileName);`);
					code.push(`${tab(2)}connectorConfig.targetPath = path.join(\`${parseDynamicVariable(node.options.targetFolderPath) || ''}\`, connectorConfig.fileName);`);
					code.push(`${tab(2)}state.body.sourcePath = connectorConfig.sourcePath;`);
					code.push(`${tab(2)}state.body.targetPath = connectorConfig.targetPath;`);
					code.push(`${tab(2)}let status = await commonUtils.sftpMoveFile(connectorConfig);`);
					code.push(`${tab(2)}state.responseBody = { statusCode: 200, targetPath: connectorConfig.targetPath, sourcePath: connectorConfig.sourcePath, message: status.message };`);
					code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Moved to: \${state.body.targetPath} \`);`);
				} else if (node.options.delete) {
					code.push(`${tab(2)}connectorConfig.fileName = (\`${parseDynamicVariable(node.options.fileName) || ''}\` || '${uuid()}');`);
					code.push(`${tab(2)}connectorConfig.sourcePath = path.join(connectorConfig.folderPath, connectorConfig.fileName);`);
					code.push(`${tab(2)}state.body.sourcePath = connectorConfig.sourcePath;`);
					code.push(`${tab(2)}let status = await commonUtils.sftpDeleteFile(connectorConfig);`);
					code.push(`${tab(2)}state.responseBody = { statusCode: 200, sourcePath: connectorConfig.sourcePath, message: status.message };`);
					code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Moved to: \${state.body.targetPath} \`);`);
				} else {
					code.push(`${tab(2)}connectorConfig.fileName = (\`${parseDynamicVariable(node.options.fileName) || ''}\` || '${uuid()}');`);
					code.push(`${tab(2)}connectorConfig.sourcePath = newBody.fileContent;`);
					code.push(`${tab(2)}connectorConfig.targetPath = path.join(connectorConfig.folderPath, connectorConfig.fileName);`);
					code.push(`${tab(2)}state.body.targetPath = connectorConfig.targetPath;`);
					code.push(`${tab(2)}let status = await commonUtils.sftpPutFile(connectorConfig);`);
					code.push(`${tab(2)}state.responseBody = { statusCode: 200, targetPath: connectorConfig.targetPath, message: status.message };`);
					code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Uploaded to: \${state.body.targetPath} \`);`);
				}
			} else if (connector.category == 'DB') {
				code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
				if (connector.type == 'MSSQL') {
					code.push(`${tab(2)}const crud = new mssql({ connectionString: connectorConfig.connectionString});`);
				} else if (connector.type == 'MYSQL') {
					code.push(`${tab(2)}const crud = new mysql({ host: connectorConfig.host, port: connectorConfig.port, user: connectorConfig.user, password: connectorConfig.password, database: connectorConfig.database});`);
				} else if (connector.type == 'PGSQL') {
					code.push(`${tab(2)}const crud = new psql({ host: connectorConfig.host, port: connectorConfig.port, user: connectorConfig.user, password: connectorConfig.password, database: connectorConfig.database});`);
				} else {
					code.push(`${tab(2)}const crud = new mdb({ connectionString: connectorConfig.connectionString});`);
				}
				code.push(`${tab(2)}logger.debug(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Connecting to ${connector.type} Database\`);`);
				code.push(`${tab(2)}await crud.connect();`);
				code.push(`${tab(2)}logger.debug(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] ${connector.type} Database Connected\`);`);
				code.push(`${tab(2)}logger.debug(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Executing ${connector.type} Query\`);`);
				code.push(`${tab(2)}const result = await crud.sqlQuery(\`${parseDynamicVariable(node.options.query)}\`);`);
				code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] ${connector.type} Query Executed\`);`);
				code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] ${connector.type} Query Result\`, result);`);
				code.push(`${tab(2)}state.responseBody = result;`);
				// code.push(`${tab(2)}await crud.disconnect();`);
			} else if (connector.category == 'STORAGE') {
				code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
				if (connector.type == 'AZBLOB') {
					code.push(`${tab(2)}let data = {};`);
					code.push(`${tab(2)}let newBody = {};`);
					generateMappingCode(node, code, false);
					code.push(`${tab(2)}data.fileContent = newBody.fileContent;`);
					code.push(`${tab(2)}data.connectionString = connectorConfig.connectionString;`);
					code.push(`${tab(2)}data.containerName = connectorConfig.container;`);
					if (node.options.folderPath) {
						code.push(`${tab(2)}const blobName = path.join('/',\`${parseDynamicVariable(node.options.folderPath)}\`,\`${parseDynamicVariable(node.options.fileName)}\`);`);
					} else {
						code.push(`${tab(2)}const blobName = path.join('/',\`${parseDynamicVariable(node.options.fileName)}\`);`);
					}
					code.push(`${tab(2)}data.blobName = blobName;`);
					code.push(`${tab(2)}data.metadata = {`);
					code.push(`${tab(3)}'dnio_app': '${config.app}',`);
					code.push(`${tab(3)}'dnio_flowName': '${config.flowName}',`);
					code.push(`${tab(3)}'dnio_txn_id': req.header('data-stack-txn-id'),`);
					code.push(`${tab(3)}'dnio_remote_txn_id': req.header('data-stack-remote-txn-id'),`);
					code.push(`${tab(3)}'dnio_filename': reqfile.name`);
					code.push(`${tab(2)}};`);
					code.push(`${tab(2)}`);
					code.push(`${tab(2)}let result = await storageEngine.uploadDataAzBlob(data);`);
					code.push(`${tab(2)}`);
					code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File upload response - \${JSON.stringify(result)}\`);`);
					code.push(`${tab(2)}`);
					code.push(`${tab(2)}state.responseBody = result;`);
				}
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'FILE') {
			let dataFormat = node.dataStructure.incoming;
			let ext = '.json';
			if (node.dataStructure && node.dataStructure.incoming && node.dataStructure.incoming._id) {
				if (dataFormat.formatType != 'EXCEL') {
					ext = '.' + _.lowerCase(dataFormat.formatType);
				} else {
					ext = '.xlsx';
				}
			}
			code.push(`${tab(2)}let ext = '${ext}';`);
			code.push(`${tab(2)}if (req.header('output-file-name') != null && req.header('output-file-name') != '') {`);
			code.push(`${tab(3)}outputFileName = req.header('output-file-name');`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(3)}const remoteTxnId = req.header('data-stack-remote-txn-id');`);
			code.push(`${tab(3)}const temp = remoteTxnId.split(".");`);
			code.push(`${tab(3)}if (ext === temp[1]) {`);
			code.push(`${tab(4)}outputFileName = req.header('data-stack-remote-txn-id').toString();`);
			code.push(`${tab(3)}} else if(temp[0]) {`);
			code.push(`${tab(4)}outputFileName = temp[0] + ext;`);
			code.push(`${tab(3)}} else {`);
			code.push(`${tab(4)}outputFileName = remoteTxnId + ext;`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}logger.trace('out file name - ', outputFileName);`);
			code.push(`${tab(2)}logger.trace('file content - ', state.fileContent);`);
			code.push(`${tab(2)}let fileDetails = commonUtils.uploadFileToDB(req, state.fileContent, '${node.options.agents[0].agentId}', '${node.options.agents[0].name}', '${pNode.name}','${pNode.deploymentName}', outputFileName);`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.responseBody = fileDetails;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		} else if (node.type === 'RESPONSE') {
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}let newBody = {};`);
			if (node.mappingType == 'custom') {
				generateMappingCode(node, code, true);
				code.push(`${tab(2)}state.body = newBody;`);
			} else {
				generateMappingCode(node, code, false);
				code.push(`${tab(2)}state.body = newBody.body;`);
				// code.push(`${tab(2)}if(!_.isEmpty(newBody.headers)){`);
				// code.push(`${tab(3)}customHeaders = _.merge(newBody.headers, customHeaders) || {};`);
				// code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		} else if (node.type == 'KAFKA_PRODUCER') {
			const connector = await commonUtils.getConnector(node?.options?.connector?._id);

			code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
			code.push(`${tab(2)}connectorConfig.topic = '${node.options.topicName}';`);

			code.push(`${tab(2)}kafkaUtils.ensureTopicExists(connectorConfig);`);
			code.push(`${tab(2)}`);

			code.push(`${tab(2)}let data = {};`);
			code.push(`${tab(2)}let newBody = {};`);
			generateMappingCode(node, code, false);
			code.push(`${tab(2)}`);

			code.push(`${tab(2)}let key = ${node?.options?.key?.replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}') || undefined};`);
			code.push(`${tab(2)}let partition = ${node?.options?.partition?.replace(/{{/g, '${_.get(node, \'').replace(/}}/g, '\')}') || -1};`);

			code.push(`${tab(2)}let producer = await kafkaUtils.createProducer(connectorConfig);`);
			code.push(`${tab(2)}`);
			code.push(`${tab(2)}let result = await kafkaUtils.produceMessage(producer, connectorConfig.topic, partition, key, newbody)`);
			code.push(`${tab(2)}`);
			code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Kafka produce response - \${JSON.stringify(result)}\`);`);
			code.push(`${tab(2)}`);
			code.push(`${tab(2)}state.responseBody = result;`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else {
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		}
		code.push(`${tab(1)}} catch (err) {`);
		code.push(`${tab(2)}commonUtils.handleError(err, state, req, node);`);
		code.push(`${tab(2)}logger.error(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${(node._id)} Node with\`, state.statusCode, typeof state.statusCode);`);
		code.push(`${tab(2)}return _.cloneDeep(state);`);
		// code.push(`${tab(2)}return { statusCode: state.statusCode, body: err, headers: state.headers };`);
		code.push(`${tab(1)}} finally {`);
		code.push(`${tab(2)}node['${node._id}'] = state;`);
		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(1)}}`);
		code.push('}');
		return;
		// });
	}, Promise.resolve());
	// await Promise.all(promises);
	return _.concat(code, loopCode, exportsCode).join('\n');
}

function parseDynamicVariable(value) {
	if (typeof value != 'string') {
		return value;
	}
	if (value) {
		return value.replace(/{{/g, '${').replace(/}}/g, '}');
	}
}

function parseMustacheVariable(value) {
	if (value) {
		return value.replace(/([a-z]+)\[/g, '$1.').replace(/([0-9]+)\]/g, '$1');
	}
}

function parseHeaders(headers) {
	let tempHeaders = {};
	if (headers) {
		if (typeof headers === 'object') {
			Object.keys(headers).forEach(key => {
				tempHeaders[key] = parseHeaders(headers[key]);
			});
		} else if (typeof headers === 'string' && headers.indexOf('{{') > -1) {
			return parseDynamicVariable(headers);
		} else {
			return headers;
		}
	}
	return JSON.stringify(tempHeaders);
}

function parseBody(body, parent) {
	let tempBody = {};
	if (body) {
		if (typeof body === 'object') {
			Object.keys(body).forEach(key => {
				tempBody[key] = parseBody(body[key], key);
			});
		} else if (typeof body === 'string' && body.indexOf('{{') > -1) {
			if (parent) {
				return parseDynamicVariable(body);
			} else {
				return body.replace(/{{/g, '').replace(/}}/g, '');
			}
		} else {
			return body;
		}
	}
	return parent ? tempBody : JSON.stringify(tempBody);
}


function parseDataStructures(dataJson) {
	visitedValidation = [];
	const code = [];
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const Ajv = require(\'ajv\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const ajv = new Ajv();');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaID => {
			let schema = dataJson.dataStructures[schemaID];
			code.push(`let schema_${schemaID} = fs.readFileSync(\`./schemas/${schemaID}.schema.json\`).toString();`);
			code.push(`schema_${schemaID} = JSON.parse(schema_${schemaID});`);
			if (schema.strictValidation) {
				code.push(`const validate_${schemaID} = ajv.compile(schema_${schemaID});`);
			}
		});
	}
	return _.concat(code, generateDataStructures(dataJson.inputNode, dataJson.nodes)).join('\n');
}

function generateDataStructures(node, nodes) {
	let code = [];
	const exportsCode = [];
	let schemaID;
	if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
		schemaID = (node.dataStructure.outgoing._id);
	}
	const functionName = 'validate_structure_' + node._id;
	exportsCode.push(`module.exports.${functionName} = ${functionName};`);
	code.push(`function ${functionName}(req, data) {`);
	if (schemaID) {
		code.push(`${tab(1)}const errors = {};`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Data Structure ${(node._id)} Node\`);`);
		code.push(`${tab(1)}if (Array.isArray(data)) {`);
		code.push(`${tab(2)}for (let i=0;i<data.length;i++) {`);
		code.push(`${tab(3)}const item = data[i];`);
		code.push(`${tab(3)}const valid = validate_${schemaID}(item);`);
		code.push(`${tab(3)}if (!valid) errors[i] = ajv.errorsText(validate_${schemaID}.errors);`);
		code.push(`${tab(2)}}`);
		code.push(`${tab(1)}} else {`);
		code.push(`${tab(2)}const valid = validate_${schemaID}(data);`);
		code.push(`${tab(2)}if (!valid) errors['0'] = ajv.errorsText(validate_${schemaID}.errors);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (!_.isEmpty(errors)) {`);
		code.push(`${tab(2)}throw errors;`);
		code.push(`${tab(1)}}`);
	} else {
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] No Data Structure found for ${(node._id)} Node\`);`);
	}
	code.push(`${tab(1)}return null;`);
	code.push('}');
	let tempNodes = (node.onSuccess || []);
	for (let index = 0; index < tempNodes.length; index++) {
		const ss = tempNodes[index];
		const nextNode = nodes.find(e => e._id === ss._id);
		if (nextNode) {
			if (visitedValidation.indexOf(nextNode._id) > -1) {
				return;
			}
			visitedValidation.push(nextNode._id);
			code = code.concat(generateDataStructures(nextNode, nodes));
		}
	}
	return _.concat(code, exportsCode).join('\n');
}


function parseDataStructuresForFileUtils(dataJson) {
	const code = [];
	code.push('/* eslint-disable quotes */');
	code.push('/* eslint-disable camelcase */');
	code.push('const _ = require(\'lodash\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaId => {
			const definition = dataJson.dataStructures[schemaId].definition;
			const formatType = dataJson.dataStructures[schemaId].formatType || 'JSON';
			// Function to return array of values;
			code.push(`function getValuesOf${schemaId} (data) {`);
			code.push(`${tab(1)}const values = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}values.push(_.get(data, '${properties.dataPath}') || '');`);
			});
			code.push(`${tab(1)}return values;`);
			code.push('}');
			// Function to return array of headers;
			code.push(`function getHeaderOf${schemaId} () {`);
			code.push(`${tab(1)}const headers = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}headers.push('${properties.name}');`);
			});
			code.push(`${tab(1)}return headers;`);
			code.push('}');


			// Function to Convert Data from CSV to JSON;
			code.push(`function convertData${schemaId} (rowData) {`);
			code.push(`${tab(1)}const tempData = {};`);
			definition.forEach(def => {
				const properties = def.properties;
				const sourceKey = formatType == 'JSON' ? (properties.dataPath || properties.key) : properties.name;
				if (def.type == 'Number') {
					code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', +(_.get(rowData, '${sourceKey}')));`);
				} else if (def.type == 'Boolean') {
					code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', commonUtils.convertToBoolean(_.get(rowData, '${sourceKey}')));`);
				} else if (def.type == 'Date') {
					code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', commonUtils.convertToDate(_.get(rowData, '${sourceKey}'), '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
				} else {
					code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', _.get(rowData, '${sourceKey}'));`);
				}
			});
			code.push(`${tab(1)}return tempData;`);
			code.push('}');

			// Function to Read FLAT FILE data;
			code.push(`function fromFlatFile${schemaId} (contents, isFirstRowHeader) {`);
			code.push(`${tab(1)}let records = [];`);
			code.push(`${tab(1)}let rows = contents.split('\\n');`);
			code.push(`${tab(1)}if (isFirstRowHeader) {`);
			code.push(`${tab(2)}rows = rows.splice(1);`);
			code.push(`${tab(1)}}`);
			code.push(`${tab(1)}rows.forEach((rowData)=>{`);
			code.push(`${tab(1)}let tempData = {};`);
			code.push(`${tab(1)}let rowSegments = rowData.split('');`);
			definition.forEach((def, i) => {
				const properties = def.properties;
				const targetKey = properties.dataPathSegs;
				code.push(`${tab(1)}let var_${i} = _.trim(rowSegments.splice(0,${properties.fieldLength}).join(''));`);
				if (def.type == 'Number') {
					code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
				} else if (def.type == 'Boolean') {
					code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
				} else if (def.type == 'Date') {
					code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
				} else {
					code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
				}
			});
			code.push(`${tab(2)}records.push(tempData);`);
			code.push(`${tab(1)}});`);
			code.push(`${tab(1)}return records;`);
			code.push('}');


			// Function to Write FLAT FILE data;
			code.push(`function toFlatFile${schemaId} (records) {`);
			code.push(`${tab(1)}let rows = [];`);
			code.push(`${tab(1)}records.forEach((rowData)=>{`);
			code.push(`${tab(1)}let line = '';`);
			definition.forEach((def, i) => {
				const properties = def.properties;
				const sourceKey = properties.dataPathSegs;
				if (def.type == 'Number') {
					code.push(`${tab(2)}let var_${i} = (_.get(rowData, ${JSON.stringify(sourceKey)}))+'';`);
				} else if (def.type == 'Boolean') {
					code.push(`${tab(2)}let var_${i} = convertToBoolean(_.get(rowData, ${JSON.stringify(sourceKey)}));`);
				} else if (def.type == 'Date') {
					code.push(`${tab(2)}let var_${i} = commonUtils.convertToDate(_.get(rowData, ${JSON.stringify(sourceKey)}), '${properties.dateFormat || 'yyyy-MM-dd'}');`);
				} else {
					code.push(`${tab(2)}let var_${i} = _.get(rowData, ${JSON.stringify(sourceKey)});`);
				}
				code.push(`${tab(2)}var_${i} = var_${i}.split('').slice(0, ${properties.fieldLength}).join('');`);
				code.push(`${tab(2)}var_${i} = _.padEnd(var_${i}, ${properties.fieldLength}, ' ');`);
				code.push(`${tab(2)}line+=var_${i};`);
			});
			code.push(`${tab(2)}rows.push(line);`);
			code.push(`${tab(1)}});`);
			code.push(`${tab(1)}return rows.join('\\n');`);
			code.push('}');

			code.push(`module.exports.getValuesOf${schemaId} = getValuesOf${schemaId};`);
			code.push(`module.exports.getHeaderOf${schemaId} = getHeaderOf${schemaId};`);
			code.push(`module.exports.convertData${schemaId} = convertData${schemaId};`);
			code.push(`module.exports.toFlatFile${schemaId} = toFlatFile${schemaId};`);
			code.push(`module.exports.fromFlatFile${schemaId} = fromFlatFile${schemaId};`);
		});
		code.push(`${tab(0)}function convertToBoolean(value) {`);
		code.push(`${tab(1)}if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {`);
		code.push(`${tab(2)}return 'TRUE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (typeof value === 'boolean') {`);
		code.push(`${tab(2)}return value ? 'TRUE' : 'FALSE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (typeof value === 'number') {`);
		code.push(`${tab(2)}return value != 0 ? 'TRUE' : 'FALSE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}return 'FALSE';`);
		code.push(`${tab(0)}}`);
	}
	return code.join('\n');
}


function parseDataStructuresForMasking(dataJson) {
	let code = [];
	code.push('/* eslint-disable quotes */');
	code.push('/* eslint-disable camelcase */');
	code.push('const _ = require(\'lodash\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaId => {
			const definition = dataJson.dataStructures[schemaId].definition;
			// const formatType = dataJson.dataStructures[schemaId].formatType || 'JSON';
			// Function to return array of values;
			code.push(`function maskDataFor${schemaId} (data) {`);
			code = code.concat(parseForMasking(definition));
			code.push(`${tab(1)}return data;`);
			code.push(`${tab(0)}}`);

			code.push(`${tab(0)}module.exports.maskDataFor${schemaId} = maskDataFor${schemaId};`);
		});
	}

	code.push(`${tab(0)}function maskCommon (data) {`);
	console.log(flowData.appData.maskingPaths);
	(flowData.appData.maskingPaths || []).forEach((item, i) => {
		item.index = i;
		if (item.dataPath.indexOf('[#]') > -1) {
			let path = JSON.parse(item.dataPath);
			let arrayIndexes = path.map((e, i) => {
				if (e == '[#]') return i;
			}).filter(e => e).reverse();
			let multiPaths = [];
			for (let index = 0; index < arrayIndexes.length; index++) {
				const arrCurrIndex = arrayIndexes[index];
				let temp = path.splice(arrCurrIndex);
				temp.splice(0, 1);
				multiPaths.push(temp);
			}
			multiPaths.push(path);
			multiPaths.reverse();
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}// Masking of ${item.dataPath} Start`);
			code.push(`${tab(3)}// =========================================`);
			code = code.concat(maskRecursive(item, multiPaths, 'data', 0));
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}`);
		} else {
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}// Masking of ${item.dataPath} Start`);
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}let var_${i} = _.get(data, ${item.dataPath});`);
			code.push(`${tab(3)}if(var_${i}) {`);
			code.push(`${tab(4)}var_${i} = commonUtils.maskStringData(var_${i}, '${item.maskType}', ${item.chars});`);
			code.push(`${tab(4)}_.set(data, ${item.dataPath}, var_${i});`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}`);
		}
	});
	code.push(`${tab(1)}return data;`);
	code.push(`${tab(0)}}`);
	code.push(`${tab(0)}module.exports.maskCommon = maskCommon;`);
	function maskRecursive(maskConfig, multiPaths, prev, i) {
		let tempCode = [];
		let curr = multiPaths[i];
		let varName = `var_${maskConfig.index}_${i}`;
		tempCode.push(`${tab(0)}let ${varName} = _.get(${prev}, ${JSON.stringify(curr)});`);
		tempCode.push(`${tab(0)}if (${varName}) {`);
		tempCode.push(`${tab(0)}if (_.isArray(${varName})) {`);
		tempCode.push(`${tab(0)}let new_${varName} = ${varName}.map(item=>{`);
		if (multiPaths.length - 1 == i) {
			// Mask Item
			tempCode.push(`${tab(0)}item = commonUtils.maskStringData(item, '${maskConfig.maskType}', ${maskConfig.chars});`);
		} else {
			tempCode = tempCode.concat(maskRecursive(maskConfig, multiPaths, 'item', i + 1));
		}
		tempCode.push(`${tab(0)}return item;`);
		tempCode.push(`${tab(0)}});`);
		tempCode.push(`${tab(0)}_.set(${prev}, ${JSON.stringify(curr)}, new_${varName});`);
		tempCode.push(`${tab(0)}} else {`);
		if (multiPaths.length - 1 == i) {
			// Mask ${varName}
			tempCode.push(`${tab(0)}${varName} = commonUtils.maskStringData(${varName}, '${maskConfig.maskType}', ${maskConfig.chars});`);
		} else {
			tempCode = tempCode.concat(maskRecursive(maskConfig, multiPaths, varName, i + 1));
		}
		tempCode.push(`${tab(0)}_.set(${prev}, ${JSON.stringify(curr)}, ${varName});`);
		tempCode.push(`${tab(0)}}`);
		tempCode.push(`${tab(0)}}`);
		return tempCode;
	}

	function parseForMasking(definition, isArray) {
		let tempCode = [];
		definition.forEach((def, i) => {
			let properties = def.properties;
			let dataPathSegs = properties.dataPathSegs;
			if (def.type == 'Object') {
				tempCode = tempCode.concat(parseForMasking(def.definition));
			} else if (def.type == 'Array') {
				if (def.definition[0].type == 'Object') {
					tempCode.push(`${tab(1)}let arr_var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
					tempCode.push(`${tab(1)}if(arr_var_${i} && !_.isEmpty(arr_var_${i})){`);
					tempCode.push(`${tab(2)}arr_var_${i} = arr_var_${i}.map((item) => {`);
					tempCode = tempCode.concat(parseForMasking(def.definition[0].definition, true));
					// tempCode.push(`${tab(3)}return commonUtils.maskStringData(item, '${properties.masking}', ${chars});`);
					tempCode.push(`${tab(3)}return item;`);
					tempCode.push(`${tab(2)}});`);
					tempCode.push(`${tab(1)}}`);
					tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, arr_var_${i});`);
				} else {
					properties.masking = def.definition[0].properties.masking;
					if (properties.masking && properties.masking.startsWith('some') || properties.masking == 'all') {
						let chars = parseInt(properties.masking.split('_')[1], 10);
						tempCode.push(`${tab(1)}let var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
						tempCode.push(`${tab(1)}if(var_${i} && !_.isEmpty(var_${i})){`);
						tempCode.push(`${tab(2)}var_${i} = var_${i}.map((item) => {`);
						tempCode.push(`${tab(3)}return commonUtils.maskStringData(item, '${properties.masking}', ${chars});`);
						tempCode.push(`${tab(2)}});`);
						tempCode.push(`${tab(1)}}`);
						tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, var_${i});`);
					}
				}
			} else {
				if (properties.masking) {
					if (properties.masking.startsWith('some') || properties.masking == 'all') {
						let hashIndex = dataPathSegs.indexOf('[#]');
						if (hashIndex > -1) {
							dataPathSegs = dataPathSegs.splice(hashIndex + 1);
						}
						let chars = parseInt(properties.masking.split('_')[1], 10);
						tempCode.push(`${tab(1)}let var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
						tempCode.push(`${tab(1)}if(var_${i} && _.trim(var_${i})){`);
						tempCode.push(`${tab(2)}var_${i} = commonUtils.maskStringData(var_${i}, '${properties.masking}', ${chars});`);
						tempCode.push(`${tab(1)}}`);
						tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, var_${i});`);
					}
				}
			}
		});
		return tempCode;
	}
	return code.join('\n');
}

function generateMappingCode(node, code, useAbsolutePath) {
	if (!node.mappings) {
		node.mappings = [];
	}
	let parsedDataPaths = [];
	let parsedFormulas = [];
	let generateArrayMappingCode = function (varName, arrayItems) {
		let arrayCode = [];
		let flag = false;
		if (arrayItems && arrayItems.length > 0) {
			arrayItems.forEach((item, i) => {
				parsedDataPaths.push(item.target.dataPath);
				if (item.source && item.source.length > 0) {
					item.source.forEach((src) => {
						let dataPathSegs = JSON.parse(JSON.stringify(src.dataPathSegs || []));
						let dataPathSegsIndex = dataPathSegs.indexOf('[#]');
						if (dataPathSegsIndex > -1) {
							let removedPathSegments = dataPathSegs.splice(dataPathSegsIndex);
						}
						let sourceVarName = _.camelCase(src.nodeId + '.' + dataPathSegs.join('.'));
						flag = true;
						if (i == 0) {
							if (useAbsolutePath) {
								dataPathSegs.unshift('responseBody');
							}
							dataPathSegs.unshift(src.nodeId);
							if (dataPathSegsIndex > -1) {
								arrayCode.push(`let source_${sourceVarName} = _.get(node, ${JSON.stringify(dataPathSegs)}) || [];`);
							} else {
								arrayCode.push(`let source_${sourceVarName} = [{}];`);
							}
							arrayCode.push(`source_${sourceVarName}.map((item, i) => {`);
						}
						if (useAbsolutePath) {
							src.dataPathSegs.unshift('responseBody');
						}
						src.dataPathSegs.unshift(src.nodeId);
						arrayCode.push(`_.set(newBody, ${JSON.stringify(item.target.dataPathSegs).replace(/"\[#\]"/, 'i')}, _.get(node, ${JSON.stringify(src.dataPathSegs).replace(/"\[#\]"/, 'i')}));`);
					});
				}
			});
			if (flag) {
				arrayCode.push('});');
			}
		}
		return arrayCode;
	};
	function generateFormulaCode(formula, parentName) {
		let tempCode = [];
		if (formula.params && formula.params.length > 0) {
			formula.params.forEach(param => {
				param.var = `var_${param.name}_${uuid().split('-').pop()}`;
				if (param.substituteVal) {
					let temp = JSON.parse(JSON.stringify(param.substituteVal.dataPathSegs));
					let arrIndex = temp.indexOf('[#]');
					if (arrIndex > -1) {
						temp.splice(arrIndex, 1, 0);
					}
					if (param.substituteVal.isConstant) {
						tempCode.push(`let ${param.var} = _.get(node, ${JSON.stringify(temp)});`);
					} else {
						temp.unshift('responseBody');
						temp.unshift(param.substituteVal.nodeId);
						tempCode.push(`let ${param.var} = _.get(node, ${JSON.stringify(temp)});`);
					}
				} else if (param.substituteFn) {
					// tempCode.push(`let ${param.name} = ${param.substituteFn.name};`);
					tempCode = tempCode.concat(generateFormulaCode(param.substituteFn, param.var));
				}
			});
		}
		if (parentName) {
			tempCode.push(`let ${parentName} = ${formula.name}(${formula.params.map(e => e.var)});`);
		} else {
			tempCode.push(`return ${formula.name}(${formula.params.map(e => e.var)});`);
		}
		return tempCode;
	}
	node.mappings.forEach((item, i) => {
		if (parsedDataPaths.indexOf(item.target.dataPath) > -1) {
			return;
		}
		parsedDataPaths.push(item.target.dataPath);
		if (item.target.type == 'Array') {
			let arrayItems = node.mappings.filter(e => e.target.dataPath.startsWith(item.target.dataPath) && e.target.dataPath != item.target.dataPath);
			if (item.source && item.source.length > 0) {
				item.source.forEach((src) => {
					let temp = JSON.parse(JSON.stringify(src.dataPathSegs || []));
					if (useAbsolutePath) {
						temp.unshift('responseBody');
					}
					temp.unshift(src.nodeId);
					let arrIndex = temp.indexOf('[#]');
					if (arrIndex > -1) {
						temp.splice(arrIndex, 1, 0);
					}
					code.push(`let val_${i} = _.get(node, ${JSON.stringify(temp)});`);
					code.push(`_.set(newBody, '${item.target.dataPath}', val_${i});`);
				});
				arrayItems.forEach(e => {
					parsedDataPaths.push(e.target.dataPath);
				});
			} else {
				// code.push(`let val_${i} = [];`);
				let temps = generateArrayMappingCode(`val_${i}`, arrayItems);
				temps.forEach(e => {
					code.push(e);
				});
				// code.push(`_.set(newBody, ${JSON.stringify(item.target.dataPathSegs)}, val_${i});`);
			}
		} else {
			code.push(`let val_${i} = function() {`);
			if (item.formulaConfig && item.formulaConfig.length > 0) {
				let formula = item.formulaConfig[0];
				// if (parsedFormulas.indexOf(formula._id) > -1) {
				// 	return;
				// }
				parsedFormulas.push(formula._id);
				let temp = generateFormulaCode(formula);
				temp.forEach(item => {
					code.push(item);
				});
			} else if (item.advanceFormula) {
				code.push(`return ${fixCondition(item.advanceFormula)};`);
			} else {
				if (item.source && item.source.length > 0) {
					item.source.forEach((src) => {
						let temp = JSON.parse(JSON.stringify(src.dataPathSegs || []));
						if (temp[0] != 'CONSTANTS') {
							if (useAbsolutePath) {
								temp.unshift('responseBody');
							}
							temp.unshift(src.nodeId);
							let arrIndex = temp.indexOf('[#]');
							if (arrIndex > -1) {
								temp.splice(arrIndex, 1, 0);
							}
						}
						code.push(`\treturn _.get(node, ${JSON.stringify(temp)});`);
					});
				}
			}
			code.push('};');
			code.push(`_.set(newBody, ${JSON.stringify(item.target.dataPathSegs)}, val_${i}());`);
		}
	});
}


function generateConverterCode(node, code) {
	if (!node.mappings) {
		node.mappings = [];
	}
	let parsedDataPaths = [];
	let parsedFormulas = [];
	let generateArrayConverterCode = function (varName, arrayItems) {
		let arrayCode = [];
		let flag = false;
		if (arrayItems && arrayItems.length > 0) {
			arrayItems.forEach((item, i) => {
				parsedDataPaths.push(item.target.dataPath);
				if (item.source && item.source.length > 0) {
					item.source.forEach((src) => {
						let dataPathSegs = JSON.parse(JSON.stringify(src.dataPathSegs || []));
						let dataPathSegsIndex = dataPathSegs.indexOf('[#]');
						if (dataPathSegsIndex > -1) {
							let removedPathSegments = dataPathSegs.splice(dataPathSegsIndex);
						}
						let sourceVarName = _.camelCase(src.nodeId + '.' + dataPathSegs.join('.'));
						flag = true;
						if (i == 0) {
							if (dataPathSegsIndex > -1) {
								arrayCode.push(`let source_${sourceVarName} = _.get(data, ${JSON.stringify(dataPathSegs)}) || [];`);
							} else {
								arrayCode.push(`let source_${sourceVarName} = [{}];`);
							}
							arrayCode.push(`source_${sourceVarName}.map((item, i) => {`);
						}
						arrayCode.push(`_.set(newData, ${JSON.stringify(item.target.dataPathSegs).replace(/"\[#\]"/, 'i')}, _.get(item, ${JSON.stringify(src.dataPathSegs).replace(/"\[#\]"/, 'i')}));`);
					});
				}
			});
			if (flag) {
				arrayCode.push('});');
			}
		}
		return arrayCode;
	};

	function generateFormulaCode(formula, parentName) {
		let tempCode = [];
		if (formula.params && formula.params.length > 0) {
			formula.params.forEach(param => {
				param.var = `var_${param.name}_${uuid().split('-').pop()}`;
				if (param.substituteVal) {
					let temp = JSON.parse(JSON.stringify(param.substituteVal.dataPathSegs));
					let arrIndex = temp.indexOf('[#]');
					if (arrIndex > -1) {
						temp.splice(arrIndex, 1, 0);
					}
					if (param.substituteVal.isConstant) {
						tempCode.push(`let ${param.var} = _.get(node, ${JSON.stringify(temp)});`);
					} else {
						tempCode.push(`let ${param.var} = _.get(data, ${JSON.stringify(temp)});`);
					}
				} else if (param.substituteFn) {
					// tempCode.push(`let ${param.name} = ${param.substituteFn.name};`);
					tempCode = tempCode.concat(generateFormulaCode(param.substituteFn, param.var));
				}
			});
		}
		if (parentName) {
			tempCode.push(`let ${parentName} = ${formula.name}(${formula.params.map(e => e.var)});`);
		} else {
			tempCode.push(`return ${formula.name}(${formula.params.map(e => e.var)});`);
		}
		return tempCode;
	}
	node.mappings.forEach((item, i) => {
		if (parsedDataPaths.indexOf(item.target.dataPath) > -1) {
			return;
		}
		parsedDataPaths.push(item.target.dataPath);
		if (item.target.type == 'Array') {
			let arrayItems = node.mappings.filter(e => e.target.dataPath.startsWith(item.target.dataPath) && e.target.dataPath != item.target.dataPath);
			if (item.source && item.source.length > 0) {
				item.source.forEach((src) => {
					let temp = JSON.parse(JSON.stringify(src.dataPathSegs || []));
					let arrIndex = temp.indexOf('[#]');
					if (arrIndex > -1) {
						temp.splice(arrIndex, 1, 0);
					}
					code.push(`let val_${i} = _.get(data, ${JSON.stringify(temp)});`);
					code.push(`_.set(newData, '${item.target.dataPath}', val_${i});`);
				});
				arrayItems.forEach(e => {
					parsedDataPaths.push(e.target.dataPath);
				});
			} else {
				// code.push(`let val_${i} = [];`);
				let temps = generateArrayConverterCode(`val_${i}`, arrayItems);
				temps.forEach(e => {
					code.push(e);
				});
				// code.push(`_.set(newData, ${JSON.stringify(item.target.dataPathSegs)}, val_${i});`);
			}
		} else {
			code.push(`let val_${i} = function() {`);
			if (item.formulaConfig && item.formulaConfig.length > 0) {
				let formula = item.formulaConfig[0];
				// if (parsedFormulas.indexOf(formula._id) > -1) {
				// 	return;
				// }
				parsedFormulas.push(formula._id);
				let temp = generateFormulaCode(formula);
				temp.forEach(item => {
					code.push(item);
				});
			} else if (item.advanceFormula) {
				code.push(`return ${fixCondition(item.advanceFormula)};`);
			} else {
				if (item.source && item.source.length > 0) {
					item.source.forEach((src) => {
						let temp = JSON.parse(JSON.stringify(src.dataPathSegs || []));
						if (temp[0] != 'CONSTANTS') {
							let arrIndex = temp.indexOf('[#]');
							if (arrIndex > -1) {
								temp.splice(arrIndex, 1, 0);
							}
						}
						code.push(`\treturn _.get(data, ${JSON.stringify(temp)});`);
					});
				}
			}
			code.push('};');
			code.push(`_.set(newData, ${JSON.stringify(item.target.dataPathSegs)}, val_${i}());`);
		}
	});
}

function generateFileConvertorCode(node, code) {
	let dataFormat = node.dataStructure.outgoing;
	let ext = '.json';
	if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
		if (dataFormat.formatType != 'EXCEL') {
			ext = '.' + _.lowerCase(dataFormat.formatType);
		} else {
			ext = '.xlsx';
		}
	}
	code.push(`${tab(2)}let ext = '${ext}';`);
	code.push(`${tab(2)}let outputFileName = '${node._id}' + ext;`);

	code.push(`${tab(2)}const filePath = path.join(process.cwd(), 'downloads', outputFileName);`);

	if (dataFormat.formatType === 'CSV' || dataFormat.formatType === 'DELIMITER' || dataFormat.formatType === 'EXCEL') {
		let delimiter = ',';
		if (dataFormat.formatType === 'DELIMITER') {
			delimiter = dataFormat.character;
		}
		let rowDelimiter = dataFormat.lineSeparator;
		if (rowDelimiter === '\\\\n') {
			rowDelimiter = '\\n';
		} else if (rowDelimiter === '\\\\r\\\\n') {
			rowDelimiter = '\\r\\n';
		} else if (rowDelimiter === '\\\\r') {
			rowDelimiter = '\\r';
		} else {
			rowDelimiter = '\\n';
		}
		code.push(`${tab(2)}const pr = await new Promise((resolve, reject) => {`);
		code.push(`${tab(3)}const csvOutputStream = fs.createWriteStream(filePath);`);
		code.push(`${tab(3)}const stream = fastcsv.format({ rowDelimiter: '${rowDelimiter}', delimiter: '${delimiter}', ${dataFormat.formatType === 'DELIMITER' ? 'quote: false' : ''} });`);
		code.push(`${tab(3)}stream.pipe(csvOutputStream);`);
		// code.push(`${tab(2)}const generateHeaders = ${node.meta.generateHeaders || false};`);
		// code.push(`${tab(2)}if (generateHeaders) {`);
		// code.push(`${tab(2)}stream.write(fileUtils.getHeaderOf${dataFormat._id}());`);
		// code.push(`${tab(2)}}`);
		code.push(`${tab(3)}if (Array.isArray(newBody)) {`);
		code.push(`${tab(4)}newBody.forEach(data => {`);
		code.push(`${tab(4)}stream.write(fileUtils.getValuesOf${dataFormat._id}(data));`);
		code.push(`${tab(3)}});`);
		code.push(`${tab(3)}} else {`);
		code.push(`${tab(4)}stream.write(fileUtils.getValuesOf${dataFormat._id}(newBody));`);
		code.push(`${tab(3)}}`);
		code.push(`${tab(3)}stream.end();`);
		code.push(`${tab(3)}csvOutputStream.on('error', err => {`);
		code.push(`${tab(4)}state.status = "ERROR";`);
		code.push(`${tab(4)}state.statusCode = 400;`);
		code.push(`${tab(4)}state.body = err;`);
		code.push(`${tab(4)}state.responseBody = err;`);
		code.push(`${tab(4)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(4)}reject(err);`);
		code.push(`${tab(3)}});`);
		code.push(`${tab(3)}csvOutputStream.on('close', async function() {`);

		if (dataFormat.formatType === 'EXCEL') {
			code.push(`${tab(4)}const wb = XLSX.readFile(filePath, { raw: true });`);
			code.push(`${tab(4)}XLSX.writeFile(wb, filePath, { bookType: 'xlsx', type: 'binary', compression: true });`);
		}
		code.push(`${tab(4)}resolve();`);
		code.push(`${tab(3)}});`);
		code.push(`${tab(2)}});`);
	} else if (dataFormat.formatType === 'JSON') {
		code.push(`${tab(2)}fs.writeFileSync(filePath, JSON.stringify(newBody), 'utf-8');`);
		code.push(`${tab(2)}`);
	} else if (dataFormat.formatType === 'XML') {
		code.push(`${tab(2)}let xmlContent = new XMLBuilder({format: true, arrayNodeName: '${dataFormat.rootNodeName || 'ROOT'}'}).build(newBody);`);
		if (dataFormat.xmlInitFormat) {
			code.push(`${tab(2)}const xmlInitFormat = '${dataFormat.xmlInitFormat}\\r\\n';`);
			code.push(`${tab(2)}xmlContent = xmlInitFormat + xmlContent;`);
		}
		code.push(`${tab(2)}fs.writeFileSync(filePath, xmlContent, 'utf-8');`);
		code.push(`${tab(2)}`);
	} else if (dataFormat.formatType === 'FLATFILE') {
		code.push(`${tab(3)}let content = fileUtils.toFlatFile${node.dataStructure.outgoing._id}(newBody);`);
		code.push(`${tab(2)}fs.writeFileSync(filePath, content, 'utf-8');`);
	}
	code.push(`${tab(2)}state.fileContent = filePath;`);
}
module.exports.parseFlow = parseFlow;
module.exports.parseNodes = parseNodes;
module.exports.parseDataStructures = parseDataStructures;
module.exports.parseDataStructuresForFileUtils = parseDataStructuresForFileUtils;
module.exports.parseDataStructuresForMasking = parseDataStructuresForMasking;