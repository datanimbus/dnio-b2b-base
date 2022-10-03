const log4js = require('log4js');
const { v4: uuid } = require('uuid');
const Async = require('async');

const httpClient = require('./http-client');
const config = require('./config');

const logger = log4js.getLogger(global.loggerName);
const interactionQueue = Async.priorityQueue(processInteraction);

function getState(req, nodeId, isChild) {
	const data = {};
	data._id = uuid();
	data.nodeId = nodeId;
	data.txnId = isChild ? uuid() : req.headers['data-stack-txn-id'];
	data.remoteTxnId = req.headers['data-stack-remote-txn-id'];
	data.parentTxnId = isChild ? req.headers['data-stack-txn-id'] : null;
	data.headers = req.headers;
	data.body = req.body;
	data.query = req.query;
	data.interactionId = req.query.interactionId;
	data.status = 'PENDING';
	return data;
}

async function upsertState(req, state) {
	const txnId = state.txnId;
	const remoteTxnId = state.remoteTxnId;
	const interactionId = req.query.interactionId;
	logger.debug(`[${txnId}] [${remoteTxnId}] Starting Upsert Stage: ${JSON.stringify(state._id)}`);
	try {
		await global.appcenterDB.collection('b2b.node.state').findOneAndUpdate(
			{ nodeId: state.nodeId, txnId: state.txnId, remoteTxnId: state.remoteTxnId, parentTxnId: state.parentTxnId },
			{ $set: state },
			{ upsert: true }
		);
		if (state.status == 'ERROR') {
			logger.debug(`[${txnId}] [${remoteTxnId}] Setting Interaction State To Error: ${interactionId}`);
			await updateInteraction(req, { status: state.status });
		}
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage: ${JSON.stringify(state._id)}`);
	} catch (err) {
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage With Error: ${JSON.stringify(state._id)}`);
		logger.error(err);
	}
}

async function updateInteraction(req, data) {
	try {
		interactionQueue.push({ req, data });
	} catch (err) {
		logger.error(err);
	}
}

async function processInteraction(task, callback) {
	const req = task.req;
	const data = task.data;
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	const interactionId = req.query.interactionId;
	const b2bURL = `${config.baseUrlBM}/${config.app}/interaction/${interactionId}`;
	logger.debug(`[${txnId}] [${remoteTxnId}] Starting Update Interaction: ${interactionId}`);
	try {
		const status = await httpClient.request({
			method: 'PUT',
			url: b2bURL,
			json: data,
			headers: {
				'authorization': 'JWT ' + global.BM_TOKEN
			}
		})
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Update Interaction: ${interactionId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] ${status.statusCode} ${status.body}`);
		callback();
	} catch (err) {
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Update Interaction With Error: ${interactionId}`);
		logger.error(err);
		callback(err);
	}
}

module.exports.getState = getState;
module.exports.upsertState = upsertState;
module.exports.updateInteraction = updateInteraction;