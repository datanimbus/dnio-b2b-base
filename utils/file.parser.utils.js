const fs = require('fs');
const path = require('path');
const exceljs = require('exceljs');
const fastcsv = require('fast-csv');
const log4js = require('log4js');
const { XMLParser } = require('fast-xml-parser');

const fileUtils = require('./file.utils');

const logger = log4js.getLogger(global.loggerName);
const xmlParser = new XMLParser();

async function parseCommonFile(req, parseOptions) {
	let state = {};
	try {
		if (parseOptions.dataFormat.formatType == 'EXCEL') {
			logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Converting EXCEL to CSV `);
			const workbook = new exceljs.Workbook();
			await workbook.xlsx.readFile(parseOptions.filePath);
			await workbook.csv.writeFile(parseOptions.filePath, { sheetId: 1 });
			logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] EXCEL to CSV Conversion Done! `);
		}

		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Parsing File`);
		if (parseOptions.dataFormat.formatType === 'CSV' || parseOptions.dataFormat.formatType == 'EXCEL' || parseOptions.dataFormat.formatType === 'DELIMITER') {
			let delimiter = ',';
			if (parseOptions.dataFormat.formatType === 'DELIMITER') {
				delimiter = parseOptions.dataFormat.character;
			}
			let rowDelimiter = '';
			if (parseOptions.dataFormat.lineSeparator === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (parseOptions.dataFormat.lineSeparator === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (parseOptions.dataFormat.lineSeparator === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}
			await new Promise((resolve, reject) => {
				let records = [];
				const fileStream = fs.createReadStream(parseOptions.filePath);
				const fastcsvOptions = {
					headers: fileUtils[`getHeaderOf${parseOptions.dataFormat._id}`](),
					skipLines: parseOptions.skipLines,
					skipRows: parseOptions.skipRows,
					maxRows: parseOptions.maxRows,
					rowDelimiter: rowDelimiter,
					delimiter: delimiter,
					ignoreEmpty: true,
				};
				if (parseOptions.dataFormat.strictValidation) {
					fastcsvOptions.strictColumnHandling = true;
				} else {
					fastcsvOptions.discardUnmappedColumns = true;
				}
				fastcsv.parseStream(fileStream, fastcsvOptions).transform(row => {
					let temp = fileUtils[`convertData${parseOptions.dataFormat._id}`](row);
					return temp;
				}).on('error', err => {
					// state.status = 'ERROR';
					// state.statusCode = 400;
					// state.responseBody = err;
					// stateUtils.upsertState(req, state);
					reject(err);
				}).on('data', row => records.push(row))
					.on('end', rowCount => {
						logger.debug('Parsed rows = ', rowCount);
						state.totalRecords = rowCount;
						state.responseBody = records;
						resolve(records);
					});
			});
		} else if (parseOptions.dataFormat.formatType === 'JSON') {
			const contents = fs.readFileSync(parseOptions.filePath, 'utf-8');
			state.responseBody = JSON.parse(contents);
		} else if (parseOptions.dataFormat.formatType === 'XML') {
			const contents = fs.readFileSync(parseOptions.filePath, 'utf-8');
			state.responseBody = xmlParser.parse(contents);
			state.xmlContent = contents;
		} else if (parseOptions.dataFormat.formatType === 'FLATFILE') {
			const contents = fs.readFileSync(parseOptions.filePath, 'utf-8');
			state.responseBody = fileUtils[`parseFlatFile${parseOptions.dataFormat._id}`](contents, (parseOptions.isFirstRowHeader || false));
		} else if (parseOptions.dataFormat.formatType === 'BINARY') {
			// Do Nothing
		}
		state.status = 'SUCCESS';
		state.statusCode = 200;
		state.fileContent = parseOptions.filePath;
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!`);
	} catch (err) {
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Error Occured While Parsing File`);
		logger.error(err);
		state.status = 'ERROR';
		state.statusCode = 400;
		state.responseBody = err;
	}
	return state;
}


async function parseHRSFFile(req, parseOptions) {
	const state = {};
	try {
		if (parseOptions.dataFormat.formatType == 'EXCEL') {
			logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Converting EXCEL to CSV `);
			const workbook = new exceljs.Workbook();
			await workbook.xlsx.readFile(parseOptions.filePath);
			await workbook.csv.writeFile(parseOptions.filePath, { sheetId: 1 });
			logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] EXCEL to CSV Conversion Done! `);
		}

		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Parsing File`);
		if (parseOptions.dataFormat.formatType === 'CSV' || parseOptions.dataFormat.formatType == 'EXCEL' || parseOptions.dataFormat.formatType === 'DELIMITER') {
			let delimiter = ',';
			if (parseOptions.dataFormat.formatType === 'DELIMITER') {
				delimiter = parseOptions.dataFormat.character;
			}
			let rowDelimiter = '';
			if (parseOptions.dataFormat.lineSeparator === '\\\\n') {
				rowDelimiter = '\\n';
			} else if (parseOptions.dataFormat.lineSeparator === '\\\\r\\\\n') {
				rowDelimiter = '\\r\\n';
			} else if (parseOptions.dataFormat.lineSeparator === '\\\\r') {
				rowDelimiter = '\\r';
			} else {
				rowDelimiter = '\\n';
			}
			await new Promise((resolve, reject) => {
				let aoa = [];
				const fileStream = fs.createReadStream(parseOptions.filePath);
				const fastcsvOptions = {
					rowDelimiter: rowDelimiter,
					delimiter: delimiter,
					ignoreEmpty: true,
				};
				fastcsv.parseStream(fileStream, fastcsvOptions)
					.on('error', (err) => {
						// state.status = 'ERROR';
						// state.statusCode = 400;
						// state.responseBody = err;
						// stateUtils.upsertState(req, state);
						reject(err);
					}).on('data', (row) => {
						aoa.push(row);
					})
					.on('end', rowCount => {
						logger.debug('Parsed rows = ', rowCount);
						state.totalRows = rowCount;
						state.responseBody = fileUtils[`parseDelimiterFile${parseOptions.dataFormat._id}`](aoa);
						resolve(state.responseBody);
					});
			});
		} else if (parseOptions.dataFormat.formatType === 'FLATFILE') {
			const contents = fs.readFileSync(parseOptions.filePath, 'utf-8');
			state.responseBody = fileUtils[`parseFlatFile${parseOptions.dataFormat._id}`](contents, (parseOptions.isFirstRowHeader || false));
		}
		state.status = 'SUCCESS';
		state.statusCode = 200;
		state.fileContent = parseOptions.filePath;
		logger.info(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] File Parsed Successfully!`);
	} catch (err) {
		logger.error(`[${req.header('data-stack-txn-id')}] [${req.header('data-stack-remote-txn-id')}] Error Occured While Parsing File`);
		logger.error(err);
		state.status = 'ERROR';
		state.statusCode = 400;
		state.responseBody = err;
	}
	return state;
}


module.exports.parseCommonFile = parseCommonFile;
module.exports.parseHRSFFile = parseHRSFFile;