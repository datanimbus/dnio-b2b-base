const log4js = require('log4js');
const express = require('express');

const config = require('./config');
require('./db-factory');

global.promises = [];

const app = express();
const logger = log4js.getLogger(global.loggerName);

app.use(express.json({ inflate: true, limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/b2b', require('./route'));

const server = app.listen(config.port, function () {
    logger.info('Server Listening on port:', config.port);
});

server.setTimeout(300000);