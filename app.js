if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const express = require('express');
const JWT = require('jsonwebtoken');

let config = require('./config');
const codeGen = require('./generator/index');
const httpClient = require('./http-client');

global.activeRequest = 0;
global.activeMessages = 0;

(async () => {
	try {
		let configRes;
		try {
			configRes = await httpClient.request({
				url: config.baseUrlBM + '/internal/env',
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (err) {
			console.log('Error While Fetching ENV Variables');
			console.log(err);
			process.exit(0);
		}
		Object.keys(configRes.body).forEach(env => {
			process.env[env] = process.env[env] ? process.env[env] : configRes.body[env];
		});
		config = require('./config');
		const token = JWT.sign({ name: 'DS_BM', _id: 'admin', isSuperAdmin: true }, config.RBAC_JWT_KEY);
		global.BM_TOKEN = token;
		if (!config.flowId) {
			throw new Error('Flow ID not found in ENV');
		}
		let flowIds = config.flowId.split(',');
		let routerCode = [];
		routerCode.push('const router = require(\'express\').Router({ mergeParams: true });\n');
		await flowIds.reduce(async (prev, curr) => {
			await prev;
			try {
				const res = await httpClient.request({
					url: config.baseUrlBM + '/' + config.app + '/flow/' + curr,
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'JWT ' + token
					}
				});
				if (res.statusCode !== 200) {
					throw res.body;
				}
				const flowData = res.body;
				config.appNamespace = flowData.namespace;
				config.imageTag = flowData._id + ':' + flowData.version;
				config.appDB = config.DATA_STACK_NAMESPACE + '-' + flowData.app;
				config.flowName = flowData.name;
				config.port = flowData.port || 8000;
				if (config.app !== flowData.app) {
					config.app = flowData.app;
				}
				if (flowData.inputNode && flowData.inputNode.options && flowData.inputNode.options.timeout) {
					config.serverTimeout = flowData.inputNode.options.timeout;
				}
				try {
					await codeGen.createProject(flowData);
					routerCode.push(`router.use('/', require('./${flowData._id}/route.js'));\n`);
				} catch (err) {
					console.log('Error Creating Files');
					console.log(err);
				}
			} catch (err) {
				console.log('Error Fetching Flow Details');
				console.log(err);
			}
		}, Promise.resolve());
		routerCode.push('module.exports = router;');
		fs.writeFileSync(path.join(process.cwd(), 'router.js'), routerCode.join('\n'));

		if (config.isK8sEnv()) {
			// Cleanup Files
			fs.rmSync(path.join(process.cwd(), 'utils', 'state.utils.js'));
			fs.rmSync(path.join(process.cwd(), 'utils', 'file.parser.utils.js'));
			fs.rmSync(path.join(process.cwd(), 'utils', 'file.renderer.utils.js'));
			fs.rmdirSync(path.join(process.cwd(), 'generator'), { recursive: true });
		}

		// Start Server
		initialize();
	} catch (err) {
		console.log('Global Error');
		console.log(err);
	}
})();


setInterval(() => {
	if (global.activeMessages > 0) {
		global.activeMessages--;
	}
}, 60 * 60 * 1000);


function initialize() {
	require('./db-factory');

	global.promises = [];

	const app = express();
	const logger = log4js.getLogger(global.loggerName);

	const middlewares = require('./lib.middlewares');

	app.use(express.urlencoded({ extended: true }));
	app.use(middlewares.addHeaders);

	app.use('/api/b2b', require('./router.js'));
	app.get('/api/b2b/internal/export/route', async function (req, res) {
		let content = fs.readFileSync(path.join(__dirname, 'route.js'), 'utf-8');
		res.json({ content });
	});
	app.get('/api/b2b/internal/export/node.utils', async function (req, res) {
		let content = fs.readFileSync(path.join(__dirname, 'utils/node.utils.js'), 'utf-8');
		res.json({ content });
	});
	app.use('/api/b2b/internal/health/ready', async function (req, res) {
		try {
			if (global.appcenterDB) {
				global.initDone = true;
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
	let timeout = config.serverTimeout || 60;
	if (typeof timeout == 'string') {
		timeout = parseInt(timeout, 10);
	}
	server.setTimeout(timeout * 1000);

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
			let intVal = setInterval(() => {
				// Waiting For all pending requests to finish;
				if (global.activeRequest < 1) {
					// Closing Express Server;
					clearInterval(intVal);
					server.close(() => {
						logger.info('Server Stopped.');
						intVal = setInterval(() => {
							if (global.activeMessages > 0) {
								logger.info('Waiting for Messages to be Processed:', global.activeMessages);
								return;
							}
							clearInterval(intVal);
							process.exit(0);
							// Waiting For all DB Operations to finish;
							// Promise.all(global.dbPromises).then(() => {
							// 	process.exit(0);
							// }).catch(err => {
							// 	logger.error(err);
							// 	process.exit(0);
							// });
						}, 2000);
					});
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