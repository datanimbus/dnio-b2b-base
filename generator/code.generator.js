// const log4js = require('log4js');
const _ = require('lodash');
const { v4: uuid } = require('uuid');
const config = require('../config');
const commonUtils = require('../common.utils');

let logger = global.logger;

let visitedNodes = [];
let visitedValidation = [];

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

/**
 * 
 * @param {any} dataJson 
 */
function parseFlow(dataJson) {
	visitedNodes = [];
	const inputNode = dataJson.inputNode;
	const nodes = dataJson.nodes;
	let api = '/' + dataJson.app + inputNode.options.path;
	let code = [];
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const express = require(\'express\');');
	code.push('const router = express.Router({ mergeParams: true });');
	code.push('const log4js = require(\'log4js\');');
	code.push('const fileUpload = require(\'express-fileupload\');');
	code.push('const { XMLBuilder, J2XParser, parse, XMLParser } = require(\'fast-xml-parser\');');
	code.push('const fastcsv = require(\'fast-csv\');');
	code.push('const XLSX = require(\'xlsx\');');
	code.push('const { v4: uuid } = require(\'uuid\');');
	code.push('const _ = require(\'lodash\');');
	code.push('const cron = require(\'node-cron\');');
	code.push('');
	code.push('const stateUtils = require(\'./state.utils\');');
	code.push('const nodeUtils = require(\'./node.utils\');');
	code.push('const fileUtils = require(\'./file.utils\');');
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

	if (inputNode.options && inputNode.options.method) {
		let method = inputNode.options.method.toLowerCase();
		code.push(`router.${method}('${api}', handleRequest);`);
	}
	else {
		code.push(`router.post('${api}', handleRequest);`);
	}

	if (inputNode.type === 'TIMER') {
		code.push(`${tab(0)}cron.schedule('${(inputNode.options.cron || '1 * * * *')}', async () => {`);
		code.push(`${tab(1)}try {`);
		code.push(`${tab(2)}const date = new Date();`);
		code.push(`${tab(2)}const options = {};`);
		code.push(`${tab(2)}options.method = 'POST';`);
		// code.push(`${tab(2)}options.url = 'http://localhost:${config.port}/api/b2b${api}';`);
		code.push(`${tab(2)}options.url = '${config.get('bm')}/b2b/pipes${api}';`);
		code.push(`${tab(2)}options.json = { triggerTime: date.toISOString() };`);
		code.push(`${tab(2)}logger.trace({ options });`);
		code.push(`${tab(2)}let response = await httpClient.request(options);`);
		code.push(`${tab(1)}} catch (err) {`);
		code.push(`${tab(2)}logger.error(err);`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(0)}});`);
	}

	code.push('async function handleRequest(req, res) {');
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push(`${tab(1)}let response = req;`);
	code.push(`${tab(1)}let state = stateUtils.getState(response, '${inputNode._id}', false, '${(inputNode.options.contentType || '')}');`);
	code.push(`${tab(1)}let node = {};`);
	code.push(`${tab(1)}node['${inputNode._id}'] = state;`);
	// code.push(`${tab(1)}const ${_.snakeCase(inputNode.name)} = state;`);
	code.push(`${tab(1)}let isResponseSent = false;`);
	if (inputNode.type === 'API') {
		code.push(`${tab(1)}setTimeout(function() {`);
		code.push(`${tab(2)}if (!isResponseSent) {`);
		code.push(`${tab(3)}res.status(202).json({ message: 'Your requested process is taking more then expected time, Please check interactions for final status.' });`);
		code.push(`${tab(3)}isResponseSent = true;`);
		code.push(`${tab(2)}}`);
		code.push(`${tab(1)}}, 30000);`);
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
		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(2)}return;`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { payloadMetaData: reqFile });`);
		const dataFormat = dataJson.dataStructures[inputNode.dataStructure.outgoing._id] || { _id: inputNode.dataStructure.outgoing._id };
		if (!dataFormat.formatType) {
			dataFormat.formatType = 'JSON';
		}
		inputNode.dataStructure.outgoing = dataFormat;
		if (dataFormat.formatType == 'EXCEL') {
			code.push(`${tab(1)}const workBook = XLSX.readFile(reqFile.tempFilePath);`);
			code.push(`${tab(1)}XLSX.writeFile(workBook, reqFile.tempFilePath, { bookType: "csv" });`);
		}

		if (dataFormat.formatType === 'CSV' || dataFormat.formatType == 'EXCEL') {
			code.push(`${tab(1)}logger.debug('Parsing request file to ${inputNode.options.contentType}');`);
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
			code.push(`${tab(3)}headers: true,`);
			code.push(`${tab(3)}skipLines: 0,`);
			code.push(`${tab(3)}rowDelimiter: '${rowDelimiter}',`);
			code.push(`${tab(3)}delimiter: '${dataFormat.character}',`);
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
			code.push(`${tab(3)}stateUtils.upsertState(req, state);`);
			code.push(`${tab(3)}reject(err);`);
			code.push(`${tab(2)}}).on('data', row => records.push(row))`);
			code.push(`${tab(2)}.on('end', rowCount => {`);
			code.push(`${tab(3)}logger.debug('Parsed rows = ', rowCount);`);
			code.push(`${tab(3)}state.totalRecords = rowCount;`);
			code.push(`${tab(3)}state.statusCode = 200;`);
			code.push(`${tab(3)}state.body = records;`);
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
		} else if (dataFormat.formatType === 'XML') {
			code.push(`${tab(2)}const contents = fs.readFileSync(reqFile.tempFilePath, 'utf-8');`);
			code.push(`${tab(2)}state.status = "SUCCESS";`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.body = xmlParser.parse(contents);`);
		} else if (dataFormat.formatType === 'BINARY') {
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

	// code.push(`${tab(2)}response = { statusCode: 200, body: state.body, headers: state.headers };`);
	code.push(`${tab(1)}state.statusCode = 200;`);
	code.push(`${tab(1)}state.status = 'SUCCESS';`);
	code.push(`${tab(1)}response = _.cloneDeep(state);`);
	code.push(`${tab(1)}stateUtils.upsertState(req, state);`);
	// code.push(`${tab(1)}logger.trace(\`[\${txnId}] [\${remoteTxnId}] Input node Request Body - \`, JSON.stringify(state.body));`);
	code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Input node Request Headers - \`, JSON.stringify(state.headers));`);
	let tempNodes = (inputNode.onSuccess || []);
	for (let index = 0; index < tempNodes.length; index++) {
		const ss = tempNodes[index];
		const node = nodes.find(e => e._id === ss._id);
		if (ss.condition) {
			node.condition = ss.condition.replaceAll('{{', '').replaceAll('}}', '').replaceAll('= =', '==');
		}
		// if (visitedNodes.indexOf(node._id) > -1) {
		// 	return;
		// }
		visitedNodes.push(node._id);
		if (node.condition) code.push(`${tab(1)}if (${node.condition}) {`);
		code = code.concat(generateCode(node, nodes));
		if (node.condition) code.push(`${tab(1)}}`);
	}
	if (!tempNodes || tempNodes.length == 0) {
		code.push(`${tab(1)}stateUtils.updateInteraction(req, { status: 'SUCCESS' });`);
	}
	// (inputNode.onSuccess || []).map(ss => {
	// 	const nodeCondition = ss.condition;
	// 	const temp = nodes.find(e => e._id === ss._id);
	// 	temp.condition = nodeCondition;
	// 	return temp;
	// }).forEach((node, i) => {
	// 	if (visitedNodes.indexOf(node._id) > -1) {
	// 		return;
	// 	}
	// 	visitedNodes.push(node._id);
	// 	if (node.condition) code.push(`${tab(1)}if (${node.condition}) {`);
	// 	code = code.concat(generateCode(node, nodes));
	// 	if (node.condition) code.push(`${tab(1)}}`);
	// });
	code.push(`${tab(1)}if (!isResponseSent) {`);
	code.push(`${tab(2)}res.status((response.statusCode || 200)).json(response.body);`);
	code.push(`${tab(2)}isResponseSent = true;`);
	code.push(`${tab(1)}}`);
	code.push('}');
	code.push('module.exports = router;');
	return code.join('\n');
}

