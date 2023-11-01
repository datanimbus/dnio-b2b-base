const log4js = require('log4js');
const { v4: uuid } = require('uuid');
const Async = require('async');
const mongoose = require('mongoose');
const _ = require('lodash');

const httpClient = require('../http-client');
const config = require('../config');
const maskingUtils = require('./masking.utils');


const logger = log4js.getLogger(global.loggerName);
const interactionQueue = Async.priorityQueue(processInteraction);

global.interactionQueue = interactionQueue;

function getState(req, nodeId, isChild, contentType) {
	const data = {};
	data._id = uuid();
	data.flowId = config.flowId;
	data.nodeId = nodeId;
	// data.txnId = isChild ? uuid() : req.headers['data-stack-txn-id'];
	// data.remoteTxnId = req.headers['data-stack-remote-txn-id'];
	// data.parentTxnId = isChild ? req.headers['data-stack-txn-id'] : null;
	data.headers = req.headers;
	logger.trace(`State :: ${nodeId} :: Headers :: ${JSON.stringify(req.headers)}`);
	if (req.responseBody) {
		data.body = req.responseBody;
	} else {
		data.body = req.body;
	}
	data.fileContent = req.fileContent;
	logger.trace(`State :: ${nodeId} :: Body :: ${JSON.stringify(req.body)}`);
	data.params = req.params;
	data.query = req.query;
	logger.trace(`State :: ${nodeId} :: Query :: ${JSON.stringify(req.query)}`);
	data.interactionId = req.query.interactionId;
	data.status = 'PENDING';
	data.contentType = contentType || 'application/json';
	data._metadata = {
		createdAt: new Date(),
		lastUpdated: new Date(),
		deleted: false
	};
	if (req.statusCode) {
		data.statusCode = req.statusCode;
	} else {
		data.statusCode = 500;
	}
	data.outputFileName = req.outputFileName;
	return data;
}

