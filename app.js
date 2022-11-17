if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}
// const fs = require('fs');
// const path = require('path');
const log4js = require('log4js');
const express = require('express');
const JWT = require('jsonwebtoken');

const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

const config = require('./config');
const codeGen = require('./generator/index');
const httpClient = require('./http-client');

const token = JWT.sign({ name: 'DS_BM', _id: 'admin', isSuperAdmin: true }, config.RBAC_JWT_KEY);
global.BM_TOKEN = token;

httpClient.request({
	url: config.baseUrlBM + '/' + config.app + '/flow/' + config.flowId,
	method: 'GET',
	headers: {
		'Content-Type': 'application/json',
		'Authorization': 'JWT ' + token
	}
}).then(async (res) => {
	if (res.statusCode !== 200) {
		throw res.body;
	}
	const flowData = res.body;
	config.appNamespace = flowData.namespace;
	config.imageTag = flowData._id + ':' + flowData.version;
	config.appDB = config.DATA_STACK_NAMESPACE + '-' + flowData.app;
	try {
		await codeGen.createProject(flowData);
		initialize();
	} catch (err) {
		console.log('Error Creating Files');
		console.log(err);
	}

}).catch(err => {
	console.log('Error Requesting BM');
	console.log(err);
});



function initialize() {
	require('./db-factory');

	global.promises = [];

	const app = express();
	const logger = log4js.getLogger(global.loggerName);

	const middlewares = require('./lib.middlewares');

	app.use(express.urlencoded({ extended: true }));
	app.use(middlewares.addHeaders);

	app.use('/api/b2b', require('./route'));

	app.use('/api/b2b/internal/health/ready', async function (req, res) {
		try {
			if (global.appcenterDB) {
				return res.status(200).json({ message: 'Alive' });
			}
			return res.status(400).json({ message: 'DB Not Connected' });
		} catch (err) {
			logger.error(err);
			return res.status(500).json({ message: err.message });
		}
	});

	const server = app.listen(config.port, function () {
		logger.info('Server Listening on port:', config.port);
	});

	server.setTimeout(300000);

	process.on('SIGTERM', () => {
		try {
			// Handle Request for 15 sec then stop recieving
			setTimeout(() => {
				global.stopServer = true;
			}, 15000);
			logger.info('Process Kill Request Recieved');
			// Stopping CRON Job;
			// global.job.cancel();
			// global.pullJob.cancel();
			// clearInterval(global.pullJob)
			const intVal = setInterval(() => {
				// Waiting For all pending requests to finish;
				if (global.activeRequest === 0) {
					// Closing Express Server;
					server.close(() => {
						logger.info('Server Stopped.');
						// Waiting For all DB Operations to finish;
						Promise.all(global.dbPromises).then(() => {
							process.exit(0);
						}).catch(err => {
							logger.error(err);
							process.exit(0);
						});
					});
					clearInterval(intVal);
				} else {
					logger.info('Waiting for request to complete, Active Requests:', global.activeRequest);
				}
			}, 2000);
		} catch (e) {
			logger.error(e);
			throw e;
		}
	});


	// function cleanUpJob(firetime) {
	// 	let counter = 0;
	// 	try {
	// 		const date = new Date();
	// 		date.setSeconds(-7200);
	// 		logger.trace('Clean up Job Triggred at:', firetime);
	// 		logger.trace('Removing files older then:', date.toISOString());
	// 		const uploads = fs.readdirSync('./uploads', {
	// 			withFileTypes: true
	// 		});
	// 		const downloads = fs.readdirSync('./downloads', {
	// 			withFileTypes: true
	// 		});
	// 		uploads.forEach(file => {
	// 			try {
	// 				const filePath = path.join(__dirname, 'uploads', file.name);
	// 				if (file.isFile()) {
	// 					const lastAccessTime = fs.statSync(filePath).atimeMs;
	// 					if (lastAccessTime < date.getTime()) {
	// 						logger.debug('Removing old file:', file.name);
	// 						fs.unlinkSync(filePath);
	// 						counter++;
	// 					}
	// 				}
	// 				logger.trace('Clean up Job Completed. Removed files:');
	// 			} catch (e) {
	// 				logger.warn('Unable to remove old file', file.name);
	// 				logger.warn(e);
	// 			}
	// 		});
	// 		downloads.forEach(file => {
	// 			try {
	// 				const filePath = path.join(__dirname, 'downloads', file.name);
	// 				if (file.isFile()) {
	// 					const lastAccessTime = fs.statSync(filePath).atimeMs;
	// 					if (lastAccessTime < date.getTime()) {
	// 						logger.debug('Removing old file:', file.name);
	// 						fs.unlinkSync(filePath);
	// 						counter++;
	// 					}
	// 				}
	// 				logger.trace('Clean up Job Completed. Removed files:');
	// 			} catch (e) {
	// 				logger.warn('Unable to remove old file', file.name);
	// 				logger.warn(e);
	// 			}
	// 		});

	// 		// Cleaing DB Promises
	// 		const len = global.dbPromises.length;
	// 		for (let index = len - 1; index >= 0; index--) {
	// 			const item = global.dbPromises[index];
	// 			isFinished(item).then(flag => {
	// 				if (flag) {
	// 					global.dbPromises.splice(index, 1);
	// 				}
	// 			}).catch(() => { });
	// 		}
	// 	} catch (e) {
	// 		logger.warn('Unable to complete cleanup job. Removed files:', counter);
	// 		logger.warn(e);
	// 	}
	// }

	// function delay(msec, value) {
	// 	return new Promise(done => setTimeout((() => done(value)), msec));
	// }

	// function isFinished(promise) {
	// 	return Promise.race([delay(0, false), promise.then(() => true, () => true)]);
	// }
}