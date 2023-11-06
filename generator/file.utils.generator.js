function tab(len) {
	let d = '';
	while (len > 0) {
		d += '\t';
		len--;
	}
	return d;
}


function getDefinitionFromDataPath(definition, dataPath) {
	if (!definition) {
		return [];
	}
	let temp = definition.find((item) => {
		return item.properties.dataPath == dataPath;
	});
	if (temp) {
		if (temp.type == 'Array') {
			if (temp.definition && temp.definition.length > 0) {
				return (temp.definition[0].definition || []);
			}
		} else {
			return (temp.definition || []);
		}
	}
	if (temp && temp.definition) {
		return temp.definition;
	}
	return [];
}

function parseDataStructuresForFileUtils(dataJson) {
	const code = [];
	code.push('/* eslint-disable quotes */');
	code.push('/* eslint-disable camelcase */');
	code.push('const _ = require(\'lodash\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaId => {
			const schema = dataJson.dataStructures[schemaId];
			const definition = dataJson.dataStructures[schemaId].definition;
			const formatType = dataJson.dataStructures[schemaId].formatType || 'JSON';
			// Function to return array of values;
			code.push(`function getValuesOf${schemaId} (data) {`);
			code.push(`${tab(1)}const values = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}values.push(_.get(data, '${properties.dataPath}') || '');`);
			});
			code.push(`${tab(1)}return values;`);
			code.push('}');
			// Function to return array of headers;
			code.push(`function getHeaderOf${schemaId} () {`);
			code.push(`${tab(1)}const headers = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}headers.push('${properties.name}');`);
			});
			code.push(`${tab(1)}return headers;`);
			code.push('}');

			if (schema.subType == 'HRSF') {
				const headerDefinition = getDefinitionFromDataPath(definition, 'header');
				const recordsDefinition = getDefinitionFromDataPath(definition, 'records');
				const footerDefinition = getDefinitionFromDataPath(definition, 'footer');
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {

					code.push(`${tab(0)}function parseDelimiterFile${schemaId} (aoa) {`);
					code.push(`${tab(1)}let headerRow, recordsRows, footerRow;`);
					if (headerDefinition && headerDefinition.length > 0) {
						code.push(`${tab(1)}headerRow = aoa[0];`);
					}
					if (recordsDefinition && recordsDefinition.length > 0) {
						code.push(`${tab(1)}recordsRows = aoa.splice(1);`);
					}
					if (footerDefinition && footerDefinition.length > 0) {
						code.push(`${tab(1)}footerRow = recordsRows.pop();`);
					}
					/**
					 * =======================================
					 * Parse Header Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (headerRow) {`);
					code.push(`${tab(2)}const headers = {};`);
					headerDefinition.forEach((def, i) => {
						const properties = def.properties;
						code.push(`${tab(2)}headers['${properties.dataPath}'] = headerRow[${i}];`);
					});
					code.push(`${tab(2)}data.headers = headers;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Header End
					 * =======================================
					 */

					/**
					 * =======================================
					 * Parse Records Start
					 * =======================================
					 */

					code.push(`${tab(1)}if (recordsRows) {`);
					code.push(`${tab(2)}const records = [];`);
					code.push(`${tab(2)}recordsRows.forEach((item) => {`);
					code.push(`${tab(3)}const temp = {};`);
					recordsDefinition.forEach((def, i) => {
						const properties = def.properties;
						code.push(`${tab(3)}temp['${properties.dataPath}'] = item[${i}];`);
					});
					code.push(`${tab(3)}records.push(temp);`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}data.records = records;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Records End
					 * =======================================
					 */

					/**
					 * =======================================
					 * Parse Footer Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (footerRow) {`);
					code.push(`${tab(2)}const footer = {};`);
					footerDefinition.forEach((def, i) => {
						const properties = def.properties;
						code.push(`${tab(2)}footer['${properties.dataPath}'] = footerRow[${i}];`);
					});
					code.push(`${tab(2)}data.footer = footer;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return data;`);
					code.push(`${tab(0)}}`);
				}
				if (formatType === 'FLATFILE') {
					code.push(`${tab(0)}function parseFlatFile${schemaId} (contents, isFirstRowHeader) {`);
					code.push(`${tab(1)}let rows = contents.split('\\n');`);
					code.push(`${tab(1)}let headerRow, recordsRows, footerRow;`);
					if (headerDefinition && headerDefinition.length > 0) {
						code.push(`${tab(1)}headerRow = row[0];`);
					}
					if (recordsDefinition && recordsDefinition.length > 0) {
						code.push(`${tab(1)}recordsRows = rows.splice(1);`);
					}
					if (footerDefinition && footerDefinition.length > 0) {
						code.push(`${tab(1)}footerRow = recordsRows.pop();`);
					}
					/**
					 * =======================================
					 * Parse Header Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (headerRow) {`);
					code.push(`${tab(2)}let header = {};`);
					code.push(`${tab(2)}let headerRowSegments = headerRow.split('');`);
					definition.forEach((def, i) => {
						const properties = def.properties;
						const targetKey = properties.dataPathSegs;
						code.push(`${tab(2)}let var_${i} = _.trim(headerRowSegments.splice(0,${properties.fieldLength}).join(''));`);
						if (def.type == 'Number') {
							code.push(`${tab(2)}_.set(header, ${JSON.stringify(targetKey)}, +var_${i});`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(2)}_.set(header, ${JSON.stringify(targetKey)}, commonUtils.convertToActualBoolean(var_${i}));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(2)}_.set(header, ${JSON.stringify(targetKey)}, commonUtils.convertDateToISOString(var_${i}, '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
						} else {
							code.push(`${tab(2)}_.set(header, ${JSON.stringify(targetKey)}, var_${i});`);
						}
					});
					code.push(`${tab(2)}data.header = header;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Header End
					 * =======================================
					 */

					/**
					 * =======================================
					 * Parse Records Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (recordsRows) {`);
					code.push(`${tab(1)}let records = [];`);
					code.push(`${tab(2)}recordsRows.forEach((rowData)=>{`);
					code.push(`${tab(3)}let tempData = {};`);
					code.push(`${tab(3)}let rowSegments = rowData.split('');`);
					definition.forEach((def, i) => {
						const properties = def.properties;
						const targetKey = properties.dataPathSegs;
						code.push(`${tab(3)}let var_${i} = _.trim(rowSegments.splice(0,${properties.fieldLength}).join(''));`);
						if (def.type == 'Number') {
							code.push(`${tab(3)}_.set(tempData, ${JSON.stringify(targetKey)}, +var_${i});`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(3)}_.set(tempData, ${JSON.stringify(targetKey)}, commonUtils.convertToActualBoolean(var_${i}));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(3)}_.set(tempData, ${JSON.stringify(targetKey)}, commonUtils.convertDateToISOString(var_${i}, '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
						} else {
							code.push(`${tab(3)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
						}
					});
					code.push(`${tab(3)}records.push(tempData);`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}data.records = records;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Records End
					 * =======================================
					 */

					/**
					 * =======================================
					 * Parse Footer Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (footerRow) {`);
					code.push(`${tab(2)}let footer = {};`);
					code.push(`${tab(2)}let footerRowSegments = footerRow.split('');`);
					definition.forEach((def, i) => {
						const properties = def.properties;
						const targetKey = properties.dataPathSegs;
						code.push(`${tab(2)}let var_${i} = _.trim(footerRowSegments.splice(0,${properties.fieldLength}).join(''));`);
						if (def.type == 'Number') {
							code.push(`${tab(2)}_.set(footer, ${JSON.stringify(targetKey)}, +var_${i});`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(2)}_.set(footer, ${JSON.stringify(targetKey)}, commonUtils.convertToActualBoolean(var_${i}));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(2)}_.set(footer, ${JSON.stringify(targetKey)}, commonUtils.convertDateToISOString(var_${i}, '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
						} else {
							code.push(`${tab(2)}_.set(footer, ${JSON.stringify(targetKey)}, var_${i});`);
						}
					});
					code.push(`${tab(2)}data.footer = footer;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return data;`);
					code.push(`${tab(0)}}`);
				}
			} else {
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
					// Function to Convert Data from CSV to JSON;
					code.push(`function convertData${schemaId} (rowData) {`);
					code.push(`${tab(1)}const tempData = {};`);
					definition.forEach(def => {
						const properties = def.properties;
						const sourceKey = formatType == 'JSON' ? (properties.dataPath || properties.key) : properties.name;
						if (def.type == 'Number') {
							code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', +(_.get(rowData, '${sourceKey}')));`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', commonUtils.convertToActualBoolean(_.get(rowData, '${sourceKey}')));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', commonUtils.convertDateToISOString(_.get(rowData, '${sourceKey}'), '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
						} else {
							code.push(`${tab(1)}_.set(tempData, '${(properties.dataPath || properties.key)}', _.get(rowData, '${sourceKey}'));`);
						}
					});
					code.push(`${tab(1)}return tempData;`);
					code.push('}');
				}
				if (formatType === 'FLATFILE') {
					// Function to Read FLAT FILE data;
					code.push(`function parseFlatFile${schemaId} (contents, isFirstRowHeader) {`);
					code.push(`${tab(1)}let records = [];`);
					code.push(`${tab(1)}let rows = contents.split('\\n');`);
					code.push(`${tab(1)}if (isFirstRowHeader) {`);
					code.push(`${tab(2)}rows = rows.splice(1);`);
					code.push(`${tab(1)}}`);
					code.push(`${tab(1)}rows.forEach((rowData)=>{`);
					code.push(`${tab(1)}let tempData = {};`);
					code.push(`${tab(1)}let rowSegments = rowData.split('');`);
					definition.forEach((def, i) => {
						const properties = def.properties;
						const targetKey = properties.dataPathSegs;
						code.push(`${tab(1)}let var_${i} = _.trim(rowSegments.splice(0,${properties.fieldLength}).join(''));`);
						if (def.type == 'Number') {
							code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, +var_${i});`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, commonUtils.convertToActualBoolean(var_${i}));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, commonUtils.convertDateToISOString(var_${i}, '${properties.dateFormat || 'yyyy-MM-dd'}'));`);
						} else {
							code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
						}
					});
					code.push(`${tab(2)}records.push(tempData);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return records;`);
					code.push('}');


					// Function to Write FLAT FILE data;
					code.push(`function renderFlatFile${schemaId} (records) {`);
					code.push(`${tab(1)}let rows = [];`);
					code.push(`${tab(1)}records.forEach((rowData)=>{`);
					code.push(`${tab(1)}let line = '';`);
					definition.forEach((def, i) => {
						const properties = def.properties;
						const sourceKey = properties.dataPathSegs;
						if (def.type == 'Number') {
							code.push(`${tab(2)}let var_${i} = (_.get(rowData, ${JSON.stringify(sourceKey)}))+'';`);
						} else if (def.type == 'Boolean') {
							code.push(`${tab(2)}let var_${i} = convertToCSVBoolean(_.get(rowData, ${JSON.stringify(sourceKey)}));`);
						} else if (def.type == 'Date') {
							code.push(`${tab(2)}let var_${i} = commonUtils.convertDateToISOString(_.get(rowData, ${JSON.stringify(sourceKey)}), '${properties.dateFormat || 'yyyy-MM-dd'}');`);
						} else {
							code.push(`${tab(2)}let var_${i} = _.get(rowData, ${JSON.stringify(sourceKey)});`);
						}
						code.push(`${tab(2)}var_${i} = var_${i}.split('').slice(0, ${properties.fieldLength}).join('');`);
						code.push(`${tab(2)}var_${i} = _.padEnd(var_${i}, ${properties.fieldLength}, ' ');`);
						code.push(`${tab(2)}line+=var_${i};`);
					});
					code.push(`${tab(2)}rows.push(line);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return rows.join('\\n');`);
					code.push('}');

				}
			}


			code.push(`module.exports.getValuesOf${schemaId} = getValuesOf${schemaId};`);
			code.push(`module.exports.getHeaderOf${schemaId} = getHeaderOf${schemaId};`);
			if (schema.subType == 'HRSF') {
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
					code.push(`module.exports.parseDelimiterFile${schemaId} = parseDelimiterFile${schemaId};`);
				}
			} else {
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
					code.push(`module.exports.convertData${schemaId} = convertData${schemaId};`);
				}
				if (formatType === 'FLATFILE') {
					code.push(`module.exports.renderFlatFile${schemaId} = renderFlatFile${schemaId};`);
				}
			}
			if (formatType === 'FLATFILE') {
				// code.push(`module.exports.renderFlatFile${schemaId} = renderFlatFile${schemaId};`);
				code.push(`module.exports.parseFlatFile${schemaId} = parseFlatFile${schemaId};`);
			}
		});
		code.push(`${tab(0)}function convertToCSVBoolean(value) {`);
		code.push(`${tab(1)}if (typeof value === 'string' && ['true', 't', 'TRUE', 'yes'].indexOf(value) > -1) {`);
		code.push(`${tab(2)}return 'TRUE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (typeof value === 'boolean') {`);
		code.push(`${tab(2)}return value ? 'TRUE' : 'FALSE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}if (typeof value === 'number') {`);
		code.push(`${tab(2)}return value != 0 ? 'TRUE' : 'FALSE';`);
		code.push(`${tab(1)}}`);
		code.push(`${tab(1)}return 'FALSE';`);
		code.push(`${tab(0)}}`);
	}
	return code.join('\n');
}


module.exports.parseDataStructuresForFileUtils = parseDataStructuresForFileUtils;