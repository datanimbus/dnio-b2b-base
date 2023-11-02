const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const { BlobServiceClient } = require('@azure/storage-blob');

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

module.exports.CreateContainerClient = CreateContainerClient;
module.exports.uploadStreamToAzureBlob = uploadStreamToAzureBlob;
module.exports.uploadBufferToAzureBlob = uploadBufferToAzureBlob;