async function upsertState(req, state) {
	const txnId = req.headers['data-stack-txn-id'];
	const remoteTxnId = req.headers['data-stack-remote-txn-id'];
	const interactionId = req.query.interactionId;
	const clonedState = JSON.parse(JSON.stringify(state));

	doMaskingOfData(clonedState);

	const nodeStatePayload = {};
	nodeStatePayload.flowId = state.flowId;
	nodeStatePayload.nodeId = state.nodeId;
	nodeStatePayload.interactionId = interactionId;
	nodeStatePayload._metadata = _.cloneDeep(clonedState._metadata);
	nodeStatePayload._metadata.lastUpdated = new Date();

	const nodeDataPayload = _.cloneDeep(nodeStatePayload);
	nodeDataPayload.incoming = {};
	nodeDataPayload.incoming.headers = _.cloneDeep(clonedState.requestHeaders);
	nodeDataPayload.incoming.body = _.cloneDeep(clonedState.body);
	nodeDataPayload.outgoing = {};
	nodeDataPayload.outgoing.headers = _.cloneDeep(clonedState.headers);
	nodeDataPayload.outgoing.body = _.cloneDeep(clonedState.responseBody);
	nodeDataPayload.batchList = _.cloneDeep(clonedState.batchList);

	nodeStatePayload.status = clonedState.status;
	nodeStatePayload.statusCode = clonedState.statusCode;
	nodeStatePayload.error = clonedState.error;
	nodeStatePayload.dataType = clonedState.contentType || 'application/json';
	nodeStatePayload.incomingDataMeta = getMetadataOfData(clonedState.body);
	nodeStatePayload.outgoingDataMeta = getMetadataOfData(clonedState.responseBody);

	logger.debug(`[${txnId}] [${remoteTxnId}] Starting Upsert Node State: ${JSON.stringify(state._id)}`);
	try {
		let status = await mongoose.connection.db.collection('b2b.node.state').findOneAndUpdate(
			{ nodeId: state.nodeId, interactionId: state.interactionId, flowId: state.flowId },
			{ $set: nodeStatePayload },
			{ upsert: true }
		);
		logger.trace(`[${txnId}] [${remoteTxnId}] Upsert Node State Result: ${JSON.stringify(status)}`);

		logger.debug(`[${txnId}] [${remoteTxnId}] Starting Upsert Node Data: ${JSON.stringify(state._id)}`);
		status = await mongoose.connection.db.collection('b2b.node.state.data').findOneAndUpdate(
			{ nodeId: state.nodeId, interactionId: state.interactionId, flowId: state.flowId },
			{ $set: nodeDataPayload },
			{ upsert: true }
		);
		logger.trace(`[${txnId}] [${remoteTxnId}] Upsert Node Data Result: ${JSON.stringify(status)}`);


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
		data['_metadata.lastUpdated'] = new Date();
		const txnId = req.headers['data-stack-txn-id'];
		const remoteTxnId = req.headers['data-stack-remote-txn-id'];
		const interactionId = req.query.interactionId;
		logger.debug(`[${txnId}] [${remoteTxnId}] Starting Update Interaction: ${interactionId}`);
		let status = await mongoose.connection.db.collection('b2b.interactions').findOneAndUpdate({ _id: interactionId, flowId: config.flowId }, { $set: data });
		logger.debug(`[${txnId}] [${remoteTxnId}] Interaction Update Status:`, status);

		// Remove this logic in v2.8.3
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
	const b2bURL = `${config.baseUrlBM}/${config.app}/interaction/${config.flowId}/${interactionId}`;
	logger.debug(`[${txnId}] [${remoteTxnId}] Starting Update Interaction: ${interactionId}`);
	try {
		const status = await httpClient.request({
			method: 'PUT',
			url: b2bURL,
			json: data,
			headers: {
				'authorization': 'JWT ' + global.BM_TOKEN
			}
		});
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Update Interaction: ${interactionId}`);
		logger.trace(`[${txnId}] [${remoteTxnId}] State status :: ${status.statusCode} `);
		logger.trace(`[${txnId}] [${remoteTxnId}] State body:: ${JSON.stringify(status.body)} `);
		return true;
	} catch (err) {
		logger.debug(`[${txnId}] [${remoteTxnId}] Ending Update Interaction With Error: ${interactionId}`);
		logger.error(err);
		callback(err);
	}
}


function doMaskingOfData(payload) {
	if (payload.body) {
		if (Array.isArray(payload.body)) {
			payload.body.forEach(item => {
				maskingUtils['maskCommon'](item);
			});
		} else {
			maskingUtils['maskCommon'](payload.body);
		}
	}
	if (payload.responseBody) {
		if (Array.isArray(payload.responseBody)) {
			payload.responseBody.forEach(item => {
				maskingUtils['maskCommon'](item);
			});
		} else {
			maskingUtils['maskCommon'](payload.responseBody);
		}
	}
	if (payload.body && maskingUtils[`maskDataFor${payload.inputFormatId}`]) {
		if (Array.isArray(payload.body)) {
			payload.body.forEach(item => {
				maskingUtils[`maskDataFor${payload.inputFormatId}`](item);
			});
		} else {
			maskingUtils[`maskDataFor${payload.inputFormatId}`](payload.body);
		}
	}
	if (payload.responseBody && maskingUtils[`maskDataFor${payload.outputFormatId}`]) {
		if (Array.isArray(payload.responseBody)) {
			payload.responseBody.forEach(item => {
				maskingUtils[`maskDataFor${payload.outputFormatId}`](item);
			});
		} else {
			maskingUtils[`maskDataFor${payload.outputFormatId}`](payload.responseBody);
		}
	}
}

function getMetadataOfData(data) {
	let metadata = {};
	if (data) {
		if (Array.isArray(data)) {
			metadata.type = 'Array';
			metadata.totalRecords = data.length;
			if (data[0]) {
				metadata.attributes = Object.keys(data[0]).length;
			} else {
				metadata.attributes = 0;
			}
		} else {
			metadata.type = 'Object';
			metadata.totalRecords = 1;
			metadata.attributes = Object.keys(data).length;
		}
	} else {
		metadata.type = 'Binary';
		metadata.totalRecords = null;
		metadata.attributes = null;
	}
	return metadata;
}

module.exports.getState = getState;
module.exports.upsertState = upsertState;
module.exports.updateInteraction = updateInteraction;