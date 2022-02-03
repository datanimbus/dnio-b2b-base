const log4js = require('log4js');
const express = require('express');

const app = express();
const logger = log4js.getLogger('Test Server');
logger.level = process.env.LOG_LEVEL || 'info';

const loggingMW = require('./mw.logger')(logger);

app.use(express.json({ inflate: true, limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(loggingMW);

app.post('/api/test1', (_req, _res) => {
	_res.json({});
});

const server = app.listen(18080, function () {
	logger.info('Server Listening on port:', 18080);
});

server.setTimeout(300000);