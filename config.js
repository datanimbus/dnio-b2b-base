const log4js = require('log4js');

const logger = log4js.getLogger('Config');
logger.level = process.env.LOG_LEVEL || 'info';

function isK8sEnv() {
	return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT;
}

if (isK8sEnv()) {
	logger.info('*** K8s environment detected ***');
	logger.info('Image version: ' + (process.env.IMAGE_TAG || 'dev'));
} else {
	logger.info('*** Local environment detected ***');
}

const e = {
	isK8sEnv,
	imageTag: process.env.IMAGE_TAG || 'dev',
	hostname: process.env.HOSTNAME,
	port: process.env.PORT || 8080,
	httpsPort: process.env.HTTPS_PORT || 8443,
	mongoUrl: process.env.MONGO_APPCENTER_URL || 'mongodb://localhost',
	authorDB: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig',
	mongoAuthorUrl: process.env.MONGO_AUTHOR_URL || 'mongodb://localhost',
	mongoLogUrl: process.env.MONGO_LOGS_URL || 'mongodb://localhost',
	logsDB: process.env.MONGO_LOGS_DBNAME || 'datastackLogs',
	googleKey: process.env.GOOGLE_API_KEY || '',
	queueName: 'webHooks',
	streamingConfig: {
		url: process.env.STREAMING_HOST || 'nats://127.0.0.1:4222',
		user: process.env.STREAMING_USER || '',
		pass: process.env.STREAMING_PASS || '',
		// maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
		// reconnectTimeWait: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
		maxReconnectAttempts: process.env.STREAMING_RECONN_ATTEMPTS || 500,
		connectTimeout: 2000,
		stanMaxPingOut: process.env.STREAMING_RECONN_TIMEWAIT_MILLI || 500
	},
	mongoAuthorOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		dbName: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig',
	},
	mongoAppCenterOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
	},
	mongoLogsOptions: {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		dbName: process.env.MONGO_LOGS_DBNAME || 'datastackLogs'
	}
};

module.exports = e;