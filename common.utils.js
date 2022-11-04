const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const Client = require('ssh2-sftp-client');
const { v4: uuid } = require('uuid');
const _ = require('lodash');

const config = require('./config');
const httpClient = require('./http-client');

const logger = log4js.getLogger(global.loggerName);

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

async function sftpFetchFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.username;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'publickey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}
		let filePath;
		await sftp.connect(options);
		if (configData.filePattern) {
			const fileName = configData.filePattern;
			filePath = path.join(__dirname, 'SFTP-Files', fileName);
			await sftp.fastGet(configData.directoryPath + '/' + configData.filePattern, filePath);
		} else {
			const fileList = await sftp.list(configData.directoryPath);
			const fileName = fileList[0].name;
			filePath = path.join(__dirname, 'SFTP-Files', fileName);
			await sftp.fastGet(configData.directoryPath + '/' + fileName, filePath);
		}
		return filePath;
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

async function sftpPutFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.username;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'publickey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}
		let filePath;
		await sftp.connect(options);
		if (!configData.directoryPath) {
			throw new Error('No Directory Path provided');
		}
		if (!configData.filePattern) {
			throw new Error('No File Name provided');
		}
		const fileName = configData.filePattern;
		filePath = path.join(__dirname, 'SFTP-Files', fileName);
		await sftp.fastPut(filePath, configData.directoryPath + '/' + configData.filePattern);
		return filePath;
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
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


function handleError(err, state, req, node) {
	if (err.statusCode) {
		state.statusCode = err.statusCode;
	} else {
		state.statusCode = 500;
	}
	if (err.body) {
		state.body = err.body;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.body);
	} else if (err.message) {
		state.body = { message: err.message };
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err.message);
	} else {
		state.body = err;
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}]`, err);
	}
	state.status = 'ERROR';
}

function handleResponse(response, state, req, node) {
	state.statusCode = response.statusCode;
	state.body = response.body;
	state.headers = response.headers;
	if (response && response.statusCode != 200) {
		state.status = 'ERROR';
		state.statusCode = response && response.statusCode ? response.statusCode : 400;
		state.body = response && response.body ? response.body : { message: 'Unable to reach the URL' };
	} else {
		state.status = 'SUCCESS';
		state.statusCode = 200;
	}
}

function handleValidation(errors, state, req, node) {
	if (errors && !_.isEmpty(errors)) {
		state.status = 'ERROR';
		state.statusCode = 400;
		state.body = { message: errors };
	}
}

module.exports.getDataService = getDataService;
module.exports.getFlow = getFlow;
module.exports.getFaaS = getFaaS;
module.exports.getConnector = getConnector;
module.exports.convertToBoolean = convertToBoolean;
module.exports.convertToDate = convertToDate;
module.exports.handleError = handleError;
module.exports.handleResponse = handleResponse;
module.exports.handleValidation = handleValidation;
module.exports.sftpFetchFile = sftpFetchFile;
module.exports.sftpPutFile = sftpPutFile;