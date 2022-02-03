const log4js = require('log4js');
const _ = require('lodash');

const logger = log4js.getLogger();

function getState(req, stateId) {
	const data = {};
	data._id = stateId;
	data.txnId = req.header('data-stack-txn-id');
	data.headers = req.headers;
	data.body = req.body;
	data.status = 'Init';
	return data;
}

async function upsertState(req, state) {
	const txnId = req.header('data-stack-txn-id');
	const remoteTxnId = req.header('data-stack-remote-txn-id');
	logger.info(`[${txnId}] [${remoteTxnId}] Starting Upsert Stage: ${_.camelCase(state._id)}`);
	try {
		await global.appcenterDB.collection('b2b.state').findOneAndUpdate({ stageId: state._id, dataStackTxnId: txnId }, { $set: state }, { upsert: true });
		logger.info(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage: ${_.camelCase(state._id)}`);
	} catch (err) {
		logger.info(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage With Error: ${_.camelCase(state._id)}`);
		logger.error(err);
	}
}

module.exports.getState = getState;
module.exports.upsertState = upsertState;