// const log4js = require('log4js');
const _ = require('lodash');

// const logger = log4js.getLogger(global.loggerName);

const visitedStages = [];

function tab(len) {
	let d = '';
	while (len > 0) {
		d += '  ';
		len--;
	}
	return d;
}

/**
 * 
 * @param {any} dataJson 
 */
function parseFlow(dataJson) {
	const inputStage = dataJson.inputStage;
	const stages = dataJson.stages;
	let api = inputStage.incoming.path;
	let code = [];
	code.push(`const router = require(\'express\').Router();`);
	code.push(`const log4js = require(\'log4js\');`);
	code.push(``);
	code.push(`const stateUtils = require(\'./state.utils\');`);
	code.push(`const stageUtils = require(\'./stage.utils\');`);
	code.push(``);
	code.push(`const logger = log4js.getLogger(global.loggerName);`);
	code.push(``);
	// TODO: Method to be fixed.
	code.push(`router.post('${api}', async function (req, res) {`);
	code.push(`${tab(1)}let txnId = req.headers['data-stack-txn-id'];`);
	code.push(`${tab(1)}let remoteTxnId = req.headers['data-stack-remote-txn-id'];`);
	code.push(`${tab(1)}let state = {};`);
	code.push(`${tab(1)}let tempResponse = req;`);
	inputStage.onSuccess.map(ss => stages.find(e => e._id === ss._id)).forEach((stage, i) => {
		if (visitedStages.indexOf(stage._id) > -1) {
			return;
		}
		visitedStages.push(stage._id);
		code = code.concat(generateCode(stage, stages));
	});
	code.push(`});`);
	code.push(`module.exports = router;`);
	return code.join('\n');
}

/**
 * 
 * @param {any} dataJson 
 */
function generateCode(stage, stages) {
	let code = [];
	code.push(`${tab(1)}// ═══════════════════ ${stage._id} / ${stage.name} / ${stage.type} ══════════════════════`);
	code.push(`${tab(1)}logger.debug(\`[\${txnId}] [\${remoteTxnId}] Invoking stage :: ${stage._id} / ${stage.name} / ${stage.type}\`)`);
	code.push(`${tab(1)}state = stateUtils.getState(tempResponse, '${stage._id}');`);
	code.push(`${tab(1)}try {`);
	code.push(`${tab(2)}tempResponse = await stageUtils.${_.camelCase(stage._id)}(req, state);`);
	code.push(`${tab(2)}state.statusCode = tempResponse.statusCode;`);
	code.push(`${tab(2)}state.body = tempResponse.body;`);
	code.push(`${tab(2)}if (tempResponse.statusCode >= 400) {`);
	code.push(`${tab(3)}state.status = "ERROR";`);
	code.push(`${tab(3)}await stateUtils.upsertState(req, state);`);
	if (stage.onError && stage.onError.length > 0) {
		code.push(`${tab(3)}state = stateUtils.getState(tempResponse, '${stage.onError._id}');`);
		code.push(`${tab(3)}tempResponse = await stageUtils.${_.camelCase(stage.onError._id)}(req, state);`);
	} else {
		code.push(`${tab(3)}return res.status(tempResponse.statusCode).json(tempResponse.body)`);
	}
	code.push(`${tab(2)}}`);
	code.push(`${tab(2)}state.status = "SUCCESS";`);
	code.push(`${tab(2)}await stateUtils.upsertState(req, state);`);
	code.push(`${tab(1)}} catch (err) {`);
	code.push(`${tab(2)}logger.error(err);`);
	code.push(`${tab(2)}return res.status(500).json({ message: err.message });`);
	code.push(`${tab(1)}}`);
	stage.onSuccess.map(ss => stages.find(e => e._id === ss._id)).forEach((stage, i) => {
		if (visitedStages.indexOf(stage._id) > -1) {
			return;
		}
		visitedStages.push(stage._id);
		code = code.concat(generateCode(stage, stages));
	});
	return code.join('\n');
}

function parseStages(dataJson) {
	const code = [];
	code.push(`const log4js = require(\'log4js\');`);
	code.push(`const _ = require(\'lodash\');`);
	code.push(`const httpClient = require(\'./http-client\');`);
	code.push(``);
	code.push(`const logger = log4js.getLogger(global.loggerName);`);
	code.push(``);
	return _.concat(code, generateStages(dataJson)).join('\n');
}


