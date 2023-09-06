const fs = require('fs');
const log4js = require('log4js');
const { BlobServiceClient } = require('@azure/storage-blob');


const logger = log4js.getLogger(global.loggerName);


const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };


let e = {};


e.uploadStreamAzBlob = async (data) => {
	logger.debug(`Uploading file to Azure Blob : ${data.blobName}`);
	logger.debug(JSON.stringify({
		containerName: data.containerName,
		blobName: data.blobName,
		appName: data.metadata && data.metadata['dnio_app'],
		flowName: data.metadata && data.metadata['dnio_flowName']
	}));

	try {
		const blobServiceClient = BlobServiceClient.fromConnectionString(data.connectionString);
		const containerClient = blobServiceClient.getContainerClient(data.containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(data.blobName);

		let stream = fs.createReadStream(data.fileContent);

		let response = await blockBlobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers,
			{
				// blobHTTPHeaders: { blobContentType: data.file.contentType },
				metadata: data.metadata
			});

		logger.debug(`File uploaded to Azure Blob storage. : ${data.blobName}`);
		return {
			etag: response.etag,
			requestId: response.requestId
		};
	} catch (err) {
		logger.error(`Error Uploading File to Azure Blob. : ${data.blobName} : ${err.message}`);
		throw new Error(err);
	}
};

e.uploadDataAzBlob = async (data) => {
	logger.debug(`Uploading file to Azure Blob : ${data.blobName}`);
	logger.debug(JSON.stringify({
		containerName: data.containerName,
		blobName: data.blobName,
		appName: data.metadata && data.metadata['dnio_app'],
		flowName: data.metadata && data.metadata['dnio_flowName']
	}));

	try {
		const blobServiceClient = BlobServiceClient.fromConnectionString(data.connectionString);
		const containerClient = blobServiceClient.getContainerClient(data.containerName);
		const blockBlobClient = containerClient.getBlockBlobClient(data.blobName);

		let response = await blockBlobClient.uploadData(data.fileContent, {
			metadata: data.metadata
		});

		logger.debug(`File uploaded to Azure Blob storage. : ${data.blobName}`);
		return {
			etag: response.etag,
			requestId: response.requestId
		};
	} catch (err) {
		logger.error(`Error Uploading File to Azure Blob. : ${data.blobName} : ${err.message}`);
		throw new Error(err);
	}
};


module.exports = e;
