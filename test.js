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

global.activeRequest = 0;
global.activeMessages = 0;

(async () => {
	try {
		config = require('./config');
		if (!config.flowId) {
			throw new Error('Flow ID not found in ENV');
		}
		const token = JWT.sign({ name: 'DS_BM', _id: 'admin', isSuperAdmin: true }, config.RBAC_JWT_KEY);
		global.BM_TOKEN = token;
		const flowData = require('./flow.json');
		config.appNamespace = flowData.namespace;
		config.imageTag = flowData._id + ':' + flowData.version;
		config.appDB = config.DATA_STACK_NAMESPACE + '-' + flowData.app;
		config.flowName = flowData.name;
		config.port = flowData.port || 8080;
		if (config.app !== flowData.app) {
			config.app = flowData.app;
		}
		if (flowData.inputNode && flowData.inputNode.options && flowData.inputNode.options.timeout) {
			config.serverTimeout = flowData.inputNode.options.timeout;
		}
		try {
			await codeGen.createProject(flowData);
			initialize();
		} catch (err) {
			console.log('Error Creating Files');
			console.log(err);
		}
	} catch (err) {
		console.log('Error Requesting BM');
		console.log(err);
	}
})();


setInterval(() => {
	if (global.activeMessages > 0) {
		global.activeMessages--;
	}
}, 60 * 60 * 1000);


function initialize() {
	// require('./db-factory');

	global.promises = [];

	const app = express();
	const logger = log4js.getLogger(global.loggerName);

	const middlewares = require('./lib.middlewares');

	app.use(express.urlencoded({ extended: true }));
	app.use(middlewares.addHeaders);

	app.use('/api/b2b', require('./route'));
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

}