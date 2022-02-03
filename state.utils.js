const log4js = require('log4js');
const _ = require('lodash');

const logger = log4js.getLogger();

function getState(req, stateId) {
	const data = {};
	data._id = stateId;
	data.txnId = req.headers['data-stack-txn-id'];
	data.remoteTxnId = req.headers['data-stack-remote-txn-id'];
	data.headers = req.headers;
	data.body = req.body;
	data.status = 'Init';
	logger.debug(`${data._id} TXN ID: ${data.txnId}`);
	logger.debug(`${data._id} TXN ID: ${data.remoteTxnId}`);
	return data;
}

async function upsertState(req, state) {
	const txnId = state.txnId;
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	logger.trace(`[${txnId}] [${remoteTxnId}] Starting Upsert Stage: ${_.camelCase(state._id)}`);
	try {
		await global.appcenterDB.collection('b2b.state').findOneAndUpdate({ stageId: state._id, dataStackTxnId: txnId }, { $set: state }, { upsert: true });
		logger.trace(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage: ${_.camelCase(state._id)}`);
	} catch (err) {
		logger.trace(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage With Error: ${_.camelCase(state._id)}`);
		logger.error(err);
	}
}

module.exports.getState = getState;
module.exports.upsertState = upsertState;