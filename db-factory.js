const { MongoClient } = require('mongodb');
const log4js = require('log4js');

const config = require('./config');

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
		logger.trace(config.mongoAuthorUrl, config.mongoAuthorOptions, config.authorDB);
		const client = await MongoClient.connect(config.mongoAuthorUrl, config.mongoAuthorOptions);
		logger.info('Connected to ', config.authorDB);
		const authorDB = client.db(config.authorDB);
		global.authorDB = authorDB;
	} catch (err) {
		logger.error(err);
	}
})();