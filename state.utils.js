const log4js = require('log4js');
const _ = require('lodash');

const logger = log4js.getLogger();

function getState(req, stateId) {
	const data = {};
	data.txnId = req.headers['data-stack-txn-id'];
	data.remoteTxnId = req.headers['data-stack-remote-txn-id'];
	data._id = {
		txnId: data.txnId,
		stateId: stateId
	};
	data.headers = req.headers;
	data.body = req.body;
	data.status = 'Init';
	return data;
}

async function upsertState(req, state) {
	const txnId = state.txnId;
	const remoteTxnId = state.remoteTxnId;
	logger.trace(`[${txnId}] [${remoteTxnId}] Starting Upsert Stage: ${JSON.stringify(state._id)}`);
	try {
		await global.appcenterDB.collection('b2b.state').findOneAndUpdate(
			{ _id: {
					txnId: state.txnId,
					stateId: state.stateId
				}
			}, 
			{ $set: state }, 
			{ upsert: true }
		);
		logger.trace(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage: ${JSON.stringify(state._id)}`);
	} catch (err) {
		logger.trace(`[${txnId}] [${remoteTxnId}] Ending Upsert Stage With Error: ${JSON.stringify(state._id)}`);
		logger.error(err);
	}
}

module.exports.getState = getState;
module.exports.upsertState = upsertState;