/**
 * 
 * @param {any} dataJson 
 */
function generateCode(node, nodes) {
	let code = [];
	code.push(`${tab(1)}\n\n// ═══════════════════ ${node._id} / ${node.name} / ${node.type} ══════════════════════`);
	code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Invoking node :: ${node._id} / ${node.name} / ${node.type}\`);`);
	code.push(`${tab(1)}try {`);
	if (node.type === 'RESPONSE') {
		code.push(`${tab(2)}state = stateUtils.getState(response, '${node._id}', false, '${(node.options.contentType || '')}');`);
		if (node.options && node.options.statusCode) {
			code.push(`${tab(2)}state.statusCode = ${node.options.statusCode};`);
		}
		if (node.options && node.options.body) {
			if (typeof node.options.body == 'object') {
				code.push(`${tab(2)}state.body = JSON.parse(\`${parseBody(node.options.body)}\`);`);
			} else {
				code.push(`${tab(2)}state.body = ${parseBody(node.options.body)};`);
			}
		}
		code.push(`${tab(2)}stateUtils.upsertState(req, state);`);
		code.push(`${tab(2)}state.status = 'SUCCESS';`);
		code.push(`${tab(2)}state.statusCode = 200;`);
		code.push(`${tab(2)}if (!isResponseSent) {`);
		code.push(`${tab(2)}isResponseSent = true;`);
		if (node.options.contentType == 'application/xml') {
			code.push(`${tab(2)}state.xmlContent = xmlBuilder.build(state.body);`);
			code.push(`${tab(2)}res.set('Content-Type','application/xml');`);
			code.push(`${tab(2)}return res.status(state.statusCode).write(state.xmlContent).end();`);
		} else if (node.options.contentType == 'multipart/form-data') {
			// code.push(`${tab(2)}fs.writeFileSync(state.body);`);
			code.push(`${tab(2)}res.set('Content-Type','application/octet-stream');`);
			code.push(`${tab(2)}return res.status(state.statusCode).write(state.body).end();`);
		} else {
			code.push(`${tab(2)}return res.status(state.statusCode).json(state.body);`);
		}
		code.push(`${tab(2)}}`);
	} else {
		code.push(`${tab(2)}state = stateUtils.getState(response, '${node._id}', false, '${(node.options.contentType || '')}');`);
		code.push(`${tab(2)}response = await nodeUtils.${_.camelCase(node._id)}(req, state, node);`);
		code.push(`${tab(2)}if (response.statusCode >= 400) {`);
		if (node.onError && node.onError.length > 0) {
			let tempNodes = (node.onError || []);
			for (let index = 0; index < tempNodes.length; index++) {
				const ss = tempNodes[index];
				const node = nodes.find(e => e._id === ss._id);
				if (ss.condition) {
					node.condition = ss.condition.replaceAll('{{', '').replaceAll('}}', '').replaceAll('= =', '==');
				}
				visitedNodes.push(node._id);
				if (node.condition) code.push(`${tab(1)}if (${node.condition}) {`);
				code = code.concat(generateCode(node, nodes));
				if (node.condition) code.push(`${tab(1)}}`);
			}
		} else {
			code.push(`${tab(3)}if (!isResponseSent) {`);
			code.push(`${tab(4)}isResponseSent = true;`);
			code.push(`${tab(4)}return res.status((response.statusCode || 200)).json({ message: 'Error occured at ${node.name || node._id}' });`);
			code.push(`${tab(3)}}`);
		}
		code.push(`${tab(2)}}`);
	}
	if (node.onSuccess && node.onSuccess.length > 0) {
		let tempNodes = (node.onSuccess || []);
		for (let index = 0; index < tempNodes.length; index++) {
			const ss = tempNodes[index];
			const nextNode = nodes.find(e => e._id === ss._id);
			if (ss.condition) {
				nextNode.condition = ss.condition.replaceAll('{{', '').replaceAll('}}', '').replaceAll('= =', '==');
			}
			if (nextNode && countDuplicates(nextNode._id, visitedNodes) < 3) {
				visitedNodes.push(nextNode._id);
				if (nextNode.condition) code.push(`${tab(1)}if (${nextNode.condition}) {`);
				code = code.concat(generateCode(nextNode, nodes));
				if (nextNode.condition) code.push(`${tab(1)}}`);
			}
		}
	}
	code.push(`${tab(1)}} catch (err) {`);
	code.push(`${tab(2)}logger.error(err);`);
	code.push(`${tab(2)}if (!isResponseSent) {`);
	code.push(`${tab(3)}res.status(500).json({ message: 'Error occured at ${node.name || node._id}' });`);
	code.push(`${tab(3)}isResponseSent = true;`);
	code.push(`${tab(2)}}`);
	code.push(`${tab(1)}} finally {`);
	code.push(`${tab(2)}node['${node._id}'] = state;`);
	code.push(`${tab(2)}try {`);
	code.push(`${tab(3)}let response = await httpClient.request({url:'https://jugnu.in.ngrok.io/postHook', method:'POST', body: JSON.stringify({ stateId:'${node._id}', state })});`);
	code.push(`${tab(2)}} catch(err) {`);
	code.push(`${tab(3)}logger.error('HOOK-ERROR', err);`);
	code.push(`${tab(2)}}`);
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
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const _ = require(\'lodash\');');
	code.push('const { v4: uuid } = require(\'uuid\');');
	code.push('const moment = require(\'moment\');');
	code.push('const { XMLBuilder, parse } = require(\'fast-xml-parser\');');
	code.push('const fastcsv = require(\'fast-csv\');');
	code.push('const XLSX = require(\'xlsx\');');
	code.push('const xlsxPopulate = require(\'xlsx-populate\');');
	code.push('const J2XParser = require(\'fast-xml-parser\').j2xParser;');
	code.push('const { mssql, mysql, psql } = require(\'@appveen/rest-crud\');');
	code.push('');
	code.push('const httpClient = require(\'./http-client\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	code.push('const stateUtils = require(\'./state.utils\');');
	code.push('const validationUtils = require(\'./validation.utils\');');
	code.push('const fileUtils = require(\'./file.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('');
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
		exportsCode.push(`module.exports.${_.camelCase(node._id)} = ${_.camelCase(node._id)};`);
		code.push(`async function ${_.camelCase(node._id)}(req, state, node) {`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Starting ${node.name ? node.name : ''}(${_.camelCase(node._id)}) Node\`);`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Node type :: ${node.type}\`);`);
		// nodeVariables.forEach((item) => {
		// 	code.push(`${tab(1)}const ${_.snakeCase(item.key)} = node['${item.value}'];`);
		// });
		code.push(`${tab(1)}try {`);
		let functionName = 'validate_structure_' + _.camelCase(node._id);
		if (node.type === 'API' || node.type === 'DATASERVICE' || node.type === 'FUNCTION' || node.type === 'FLOW' || node.type === 'AUTH-DATASTACK') {
			code.push(`${tab(2)}const options = {};`);
			code.push(`${tab(2)}let customHeaders = { 'content-type': 'application/json' };`);
			if (node.type === 'DATASERVICE' || node.type === 'FUNCTION' || node.type === 'FLOW' || node.type === 'AUTH-DATASTACK') {
				if (node.options.authorization) {
					if (node.options.authorization.startsWith('node[')) {
						code.push(`${tab(3)}customHeaders['authorization'] = ${node.options.authorization};`);
					} else {
						code.push(`${tab(3)}customHeaders['authorization'] = \`${parseDynamicVariable(node.options.authorization)}\`;`);
					}
				} else {
					code.push(`${tab(2)}if (req.header('authorization')) {`);
					code.push(`${tab(3)}customHeaders['authorization'] = req.header('authorization');`);
					code.push(`${tab(2)}}`);
				}
			}
			code.push(`${tab(2)}let customBody = state.body;`);
			if (node.type === 'API' && node.options) {
				code.push(`${tab(2)}state.url = \`${parseDynamicVariable(node.options.url)}\`;`);
				code.push(`${tab(2)}state.method = '${node.options.method || 'POST'}';`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
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

				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				if (node.options.body && !_.isEmpty(node.options.body)) {
					// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					if (typeof node.options.body == 'object') {
						code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
					} else {
						code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					}
					code.push(`${tab(2)}state.body = customBody;`);
				}
			} else if (node.type === 'DATASERVICE' && node.options.dataService && node.options.dataService._id) {
				code.push(`${tab(2)}const dataService = await commonUtils.getDataService('${node.options.dataService._id}');`);
				if (config.isK8sEnv()) {
					if (node.options.get) {
						const params = [];
						if (node.options.select && node.options.select != '*') {
							params.push(`select=${parseDynamicVariable(node.options.select)}`);
						}
						if (node.options.count) {
							params.push(`count=${parseDynamicVariable(node.options.count)}`);
						}
						if (node.options.page) {
							params.push(`page=${parseDynamicVariable(node.options.page)}`);
						}
						if (!node.options.sort) {
							node.options.sort = '_metadata.lastUpdated';
						}
						params.push(`sort=${parseDynamicVariable(node.options.sort)}`);
						if (!node.options.filter) {
							node.options.filter = '{}';
						}
						if (typeof node.options.filter == 'object') {
							node.options.filter = JSON.stringify(node.options.filter);
						}
						params.push(`filter=${parseDynamicVariable(node.options.filter)}`);
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/?${params.join('&')}\`;`);
					} else if (node.options.delete) {
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/${parseDynamicVariable(node.options.documentId)}\`;`);
					} else {
						code.push(`${tab(2)}state.url = 'http://' + dataService.collectionName.toLowerCase() + '.' + '${config.DATA_STACK_NAMESPACE}' + '-' + dataService.app.toLowerCase() + '/' + dataService.app + dataService.api + \`/utils/bulkUpsert?update=${node.options.update}&insert=${node.options.insert}\`;`);
					}
				} else {
					if (node.options.get) {
						if (!node.options.select || node.options.select == '*') {
							node.options.select = '';
						}
						if (!node.options.count) {
							node.options.count = 10;
						}
						if (!node.options.page) {
							node.options.page = 1;
						}
						if (!node.options.sort) {
							node.options.sort = '_metadata.lastUpdated';
						}
						if (!node.options.filter) {
							node.options.filter = '{}';
						}
						if (typeof node.options.filter == 'object') {
							node.options.filter = JSON.stringify(node.options.filter);
						}
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + \`/?select=${node.options.select}&sort=${node.options.sort}&count=${node.options.count}&page=${node.options.page}&filter=${parseDynamicVariable(node.options.filter)}\`;`);
					} else if (node.options.delete) {
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + \`/${parseDynamicVariable(node.options.documentId)}\`;`);
					} else {
						code.push(`${tab(2)}state.url = 'http://localhost:' + dataService.port + '/' + dataService.app + dataService.api + '/utils/bulkUpsert?update=${node.options.update}&insert=${node.options.insert}';`);
					}
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
				if ((node.options.update || node.options.insert) && node.options.body) {
					// code.push(`${tab(2)}customBody = ${node.options.body};`);
					// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					if (typeof node.options.body == 'object') {
						code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
					} else {
						code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					}
					code.push(`${tab(2)}state.body = customBody;`);
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


				if (node.options.update || node.options.insert) {
					code.push(`${tab(2)}let iterator = [];`);
					code.push(`${tab(2)}if (!Array.isArray(state.body)) {`);
					code.push(`${tab(3)}iterator = _.chunk([state.body], 500);`);
					code.push(`${tab(2)}} else {`);
					code.push(`${tab(3)}iterator = _.chunk(state.body, 500);`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(2)}let batchList = iterator.map((e,i) => {`);
					code.push(`${tab(3)}return {_id: uuid(), seqNo: (i + 1), rows: e, status: 'PENDING' };`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}state.batchList = batchList;`);
				}
				// code.push(`${tab(2)}delete state.body;`);
				// if (node.options.body && !_.isEmpty(node.options.body)) {
				// 	code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
				// }
				// code.push(`${tab(2)}customBody = { docs: state.body };`);
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
				if (node.options.body && !_.isEmpty(node.options.body)) {
					// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					if (typeof node.options.body == 'object') {
						code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
					} else {
						code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					}
					code.push(`${tab(2)}state.body = customBody;`);
				}
			} else if (node.type === 'FLOW') {
				code.push(`${tab(2)}const flow = await commonUtils.getFlow('${node.options._id}');`);
				code.push(`${tab(2)}logger.trace({ flow });`);
				code.push(`${tab(2)}state.url = \`${config.baseUrlBM}/b2b/pipes/\${flow.app}/\${flow.inputNode.options.path}\`;`);
				code.push(`${tab(2)}state.method = \`\${flow.inputNode.options.method || 'POST'}\`;`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				if (node.options.headers && !_.isEmpty(node.options.headers)) {
					code.push(`${tab(2)}customHeaders = JSON.parse(\`${parseHeaders(node.options.headers)}\`);`);
				}
				if (node.options.body && !_.isEmpty(node.options.body)) {
					// code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					if (typeof node.options.body == 'object') {
						code.push(`${tab(2)}customBody = JSON.parse(\`${parseBody(node.options.body)}\`);`);
					} else {
						code.push(`${tab(2)}customBody = ${parseBody(node.options.body)};`);
					}
					code.push(`${tab(2)}state.body = customBody;`);
				}
			} else if (node.type === 'AUTH-DATASTACK') {
				code.push(`${tab(2)}const password = '${node.options.password}'`);
				code.push(`${tab(2)}state.url = '${config.baseUrlUSR}/auth/login'`);
				code.push(`${tab(2)}state.method = 'POST';`);
				code.push(`${tab(2)}options.url = state.url;`);
				code.push(`${tab(2)}options.method = state.method;`);
				code.push(`${tab(2)}customHeaders = state.headers;`);
				code.push(`${tab(2)}customBody = { username: '${node.options.username}', password: '${node.options.password}' };`);
			}
			code.push(`${tab(2)}options.headers = _.merge(state.headers, customHeaders);`);
			code.push(`${tab(2)}delete options.headers['cookie'];`);
			code.push(`${tab(2)}delete options.headers['host'];`);
			code.push(`${tab(2)}delete options.headers['connection'];`);
			code.push(`${tab(2)}delete options.headers['user-agent'];`);
			code.push(`${tab(2)}delete options.headers['content-length'];`);
			code.push(`${tab(2)}delete options.headers['content-encoding'];`);
			code.push(`${tab(2)}delete options.headers['transfer-encoding'];`);

			if (node.type === 'DATASERVICE' && (node.options.update || node.options.insert)) {
				if (!node.options.fields) {
					node.options.fields = '_id';
				}
				code.push(`${tab(2)}let results = [];`);
				code.push(`${tab(2)}await state.batchList.reduce(async (prev, curr) => {`);
				code.push(`${tab(3)}await prev;`);
				code.push(`${tab(3)}if (!curr) { return; }`);
				code.push(`${tab(3)}if (options.method == 'POST' || options.method == 'PUT') {`);
				code.push(`${tab(4)}options.json = { keys: [${node.options.fields.split(',').map(e => `'${e}'`).join(',') || ''}], docs: curr.rows };`);
				code.push(`${tab(3)}}`);
				code.push(`${tab(3)}try {`);
				code.push(`${tab(4)}logger.trace(JSON.stringify(options, null, 4));`);
				code.push(`${tab(4)}let response = await httpClient.request(options);`);
				code.push(`${tab(4)}results.push(response);`);
				code.push(`${tab(4)}curr.statusCode = response.statusCode;`);
				code.push(`${tab(4)}curr.headers = response.headers;`);
				code.push(`${tab(4)}curr.responseBody = response.body;`);
				code.push(`${tab(3)}} catch(err) {`);
				code.push(`${tab(4)}results.push(err);`);
				code.push(`${tab(4)}curr.statusCode = err.statusCode;`);
				code.push(`${tab(4)}curr.headers = err.headers;`);
				code.push(`${tab(4)}curr.responseBody = err.body;`);
				code.push(`${tab(3)}}`);
				code.push(`${tab(2)}}, Promise.resolve());`);
				// code.push(`${tab(2)}logger.trace(results);`);
				code.push(`${tab(2)}const finalRecords = _.flatten(results.map(e => e.body));`);
				code.push(`${tab(2)}const finalHeader = Object.assign.apply({}, _.flatten(results.map(e => e.headers)));`);
				code.push(`${tab(2)}let response = _.cloneDeep(state);`);
			} else {
				code.push(`${tab(2)}if (options.method == 'POST' || options.method == 'PUT') {`);
				code.push(`${tab(3)}options.json = customBody;`);
				code.push(`${tab(2)}}`);
				code.push(`${tab(2)}logger.trace({ options });`);
				code.push(`${tab(2)}let response = await httpClient.request(options);`);
				code.push(`${tab(2)}const finalRecords = response.body;`);
				code.push(`${tab(2)}const finalHeader = response.headers;`);
			}
			// code.push(`${tab(2)}response = { statusCode: 200, body: finalRecords, headers: finalHeader }`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.responseBody = response.body;`);
			code.push(`${tab(2)}state.responseHeaders = response.headers;`);
			code.push(`${tab(2)}response.body = finalRecords;`);
			code.push(`${tab(2)}response.headers = finalHeader;`);

			// code.push(`${tab(2)}if (options.method == 'POST' || options.method == 'PUT') {`);
			// code.push(`${tab(3)}options.json = customBody;`);
			// code.push(`${tab(2)}}`);

			// code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Request URL of ${_.camelCase(node._id)} \`, options.url);`);
			// code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Request Data of ${_.camelCase(node._id)} \`, JSON.stringify(options));`);
			// code.push(`${tab(2)}let response = await httpClient.request(options);`);


			code.push(`${tab(2)}commonUtils.handleResponse(response, state, req, node);`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Response Status Code of ${_.camelCase(node._id)} \`, state.statusCode);`);
			code.push(`${tab(2)}logger.trace(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Response Data of ${_.camelCase(node._id)} \`, JSON.stringify(state));`);
			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id && node.dataStructure.outgoing.strictValidation) {
				code.push(`${tab(2)}if (state.statusCode == 200) {`);
				code.push(`${tab(3)}const errors = validationUtils.${functionName}(req, response.body);`);
				code.push(`${tab(3)}commonUtils.handleValidation(errors, state, req, node);`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}if (state.statusCode != 200) {`);
			code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(node._id)} Node with not 200\`, response.statusCode);`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(node._id)} Node with 200\`);`);
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: state.statusCode, body: state.body, headers: state.headers };`);
		} else if ((node.type === 'TRANSFORM' || node.type === 'MAPPING') && node.mappings) {
			code.push(`${tab(2)}let newBody = {};`);
			node.mappings.forEach(mappingData => {
				const formulaCode = [];
				const formulaID = 'formula_' + _.camelCase(uuid());
				mappingData.formulaID = formulaID;
				formulaCode.push(`function ${formulaID}(data) {`);
				mappingData.source.forEach((source, i) => {
					formulaCode.push(`let input${i + 1} =  _.get(data, '${source.dataPath}');`);
				});
				if (mappingData.formula) {
					formulaCode.push(mappingData.formula);
				} else if (mappingData.source && mappingData.source.length > 0) {
					formulaCode.push('return input1;');
				}
				formulaCode.push('}');
				code.push(formulaCode.join('\n'));
			});
			code.push(`${tab(2)}if (Array.isArray(state.body)) {`);
			code.push(`${tab(2)}newBody = [];`);
			code.push(`${tab(3)}state.body.forEach(item => {`);
			code.push(`${tab(2)}let tempBody = {};`);
			node.mappings.forEach(mappingData => {
				code.push(`${tab(4)}_.set(tempBody, '${mappingData.target.dataPath}', ${mappingData.formulaID}(item));`);
			});
			code.push(`${tab(2)}newBody.push(tempBody);`);
			code.push(`${tab(3)}});`);
			code.push(`${tab(2)}} else {`);
			node.mappings.forEach(mappingData => {
				code.push(`${tab(3)}_.set(newBody, '${mappingData.target.dataPath}', ${mappingData.formulaID}(state.body));`);
			});
			code.push(`${tab(2)}}`);

			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id && node.dataStructure.outgoing.strictValidation) {
				code.push(`${tab(2)}const errors = validationUtils.${functionName}(req, newBody);`);
				code.push(`${tab(2)}if (errors) {`);
				code.push(`${tab(3)}state.status = "ERROR";`);
				code.push(`${tab(3)}state.statusCode = 400;`);
				code.push(`${tab(3)}state.body = { message: errors };`);
				code.push(`${tab(3)}logger.error(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Error ${_.camelCase(node._id)} \`, errors);`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(node._id)} Node with not 200\`);`);
				code.push(`${tab(3)}return _.cloneDeep(state);`);
				// code.push(`${tab(3)}return { statusCode: 400, body: { message: errors }, headers: response.headers };`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.body = _.cloneDeep(newBody);`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: newBody, headers: state.headers };`);
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
				code.push(`${tab(3)}state.body = { message: errors };`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Error ${_.camelCase(node._id)} \`, errors);`);
				code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(node._id)} Node with not 200\`);`);
				code.push(`${tab(3)}return _.cloneDeep(state);`);
				code.push(`${tab(2)}}`);
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = newBody;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'CODEBLOCK' && node.options.code) {
			code.push(`${tab(2)}${node.options.code}`);
			code.push(`${tab(2)}let response = await execute(state, node);`);
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}state.responseBody = response.responseBody;`);
			code.push(`${tab(2)}state.headers = response.headers;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'CONNECTOR' && node.options.connector && node.options.connector._id) {
			const connector = await commonUtils.getConnector(node.options.connector._id);
			if (connector.type == 'SFTP') {
				code.push(`${tab(2)}const body = state.body;`);
				code.push(`${tab(2)}state.body = {};`);
				let ext = '.json';
				if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
					if (node.dataStructure.outgoing.formatType) {
						ext = '.' + _.lowerCase(node.dataStructure.outgoing.formatType);
					}
				}
				code.push(`${tab(2)}const connectorConfig = ${JSON.stringify(connector.values)};`);
				code.push(`${tab(2)}connectorConfig.directoryPath = \`${parseDynamicVariable(node.options.directoryPath)}\`;`);
				code.push(`${tab(2)}connectorConfig.fileName = (\`${parseDynamicVariable(node.options.fileName) || ''}\` || '${uuid()}') + '${ext}';`);
				code.push(`${tab(2)}state.body.sourceFilePath = path.join(__dirname, 'SFTP-Files', connectorConfig.fileName);`);
				code.push(`${tab(2)}state.body.targetFilePath = path.join(connectorConfig.directoryPath, connectorConfig.fileName);`);
				let fileCreated = false;
				if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
					if (node.dataStructure.outgoing.formatType) {
						if (node.dataStructure.outgoing.formatType == 'CSV') {
							fileCreated = true;
							code.push(`${tab(2)}const headers = fileUtils.getHeaderOf${node.dataStructure.outgoing._id}();`);
							code.push(`${tab(2)}await commonUtils.writeDataToCSV(state.body.sourceFilePath, body, headers);`);
						} else if (node.dataStructure.outgoing.formatType == 'XML') {
							fileCreated = true;
							code.push(`${tab(2)}state.xmlContent = xmlBuilder.build(body);`);
							code.push(`${tab(2)}fs.writeFileSync(state.body.sourceFilePath, state.xmlContent);`);
						} else if (node.dataStructure.outgoing.formatType == 'EXCEL') {
							fileCreated = true;
							code.push(`${tab(2)}await commonUtils.writeDataToXLS(state.body.sourceFilePath, body);`);
						}
					}
				}
				if (!fileCreated) {
					code.push(`${tab(2)}fs.writeFileSync(state.body.sourceFilePath, JSON.stringify(body));`);
				}
				code.push(`${tab(2)}await commonUtils.sftpPutFile(connectorConfig, state.body.sourceFilePath);`);
				code.push(`${tab(2)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] File Path \${state.body.sourceFilePath} \`);`);
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
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.status = 'SUCCESS';`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
		} else if (node.type === 'FILE') {
			code.push(`${tab(2)}let customBody = state.body;`);
			let ext = '.json';
			if (node.dataStructure && node.dataStructure.outgoing && node.dataStructure.outgoing._id) {
				if (dataFormat.formatType) {
					ext = '.' + _.lowerCase(dataFormat.formatType);
				}
			}
			code.push(`${tab(2)}let ext = '${ext}';`);
			code.push(`${tab(2)}let outputFileName;`);
			code.push(`${tab(2)}if (req.header('output-file-name') != null && req.header('output-file-name') != '') {`);
			code.push(`${tab(3)}outputFileName = req.header('output-file-name');`);
			code.push(`${tab(2)}} else {`);
			code.push(`${tab(3)}const remoteTxnId = req.header('data-stack-remote-txn-id');`);
			code.push(`${tab(3)}const temp = remoteTxnId.split(".");`);
			code.push(`${tab(3)}if (ext === temp[1]) {`);
			code.push(`${tab(4)}outputFileName = req.header('data-stack-remote-txn-id').toString();`);
			code.push(`${tab(3)}} else {`);
			code.push(`${tab(4)} outputFileName = temp[0] + ext;`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}const uploadFilePath = path.join(process.cwd(), 'uploads', outputFileName);`);
			code.push(`${tab(2)}let fileDetails;`);

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

				if (dataFormat.formatType === 'EXCEL') {
					code.push(`${tab(2)}const wb = XLSX.readFile(uploadFilePath, { raw: true });`);
					code.push(`${tab(2)}XLSX.writeFile(wb, uploadFilePath, { bookType: '${dataFormat.excelType.toLowerCase()}', type: 'string' });`);
					code.push(`${tab(2)}fileDetails = commonUtils.uploadFileToDB(req, uploadFilePath, '${node.options.agents[0].agentId}', '${node.options.agents[0].name}', '${pNode.name}','${pNode.deploymentName}', outputFileName);`);
				} else {
					code.push(`${tab(2)}const csvOutputStream = fs.createWriteStream(uploadFilePath);`);
					code.push(`${tab(2)}const stream = fastcsv.format({ rowDelimiter: '${rowDelimiter}', delimiter: '${delimiter}', ${dataFormat.formatType === 'DELIMITER' ? 'quote: false' : ''} });`);
					code.push(`${tab(2)}stream.pipe(csvOutputStream);`);
					// code.push(`${tab(2)}const generateHeaders = ${node.meta.generateHeaders || false};`);
					// code.push(`${tab(2)}if (generateHeaders) {`);
					// code.push(`${tab(2)}stream.write(fileUtils.getHeaderOf${dataFormat._id}());`);
					// code.push(`${tab(2)}}`);
					code.push(`${tab(2)}if (Array.isArray(customBody)) {`);
					code.push(`${tab(3)}customBody.forEach(data => {`);
					code.push(`${tab(3)}stream.write(fileUtils.getValuesOf${dataFormat._id}(data));`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}} else {`);
					code.push(`${tab(3)}stream.write(fileUtils.getValuesOf${dataFormat._id}(customBody));`);
					code.push(`${tab(2)}}`);
					code.push(`${tab(2)}stream.end();`);
					code.push(`${tab(2)}csvOutputStream.on('close', async function() {`);
					code.push(`${tab(3)}fileDetails = commonUtils.uploadFileToDB(req, uploadFilePath, '${node.options.agents[0].agentId}', '${node.options.agents[0].name}', '${pNode.name}','${pNode.deploymentName}', outputFileName);`);
					code.push(`${tab(2)}});`);
				}
			} else if (dataFormat.formatType === 'JSON') {
				code.push(`${tab(2)}fs.writeFileSync(uploadFilePath, JSON.stringify(customBody), 'utf-8');`);
				code.push(`${tab(2)}fileDetails = commonUtils.uploadFileToDB(req, uploadFilePath, '${node.options.agents[0].agentId}', '${node.options.agents[0].name}', '${pNode.name}','${pNode.deploymentName}', outputFileName);`);
			} else if (dataFormat.formatType === 'XML') {
				code.push(`${tab(2)}let xmlContent = new XMLBuilder({format: true,arrayNodeName: '${dataFormat.rootNodeName}'}).build(customBody);`);
				if (dataFormat.xmlInitFormat) {
					code.push(`${tab(2)}const xmlInitFormat = '${dataFormat.xmlInitFormat}\\r\\n';`);
					code.push(`${tab(2)}xmlContent = xmlInitFormat + xmlContent;`);
				}
				code.push(`${tab(2)}fs.writeFileSync(uploadFilePath, xmlContent, 'utf-8');`);
				code.push(`${tab(2)}fileDetails = commonUtils.uploadFileToDB(req, uploadFilePath, '${node.options.agents[0].agentId}', '${node.options.agents[0].name}', '${pNode.name}','${pNode.deploymentName}', outputFileName);`);
			}
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}state.responseBody = fileDetails;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		} else {
			code.push(`${tab(2)}state.statusCode = 200;`);
			code.push(`${tab(2)}return _.cloneDeep(state);`);
			// code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		}
		code.push(`${tab(1)}} catch (err) {`);
		code.push(`${tab(2)}commonUtils.handleError(err, state, req, node);`);
		code.push(`${tab(2)}logger.error(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(node._id)} Node with\`,state.statusCode);`);
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
			code.push(`let schema_${schemaID} = fs.readFileSync(\`./schemas/${schemaID}.schema.json\`).toString();`);
			code.push(`schema_${schemaID} = JSON.parse(schema_${schemaID});`);
			code.push(`const validate_${schemaID} = ajv.compile(schema_${schemaID});`);
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
	const functionName = 'validate_structure_' + _.camelCase(node._id);
	exportsCode.push(`module.exports.${functionName} = ${functionName};`);
	code.push(`function ${functionName}(req, data) {`);
	if (schemaID) {
		code.push(`${tab(1)}const errors = {};`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Validation Data Structure ${_.camelCase(node._id)} Node\`);`);
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
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] No Data Structure found for ${_.camelCase(node._id)} Node\`);`);
	}
	code.push(`${tab(1)}return null;`);
	code.push('}');
	// let tempNodes = (node.onSuccess || []);
	// for (let index = 0; index < tempNodes.length; index++) {
	// 	const ss = tempNodes[index];
	// 	const nextNode = nodes.find(e => e._id === ss._id);
	// 	if (visitedValidation.indexOf(nextNode._id) > -1) {
	// 		return;
	// 	}
	// 	visitedValidation.push(nextNode._id);
	// 	code = code.concat(generateDataStructures(nextNode, nodes));
	// }
	return _.concat(code, exportsCode).join('\n');
}


function parseDataStructuresForFileUtils(dataJson) {
	const code = [];
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
				code.push(`${tab(1)}values.push(_.get(data, '${properties.dataKey}') || '');`);
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

			code.push(`module.exports.getValuesOf${schemaId} = getValuesOf${schemaId};`);
			code.push(`module.exports.getHeaderOf${schemaId} = getHeaderOf${schemaId};`);
			code.push(`module.exports.convertData${schemaId} = convertData${schemaId};`);
		});
	}
	return code.join('\n');
}




module.exports.parseFlow = parseFlow;
module.exports.parseNodes = parseNodes;
module.exports.parseDataStructures = parseDataStructures;
module.exports.parseDataStructuresForFileUtils = parseDataStructuresForFileUtils;