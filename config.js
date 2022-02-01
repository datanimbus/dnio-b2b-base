const e = {
    imageTag: process.env.IMAGE_TAG,
    hostname: process.env.HOSTNAME,
    port: process.env.PORT || 8080,
    httpsPort: process.env.HTTPS_PORT || 8443,
    mongoOptions: {
        reconnectTries: process.env.MONGO_RECONN_TRIES,
        reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        useNewUrlParser: true,
        dbName: process.env.MONGO_AUTHOR_DBNAME || 'datastackConfig'
    },
    mongoAppcenterOptions: {
        reconnectTries: process.env.MONGO_RECONN_TRIES,
        reconnectInterval: process.env.MONGO_RECONN_TIME_MILLI,
        useNewUrlParser: true
    },
    mongoUrlAppcenter: process.env.MONGO_APPCENTER_URL || 'mongodb://localhost',
};

module.exports = e;