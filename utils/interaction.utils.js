const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const { BlobServiceClient } = require('@azure/storage-blob');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };

const logger = log4js.getLogger(global.loggerName);

function CreateContainerClient(options) {
	const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
	const containerClient = blobServiceClient.getContainerClient(options.container);
	return containerClient;
}

async function uploadStreamToAzureBlob(containerClient, options) {
	try {
		const blockBlobClient = containerClient.getBlockBlobClient(options.blobName);
		let stream = fs.createReadStream(options.fileContent);
		let response = await blockBlobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers, {
			metadata: options.metadata
		});
		logger.debug(`File uploaded to Azure Blob storage. : ${response}`);
		return response;
	} catch (err) {
		logger.error('Error While Uploading Blob');
		logger.error(err);
		throw err;
	}
}

async function uploadBufferToAzureBlob(containerClient, options) {
	try {
		const blockBlobClient = containerClient.getBlockBlobClient(options.blobName);
		let response = await blockBlobClient.uploadData(Buffer.from(options.data), {
			metadata: options.metadata
		});
		logger.debug(`Data uploaded to Azure Blob storage. : ${response}`);
		return response;
	} catch (err) {
		logger.error('Error While Uploading Blob');
		logger.error(err);
		throw err;
	}
}

function CreateS3Client(options) {
	const client = new S3Client({
		region: options.region,
		credentials: {
			secretAccessKey: options.secretAccessKey,
			accessKeyId: options.accessKeyId
		}
	});
	return client;
}

async function uploadBufferToS3Bucket(client, options) {
	try {
		const input = {
			Bucket: options.bucket,
			Key: options.blobName,
			Body: options.data,
			Metadata: options.metadata
		};
		const command = new PutObjectCommand(input);
		const response = await client.send(command);
		logger.debug(`Data uploaded to S3 Bucket storage. : ${response}`);
		return response;
	} catch (err) {
		logger.error('Error While Uploading Blob');
		logger.error(err);
		throw err;
	}
}

module.exports.CreateContainerClient = CreateContainerClient;
module.exports.uploadStreamToAzureBlob = uploadStreamToAzureBlob;
module.exports.uploadBufferToAzureBlob = uploadBufferToAzureBlob;
module.exports.CreateS3Client = CreateS3Client;
module.exports.uploadBufferToS3Bucket = uploadBufferToS3Bucket;