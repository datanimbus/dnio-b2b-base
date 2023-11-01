/* eslint-disable camelcase */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-inner-declarations */
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const _ = require('lodash');
const { writeToPath } = require('fast-csv');
const mongoose = require('mongoose');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const { MongoClient } = require('mongodb');
const ALGORITHM = 'aes-256-gcm';

const config = require('../config');
const httpClient = require('../http-client');

const logger = log4js.getLogger(global.loggerName);

async function getApp() {
	try {
		const options = {};
		options.url = `${config.baseUrlUSR}/data/app/${config.app}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		if (_.isArray(response.body)) {
			return response.body[0];
		} else {
			return response.body;
		}
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getDataService(serviceId) {
	try {
		const options = {};
		options.url = `${config.baseUrlSM}/${config.app}/service/${serviceId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


async function getFlow(flowId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/flow/${flowId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getFaaS(faasId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/faas/${faasId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getConnector(connectorId) {
	try {
		const options = {};
		options.url = `${config.baseUrlUSR}/${config.app}/connector/${connectorId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getCustomNode(nodeId) {
	try {
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/node/${nodeId}`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


async function getAllFormulas() {
	try {
		let options = {};
		options.url = `${config.baseUrlUSR}/${config.app}/formula/count`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		let response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		options = {};
		options.url = `${config.baseUrlUSR}/${config.app}/formula?count=` + response.body;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

async function getAllLibraries() {
	try {
		// const client = await MongoClient.connect(config.mongoAuthorUrl, config.mongoAuthorOptions);
		// const docs = await client.db(config.mongoAuthorOptions.dbName).collection('config.b2b.libraries').find({}).toArray();
		// return docs;
		let options = {};
		options.url = `${config.baseUrlBM}/admin/flow/utils/node-library/count`;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		let response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		options = {};
		options.url = `${config.baseUrlBM}/admin/flow/utils/node-library?count=` + response.body;
		options.method = 'GET';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return response.body;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}


function convertToBoolean(value) {
	if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {
		return true;
	}
	if (typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'number') {
		return value != 0;
	}
	return false;
}


function convertToDate(value, format) {
	if (typeof value === 'string') {
		try {
			return moment(value, format, false).toISOString();
		} catch (err) {
			logger.error('unable to parse Date with format:', format);
			logger.error(err);
			return value;
		}
	}
	return value;
}


function writeDataToCSV(filepath, data, headers) {
	return new Promise((resolve, reject) => {
		writeToPath(filepath, data, { headers }).on('error', err => {
			logger.error(err);
			reject(err);
		})
			.on('finish', resolve);
	});
}

function writeDataToXLS(filepath, data, headers) {
	return new Promise((resolve, reject) => {
		writeToPath(filepath, data, { headers }).on('error', err => {
			logger.error(err);
			reject(err);
		})
			.on('finish', resolve);
	});
}

function handleError(err, state, req, node) {
	state.error = err;
	if (err.statusCode) {
		state.statusCode = err.statusCode;
	} else {
		state.statusCode = 500;
	}
	if (err.status) {
		state.responseStatus = err.status;
	} else {
		state.responseStatus = 'ERROR';
	}
	if (err.body) {
		state.responseBody = err.body;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.body);
	} else if (err.message) {
		state.responseBody = { message: err.message };
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.message);
	} else {
		state.responseBody = err;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err);
	}
	state.status = 'ERROR';
}

function handleResponse(response, state, req, node) {
	logger.trace('Handle Response - ', JSON.stringify(response, null, 4));
	if (!response.statusCode) {
		response.statusCode = 200;
	}
	state.statusCode = response.statusCode;
	state.responseBody = response.body;
	state.headers = response.headers;
	if (response && response.statusCode != 200) {
		state.status = 'ERROR';
		state.statusCode = response && response.statusCode ? response.statusCode : 400;
		state.responseBody = response && response.body ? response.body : { message: 'Unable to reach the URL' };
	} else {
		state.status = 'SUCCESS';
		state.statusCode = 200;
	}
}

function handleValidation(errors, state, req, node) {
	if (errors && !_.isEmpty(errors)) {
		state.status = 'ERROR';
		state.statusCode = 400;
		state.responseBody = { message: errors };
	}
}

async function uploadFileToDB(req, uploadFilePath, targetAgentId, targetAgentName, flowName, deploymentName, outputFileName) {
	try {
		const appcenterCon = mongoose.createConnection(config.mongoUrl, config.mongoAppCenterOptions);
		appcenterCon.on('connecting', () => { logger.info(' *** Appcenter DB CONNECTING *** '); });
		appcenterCon.on('disconnected', () => { logger.error(' *** Appcenter DB LOST CONNECTION *** '); });
		appcenterCon.on('reconnect', () => { logger.info(' *** Appcenter DB RECONNECTED *** '); });
		appcenterCon.on('connected', () => { logger.info('Connected to Appcenter DB DB'); global.appcenterCon = appcenterCon; });
		appcenterCon.on('reconnectFailed', () => { logger.error(' *** Appcenter DB FAILED TO RECONNECT *** '); });

		const dbname = config.DATA_STACK_NAMESPACE + '-' + config.app;
		const dataDB = appcenterCon.useDb(dbname);
		const gfsBucket = new mongoose.mongo.GridFSBucket(dataDB, { bucketName: 'b2b.files' });

		const encryptedOutputFileName = 'ENC_' + outputFileName;
		logger.info(`Uploading file ${encryptedOutputFileName} from flow ${config.flowId} to DB`);

		const fileData = fs.readFileSync(uploadFilePath);
		const encryptedData = encryptDataGCM(fileData, config.encryptionKey);

		const downloadFilePath = path.join(process.cwd(), 'downloads', encryptedOutputFileName);
		fs.writeFileSync(downloadFilePath, encryptedData);

		const fileDetails = await new Promise((resolve, reject) => {
			fs.createReadStream(downloadFilePath).
				pipe(gfsBucket.openUploadStream(crypto.createHash('md5').update(uuid()).digest('hex'))).
				on('error', function (error) {
					logger.error(`Error uploading file - ${error}`);
					reject(error);
				}).
				on('finish', function (file) {
					logger.debug('Successfully uploaded file to DB');
					logger.trace(`File details - ${JSON.stringify(file)}`);
					resolve(file);
				});
		});

		logger.info('Requesting BM to update the agent download action');
		const options = {};
		options.url = `${config.baseUrlBM}/${config.app}/agent/utils/${targetAgentId}/agentAction`;
		options.method = 'POST';
		options.headers = {};
		options.headers['Content-Type'] = 'application/json';
		options.headers['Authorization'] = 'JWT ' + global.BM_TOKEN;
		options.headers['Action'] = 'download';

		const metaDataInfo = {};
		metaDataInfo.originalFileName = outputFileName;
		metaDataInfo.remoteTxnID = req.header('data-stack-remote-txn-id');
		metaDataInfo.dataStackTxnID = req.header('data-stack-txn-id');
		metaDataInfo.fileID = fileDetails.filename;
		metaDataInfo.totalChunks = '1';
		metaDataInfo.downloadAgentID = targetAgentId;

		const eventDetails = {
			'agentId': targetAgentId,
			'app': config.app,
			'agentName': targetAgentName,
			'flowName': flowName,
			'flowId': config.flowId,
			'deploymentName': deploymentName,
			'timestamp': new Date(),
			'sentOrRead': false
		};

		const payload = {
			'metaDataInfo': metaDataInfo,
			'eventDetails': eventDetails
		};

		options.json = payload;
		const response = await httpClient.request(options);
		if (response.statusCode !== 200) {
			throw response.body;
		}
		return fileDetails;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

function createHash(key) {
	const encodedString = crypto.createHash('md5').update(key).digest('hex');
	return encodedString;
}

function compress(data) {
	const deflated = zlib.deflateSync(data);
	return deflated;
}

function encryptDataGCM(data, key) {
	const compressedData = compress(data);
	const hashedkey = createHash(key);
	const nonce = crypto.randomBytes(12);
	var cipher = crypto.createCipheriv(ALGORITHM, hashedkey, nonce);
	const encrypted = Buffer.concat([nonce, cipher.update(Buffer.from(compressedData).toString('base64')), cipher.final(), cipher.getAuthTag()]);
	return encrypted.toString('base64');
}

function maskStringData(strVal, maskType, charsToShow) {
	if (!strVal) {
		return '';
	}
	if (!charsToShow) {
		charsToShow = 5;
	}
	if (maskType == 'all') {
		return strVal.split('').fill('*').join('');
	} else {
		let segs = strVal.split('');
		let segs1 = segs.splice(0, segs.length - charsToShow);
		return segs1.fill('*').join('') + segs.join('');
	}
}

function parseMustacheVariable(value) {
	if (value) {
		return value.replace(/([a-z]+)\[/g, '$1.').replace(/([0-9]+)\]/g, '$1');
	}
}

module.exports.getApp = getApp;
module.exports.getDataService = getDataService;
module.exports.getFlow = getFlow;
module.exports.getFaaS = getFaaS;
module.exports.getConnector = getConnector;
module.exports.getAllFormulas = getAllFormulas;
module.exports.getCustomNode = getCustomNode;
module.exports.getAllLibraries = getAllLibraries;
module.exports.convertToBoolean = convertToBoolean;
module.exports.convertToDate = convertToDate;
module.exports.handleError = handleError;
module.exports.handleResponse = handleResponse;
module.exports.handleValidation = handleValidation;
module.exports.writeDataToCSV = writeDataToCSV;
module.exports.writeDataToXLS = writeDataToXLS;
module.exports.uploadFileToDB = uploadFileToDB;
module.exports.maskStringData = maskStringData;
module.exports.parseMustacheVariable = parseMustacheVariable;