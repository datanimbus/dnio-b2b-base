const fs = require('fs');
const path = require('path');
const exceljs = require('exceljs');
const fastcsv = require('fast-csv');
const log4js = require('log4js');
const { XMLBuilder } = require('fast-xml-parser');

const fileUtils = require('./file.utils');

const logger = log4js.getLogger(global.loggerName);
const xmlBuilder = new XMLBuilder();



async function renderCommonFile(req, renderOptions, newBody) {
	const state = {};
	try {
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Rendering File`);
		if (renderOptions.dataFormat.formatType === 'CSV' || renderOptions.dataFormat.formatType === 'DELIMITER' || renderOptions.dataFormat.formatType === 'EXCEL') {
			let delimiter = ',';
			if (renderOptions.dataFormat.formatType === 'DELIMITER') {
				delimiter = renderOptions.dataFormat.character;
			}
			let rowDelimiter = renderOptions.dataFormat.lineSeparator;
			if (rowDelimiter === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (rowDelimiter === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (rowDelimiter === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}
			await new Promise((resolve, reject) => {
				const csvOutputStream = fs.createWriteStream(renderOptions.filePath);
				const fastcsvOptions = {
					rowDelimiter: rowDelimiter,
					delimiter: delimiter,
				};
				if (renderOptions.dataFormat.formatType === 'DELIMITER') {
					fastcsvOptions.quote = false;
				}
				const stream = fastcsv.format(fastcsvOptions);
				stream.pipe(csvOutputStream);
				if (Array.isArray(newBody)) {
					newBody.forEach(data => {
						stream.write(fileUtils[`getValuesOf${renderOptions.dataFormat._id}`](data));
					});
				} else {
					stream.write(fileUtils[`getValuesOf${renderOptions.dataFormat._id}`](newBody));
				}
				stream.end();
				csvOutputStream.on('error', (err) => {
					reject(err);
				});
				csvOutputStream.on('close', async function () {
					if (renderOptions.dataFormat.formatType === 'EXCEL') {
						logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Converting CSV to EXCEL `);
						const workbook = new exceljs.Workbook();
						await workbook.csv.readFile(renderOptions.filePath);
						await workbook.xlsx.writeFile(renderOptions.filePath);
						logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] CSV to EXCEL Conversion Done! `);
					}
					resolve();
				});
			});
		} else if (renderOptions.dataFormat.formatType === 'JSON') {
			fs.writeFileSync(renderOptions.filePath, JSON.stringify(newBody), 'utf-8');
		} else if (renderOptions.dataFormat.formatType === 'XML') {
			let xmlContent = new XMLBuilder({ format: true, arrayNodeName: `${renderOptions.dataFormat.rootNodeName || 'ROOT'}` }).build(newBody);
			if (renderOptions.dataFormat.xmlInitFormat) {
				const xmlInitFormat = `${renderOptions.dataFormat.xmlInitFormat}\\r\\n`;
				xmlContent = xmlInitFormat + xmlContent;
			}
			fs.writeFileSync(renderOptions.filePath, xmlContent, 'utf-8');
		} else if (renderOptions.dataFormat.formatType === 'FLATFILE') {
			let content = fileUtils[`renderFlatFile${renderOptions.dataFormat._id}`](newBody);
			fs.writeFileSync(renderOptions.filePath, content, 'utf-8');
		}
		state.status = 'SUCCESS';
		state.statusCode = 200;
		state.fileContent = renderOptions.filePath;
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] File Rendered Successfully!`);
	} catch (err) {
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Error Occured While Rendering File`);
		logger.error(err);
		state.status = 'ERROR';
		state.statusCode = 400;
		state.body = err;
		state.responseBody = err;
	}
	return state;
}


async function renderHRSFFile(req, renderOptions, newBody) {
	const state = {};
	try {
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Rendering File`);
		if (renderOptions.dataFormat.formatType === 'CSV' || renderOptions.dataFormat.formatType === 'DELIMITER' || renderOptions.dataFormat.formatType === 'EXCEL') {
			let delimiter = ',';
			if (renderOptions.dataFormat.formatType === 'DELIMITER') {
				delimiter = renderOptions.dataFormat.character;
			}
			let rowDelimiter = renderOptions.dataFormat.lineSeparator;
			if (rowDelimiter === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (rowDelimiter === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (rowDelimiter === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}
			let rows = await fileUtils[`renderDelimiterFile${renderOptions.dataFormat._id}`](newBody);
			await new Promise((resolve, reject) => {
				const csvOutputStream = fs.createWriteStream(renderOptions.filePath);
				const fastcsvOptions = {
					rowDelimiter: rowDelimiter,
					delimiter: delimiter,
				};
				if (renderOptions.dataFormat.formatType === 'DELIMITER') {
					fastcsvOptions.quote = false;
				}
				const stream = fastcsv.format(fastcsvOptions);
				stream.pipe(csvOutputStream);
				rows.forEach(data => {
					stream.write(data);
				});
				stream.end();
				csvOutputStream.on('error', (err) => {
					reject(err);
				});
				csvOutputStream.on('close', async function () {
					if (renderOptions.dataFormat.formatType === 'EXCEL') {
						logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Converting CSV to EXCEL `);
						const workbook = new exceljs.Workbook();
						await workbook.csv.readFile(renderOptions.filePath);
						await workbook.xlsx.writeFile(renderOptions.filePath);
						logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] CSV to EXCEL Conversion Done! `);
					}
					resolve();
				});
			});
		} else if (renderOptions.dataFormat.formatType === 'JSON') {
			fs.writeFileSync(renderOptions.filePath, JSON.stringify(newBody), 'utf-8');
		} else if (renderOptions.dataFormat.formatType === 'XML') {
			let xmlContent = new XMLBuilder({ format: true, arrayNodeName: `${renderOptions.dataFormat.rootNodeName || 'ROOT'}` }).build(newBody);
			if (renderOptions.dataFormat.xmlInitFormat) {
				const xmlInitFormat = `${renderOptions.dataFormat.xmlInitFormat}\\r\\n`;
				xmlContent = xmlInitFormat + xmlContent;
			}
			fs.writeFileSync(renderOptions.filePath, xmlContent, 'utf-8');
		} else if (renderOptions.dataFormat.formatType === 'FLATFILE') {
			let content = fileUtils[`renderFlatFile${renderOptions.dataFormat._id}`](newBody);
			fs.writeFileSync(renderOptions.filePath, content, 'utf-8');
		}
		state.status = 'SUCCESS';
		state.statusCode = 200;
		state.fileContent = renderOptions.filePath;
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] File Rendered Successfully!`);
	} catch (err) {
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Error Occured While Rendering File`);
		logger.error(err);
		state.status = 'ERROR';
		state.statusCode = 400;
		state.body = err;
		state.responseBody = err;
	}
	return state;
}

module.exports.renderCommonFile = renderCommonFile;
module.exports.renderHRSFFile = renderHRSFFile;