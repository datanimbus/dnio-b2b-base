/* eslint-disable camelcase */
const log4js = require('log4js');
const Kafka = require('node-rdkafka');

const ERR_TOPIC_ALREADY_EXISTS = 36;
const logger = log4js.getLogger(global.loggerName);


function ensureTopicExists(config) {
	logger.debug(`Ensuring Kafka Topic Exists - ${config.topic}`);

	let adminClient;
	try {
		adminClient = Kafka.AdminClient.create({
			'bootstrap.servers': config['servers'],
			'sasl.username': config['username'],
			'sasl.password': config['password'],
			'security.protocol': config['protocol'],
			'sasl.mechanisms': config['mechanisms']
		});

		return new Promise((resolve, reject) => {
			adminClient.createTopic({
				topic: config.topic,
				num_partitions: config.num_partitions || 6,
				replication_factor: config.replication_factor || 3
			}, (err) => {
				if (!err) {
					logger.debug(`Created topic - ${config.topic}`);
					return resolve();
				}

				if (err.code === ERR_TOPIC_ALREADY_EXISTS) {
					logger.debug(`Topic already exists - ${config.topic}`);
					return resolve();
				}

				logger.error(`Error creating/verifying topic - ${err}`);
				return reject(err);
			});
		});
	} catch (err) {
		logger.error(err);
	}
}


function createProducer(config) {
	logger.debug('Creating Producer');

	const producer = new Kafka.Producer({
		'bootstrap.servers': config['servers'],
		'sasl.username': config['username'],
		'sasl.password': config['password'],
		'security.protocol': config['protocol'],
		'sasl.mechanisms': config['mechanisms'],
		'dr_msg_cb': true
	});

	return new Promise((resolve, reject) => {
		producer
			.on('ready', () => {
				logger.debug('Producer ready');
				resolve(producer);
			})
			.on('delivery-report', (err, report) => {
				if (err) {
					logger.error(`Error producing ${err}`);
				} else {
					const { topic, partition, value } = report;
					logger.debug(`Successfully produced record to topic "${topic}" partition ${partition} :: ${value}`);
				}
			})
			.on('event.error', (err) => {
				logger.error('event.error', err);
				reject(err);
			});
		producer.connect();
	});
}


function createConsumer(config, onData) {
	try {
		logger.debug('Creating Consumer');

		const consumer = new Kafka.KafkaConsumer({
			'bootstrap.servers': config['servers'],
			'sasl.username': config['username'],
			'sasl.password': config['password'],
			'security.protocol': config['protocol'],
			'sasl.mechanisms': config['mechanisms'],
			'group.id': config['groupId']
		}, {
			'auto.offset.reset': 'earliest'
		});
		logger.trace('Consumer :: ', consumer);
	
		return new Promise((resolve, reject) => {
			consumer
				.on('ready', () => {
					logger.debug(`Kafka Consumer Ready, Subscribing to topic :: ${config.topic}`);
					consumer.subscribe([config.topic]);
	
					setInterval(() => {
						if (global.activeMessages < config.batch) {
							logger.debug('Consuming Records from Kafka');
							consumer.consume();
						}
					}, config.interval || 10);
					resolve(consumer);
				})
				.on('data', onData)
				.on('event.error', e => {
					logger.error('Error connecting to Kafka :: ', e);
				});
	
			consumer.connect();
		});
	} catch (err) {
		logger.error(`Error creating consumer :: ${err}`);
	}
}


async function produceMessage(producer, topic, partition, key, message) {
	let resp;

	if (Array.isArray(message)) {
		let promises = await message.reduce(async (prev, m) => {
			await prev;
			return await producer.produce(topic, partition, m, key);
		}, Promise.resolve());
		resp = await Promise.all(promises);

	} else {
		resp = await producer.produce(topic, partition, message, key);
	}

	producer.flush(10000, () => {
		// producer.disconnect();
	});

	return resp;
}


// async function consumeMessages(consumer, config) {
//   console.log(`Consuming records from ${config.topic}`);

//   let seen = 0;

//   const consumer = await createConsumer(config, ({key, value, partition, offset}) => {
//     console.log(`Consumed record with key ${key} and value ${value} of partition ${partition} @ offset ${offset}. Updated total count to ${++seen}`);
//   });

//   process.on('SIGINT', () => {
//     console.log('\nDisconnecting consumer ...');
//     consumer.disconnect();
//   });
// }



module.exports.ensureTopicExists = ensureTopicExists;
module.exports.createProducer = createProducer;
module.exports.createConsumer = createConsumer;
module.exports.produceMessage = produceMessage;
// module.exports.consumeMessages = consumeMessages;