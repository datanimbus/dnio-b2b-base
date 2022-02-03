const { MongoClient } = require('mongodb');
const log4js = require('log4js');

const config = require('./config');
const httpClient = require('./http-client');

const LOGGER_NAME = config.isK8sEnv() ? `[${config.hostname}] [INTEGRATION-FLOW v${config.imageTag}]` : `[INTEGRATION-FLOW v${config.imageTag}]`;
const logger = log4js.getLogger(LOGGER_NAME);
logger.level = process.env.LOG_LEVEL || 'info';

// For threads to pick txnId and user headers
global.userHeader = 'user';
global.txnIdHeader = 'txnid';
global.loggerName = LOGGER_NAME;
global.trueBooleanValues = ['y', 'yes', 'true', '1'];
global.falseBooleanValues = ['n', 'no', 'false', '0'];

(async () => {
	try {
		logger.trace(config.mongoUrl, config.mongoAppCenterOptions, config.appDB);
		const client = await MongoClient.connect(config.mongoUrl, config.mongoAppCenterOptions);
		logger.info('Connected to ', config.appDB);
		const appcenterDB = client.db(config.appDB);
		global.appcenterDB = appcenterDB;
	} catch (err) {
		logger.error(err);
		process.exit(0);
	}
	try {
		const resp = await httpClient.request({
			method: 'PUT',
			url: config.baseUrlBM + '/' + config.app + '/flow/utils/' + config.flowId + '/init',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		logger.debug(resp.statusCode, resp.body);
	} catch (err) {
		logger.error('Unable to inform B2B Manager');
		logger.error(err);
	}
})();