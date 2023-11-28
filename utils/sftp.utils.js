/* eslint-disable no-async-promise-executor */
/* eslint-disable no-inner-declarations */
const path = require('path');
const Client = require('ssh2-sftp-client');
const log4js = require('log4js');
const retry = require('retry');


const logger = log4js.getLogger(global.loggerName);

async function sftpPutFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.user;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'privateKey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}

		const retryOptions = {
			retries: (configData.retry.count + 1) || 1,
			factor: configData.retry.factor || 1,
			minTimeout: (configData.retry.interval || 1) * 1000,
			maxTimeout: (configData.timeout || 10) * 1000,
			randomize: true
		};
		logger.info('Trying to connect SFTP');
		await retryableMethod(retryOptions, async function () {
			return await sftp.connect(options);
		});
		let targetDirectory = path.dirname(configData.targetPath);
		let status = await retryableMethod(retryOptions, async function () {
			return await sftp.mkdir(targetDirectory, true);
		});
		logger.info('Creating Folder if not exists: ', status);
		logger.info('Trying SFTP Upload');
		let temp = await retryableMethod(retryOptions, async function () {
			return await sftp.fastPut(configData.sourcePath, configData.targetPath + '.incomplete');
		});
		await retryableMethod(retryOptions, async function () {
			return await sftp.rename(configData.targetPath + '.incomplete', configData.targetPath);
		});
		logger.info('SFTP Upload Done!');
		return { message: temp };
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

async function sftpListFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.user;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'privateKey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}
		if (!configData.targetPath) {
			throw new Error('No Directory Path provided');
		}

		function filterFunction(item) {
			if (configData.filePattern) {
				if (item.name) {
					let regex = new RegExp(configData.filePattern);
					return regex.test(item.name);
				}
				return false;
			}
			return true;
		}

		const retryOptions = {
			retries: (configData.retry.count + 1) || 1,
			factor: configData.retry.factor || 1,
			minTimeout: (configData.retry.interval || 1) * 1000,
			maxTimeout: (configData.timeout || 10) * 1000,
			randomize: true
		};
		logger.info('Trying to connect SFTP');
		await retryableMethod(retryOptions, async function () {
			return await sftp.connect(options);
		});
		logger.info('Trying to list files in folder:', configData.targetPath);
		const fileList = await retryableMethod(retryOptions, async function () {
			return await sftp.list(configData.targetPath, filterFunction);
		});
		logger.info('File in SFTP folder:', fileList.length);
		logger.debug(fileList);
		return fileList;
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

async function sftpReadFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.user;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'privateKey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}

		const retryOptions = {
			retries: (configData.retry.count + 1) || 1,
			factor: configData.retry.factor || 1,
			minTimeout: (configData.retry.interval || 1) * 1000,
			maxTimeout: (configData.timeout || 10) * 1000,
			randomize: true
		};
		logger.info('Trying to connect SFTP');
		await retryableMethod(retryOptions, async function () {
			return await sftp.connect(options);
		});
		logger.info('Trying to Read file from SFTP :', configData.sourcePath);
		// await waitForFileToComplete(sftp, configData.sourcePath);
		let temp = await retryableMethod(retryOptions, async function () {
			return await sftp.fastGet(configData.sourcePath, configData.targetPath);
		});
		logger.info('SFTP Read Done!');
		logger.info('File Stored at :', configData.targetPath);
		return { message: temp };
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

// function waitForFileToComplete(sftp, filePath) {
// 	return new Promise(async (resolve, reject) => {
// 		try {
// 			let previousFileSize = -1;
// 			let timer;
// 			const stats = await sftp.stat(filePath);
// 			previousFileSize = stats.size;
// 			timer = setInterval(async () => {
// 				const stats = await sftp.stat(filePath);
// 				if (stats.size === previousFileSize) {
// 					clearInterval(timer); // File size has remained constant
// 					resolve(true);
// 				} else {
// 					previousFileSize = stats.size;
// 				}
// 			}, 2000); // Wait for 2 seconds
// 		} catch (err) {
// 			reject(err);
// 		}
// 	});
// }

async function sftpMoveFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.user;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'privateKey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}

		const retryOptions = {
			retries: (configData.retry.count + 1) || 1,
			factor: configData.retry.factor || 1,
			minTimeout: (configData.retry.interval || 1) * 1000,
			maxTimeout: (configData.timeout || 10) * 1000,
			randomize: true
		};
		logger.info('Trying to connect SFTP');
		await retryableMethod(retryOptions, async function () {
			return await sftp.connect(options);
		});
		let targetDirectory = path.dirname(configData.targetPath);
		let status = await retryableMethod(retryOptions, async function () {
			return await sftp.mkdir(targetDirectory, true);
		});
		logger.info('Creating Folder if not exists: ', status);
		logger.info('Trying to Move file from SFTP :', configData.sourcePath);
		let temp = await retryableMethod(retryOptions, async function () {
			return await sftp.rename(configData.sourcePath, configData.targetPath);
		});
		logger.info('SFTP Move Done!');
		logger.info('File Moved to :', configData.targetPath);
		return { message: temp };
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

async function sftpDeleteFile(configData) {
	let sftp = new Client();
	try {
		const options = {};
		options.host = configData.host;
		options.port = configData.port;
		options.username = configData.user;
		if (configData.authType == 'password') {
			options.password = configData.password;
		} else if (configData.authType == 'privateKey') {
			options.privateKey = configData.privateKey;
			options.passphrase = configData.passphrase;
		}


		const retryOptions = {
			retries: (configData.retry.count + 1) || 1,
			factor: configData.retry.factor || 1,
			minTimeout: (configData.retry.interval || 1) * 1000,
			maxTimeout: (configData.timeout || 10) * 1000,
			randomize: true
		};
		logger.info('Trying to connect SFTP');
		await retryableMethod(retryOptions, async function () {
			return await sftp.connect(options);
		});
		logger.info('Trying to Delete file from SFTP :', configData.sourcePath);
		let temp = await retryableMethod(retryOptions, async function () {
			return await sftp.delete(configData.sourcePath);
		});
		logger.info('SFTP Delete Done!');
		return { message: temp };
	} catch (err) {
		logger.error(err);
		throw err;
	} finally {
		sftp.end();
	}
}

function retryableMethod(options, fn) {
	return new Promise((resolve, reject) => {
		const operation = retry.operation(options);
		operation.attempt(async (currentAttempt) => {
			try {
				let temp = await fn();
				resolve(temp);
			} catch (error) {
				if (operation.retry(error)) {
					logger.error(`Retrying ${currentAttempt}...`);
					return;
				}
				logger.error(error);
				if(error){
					reject(error);
				} else {
					reject(new Error('Failed after retries.'));
				}
				
			}

		});
	});
}

module.exports.sftpPutFile = sftpPutFile;
module.exports.sftpListFile = sftpListFile;
module.exports.sftpReadFile = sftpReadFile;
module.exports.sftpMoveFile = sftpMoveFile;
module.exports.sftpDeleteFile = sftpDeleteFile;