function generateStages(stage) {
	const stages = stage.stages;
	let code = [];
	const exportsCode = [];
	stages.forEach((stage) => {
		exportsCode.push(`module.exports.${_.camelCase(stage._id)} = ${_.camelCase(stage._id)};`);
		code.push(`async function ${_.camelCase(stage._id)}(req, state) {`);
		code.push(`${tab(1)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Starting ${_.camelCase(stage._id)} Stage\`);`);
		code.push(`${tab(1)}try {`);
		if ((stage.type === 'API' || stage.type === 'FAAS' || stage.type === 'DATA_SERVICE') && stage.outgoing) {
			code.push(`${tab(2)}const options = {};`);
			code.push(`${tab(2)}state.url = '${stage.outgoing.url}';`);
			code.push(`${tab(2)}state.method = '${stage.outgoing.method}';`);
			code.push(`${tab(2)}options.url = '${stage.outgoing.url}';`);
			code.push(`${tab(2)}options.method = '${stage.outgoing.method}';`);
			code.push(`${tab(2)}options.headers = _.merge(state.headers, ${JSON.stringify(stage.outgoing.headers)});`);
			code.push(`${tab(2)}options.json = state.body;`);
			code.push(`${tab(2)}try {`);
			code.push(`${tab(3)}const tempResponse = await httpClient.request(options);`);
			code.push(`${tab(3)}if (tempResponse && tempResponse.statusCode != 200) {`);
			code.push(`${tab(4)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(stage._id)} Stage with not 200\`);`);
			code.push(`${tab(4)}return { statusCode: tempResponse.statusCode, body: tempResponse.body, headers: tempResponse.headers };`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(stage._id)} Stage with 200\`);`);
			code.push(`${tab(3)}return { statusCode: tempResponse.statusCode, body: tempResponse.body, headers: tempResponse.headers };`);
			code.push(`${tab(2)}} catch (err) {`);
			code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(stage._id)} Stage with Error\`);`);
			code.push(`${tab(3)}logger.error(err);`);
			code.push(`${tab(3)}return { statusCode: 500, body: err, headers: options.headers };`);
			code.push(`${tab(2)}}`);
		} else if (stage.type === 'TRANSFORM' && stage.mapping) {
			code.push(`${tab(2)}const newBody = {};`);
			code.push(`${tab(2)}if (Array.isArray(state.body)) {`);
			code.push(`${tab(3)}state.body.forEach(stage => {`);
			stage.mapping.forEach(stage => {
				code.push(`${tab(4)}_.set(newBody, '${stage.target}', _.get(stage, '${stage.source[0]}'));`);
			});
			code.push(`${tab(3)}});`);
			code.push(`${tab(2)}} else {`);
			stage.mapping.forEach(stage => {
				code.push(`${tab(3)}_.set(newBody, '${stage.target}', _.get(state.body, '${stage.source[0]}'));`);
			});
			code.push(`${tab(2)}}`);
			code.push(`${tab(2)}return { statusCode: 200, body: newBody, headers: state.headers };`);
		} else if (stage.type === 'FLOW') {
			if (stage.parallel && stage.parallel.length > 0) {
				code.push(`${tab(2)}let promiseArray = [];`);
				stage.parallel.forEach(flow => {
					code.push(`${tab(2)}promiseArray.push(callFlow('${flow._id}', state))`);
				});
				code.push(`${tab(2)}const promises = await Promise.all(promiseArray)`);
				code.push(`${tab(2)}const allBody = promises.map(e=>e.body)`);
				code.push(`${tab(2)}const allHeaders = promises.reduce((prev,curr)=>_.merge(prev,curr.headers),{})`);
				code.push(`${tab(2)}return { statusCode: 200, body: allBody, headers: allHeaders };`);
			} else if (stage.sequence && stage.sequence.length > 0) {
				code.push(`${tab(2)}let tempResponse = state;`);
				stage.sequence.forEach(flow => {
					code.push(`${tab(2)}tempResponse = await callFlow('${flow._id}', tempResponse)`);
					code.push(`${tab(2)}if( tempResponse && tempResponse.statusCode != 200 ) {`);
					code.push(`${tab(3)}logger.info(\`[\${req.header('data-stack-txn-id')}] [\${req.header('data-stack-remote-txn-id')}] Ending ${_.camelCase(stage._id)} Stage with not 200\`);`);
					code.push(`${tab(3)}return { statusCode: tempResponse.statusCode, body: tempResponse.body, headers: tempResponse.headers };`);
					code.push(`${tab(2)}}`);
				});
			}
		} else if (stage.type === 'FOREACH' || stage.type === 'REDUCE') {
			code = _.concat(code, generateStages(stage));
		} else {
			code.push(`${tab(2)}return { statusCode: 200, body: state.body, headers: state.headers };`);
		}
		code.push(`${tab(1)}} catch (err) {`);
		code.push(`${tab(2)}logger.error(err);`);
		code.push(`${tab(2)}return { statusCode: 500, body: err, headers: state.headers };`);
		code.push(`${tab(1)}}`);
		code.push(`}`);
	});
	return _.concat(code, exportsCode).join('\n');
}




module.exports.parseFlow = parseFlow;
module.exports.parseStages = parseStages;