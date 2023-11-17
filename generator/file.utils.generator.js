const _ = require('lodash');

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


function getCodeToParseCSVDataType(def, i, key) {
	let tempCode = [];
	let fieldNo = i;
	if (def.properties.fieldNo) {
		fieldNo = def.properties.fieldNo;
	}
	if (def.type == 'Number') {
		tempCode.push(`${tab(1)}let var_${i} = +(${key}[${fieldNo}]);`);
	} else if (def.type == 'Boolean') {
		tempCode.push(`${tab(1)}let var_${i} = commonUtils.convertToActualBoolean(${key}[${fieldNo}]);`);
	} else if (def.type == 'Date') {
		tempCode.push(`${tab(1)}let var_${i} = commonUtils.parseDate(${key}[${fieldNo}], '${def.properties.dateFormat || 'yyyy-MM-dd'}');`);
	} else {
		tempCode.push(`${tab(1)}let var_${i} = ${key}[${fieldNo}];`);
	}
	return tempCode;
}

function getCodeToRenderCSVDataType(def, i, _key) {
	let tempCode = [];
	if (def.type == 'Number') {
		tempCode.push(`${tab(1)}var_${i} = +var_${i};`);
	} else if (def.type == 'Boolean') {
		tempCode.push(`${tab(1)}var_${i} = commonUtils.convertToCSVBoolean(var_${i});`);
	} else if (def.type == 'Date') {
		tempCode.push(`${tab(1)}var_${i} = commonUtils.renderDate(var_${i}, '${def.properties.dateFormat || 'yyyy-MM-dd'}');`);
	} else {
		// code.push(`${tab(1)}_.get(item, '${(properties.dataPath || properties.key)}');`);
	}
	return tempCode;
}


function getCodeToParseFLATFILEDataType(def, i, key) {
	let tempCode = [];
	tempCode.push(`${tab(1)}let var_${i} = _.trim(${key}.splice(0,${def.properties.fieldLength}).join(''));`);
	if (def.type == 'Number') {
		tempCode.push(`${tab(1)}var_${i} = +var_${i};`);
	} else if (def.type == 'Boolean') {
		tempCode.push(`${tab(1)}var_${i} = commonUtils.convertToActualBoolean(var_${i});`);
	} else if (def.type == 'Date') {
		tempCode.push(`${tab(1)}var_${i} = commonUtils.parseDate(var_${i}, '${def.properties.dateFormat || 'yyyy-MM-dd'}');`);
	} else {
		// code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
	}
	return tempCode;
}

function getCodeToRenderFLATFILEDataType(def, i, _key) {
	let tempCode = [];
	if (def.type == 'Number') {
		tempCode.push(`${tab(2)}var_${i} = var_${i} + '';`);
	} else if (def.type == 'Boolean') {
		tempCode.push(`${tab(2)}var_${i} = commonUtils.convertToCSVBoolean(var_${i});`);
	} else if (def.type == 'Date') {
		tempCode.push(`${tab(2)}var_${i} = commonUtils.renderDate(var_${i}, '${def.properties.dateFormat || 'yyyy-MM-dd'}');`);
	} else {
		// tempCode.push(`${tab(2)}var_${i} = _.get(rowData, ${JSON.stringify(sourceKey)});`);
	}
	tempCode.push(`${tab(2)}var_${i} = (var_${i}||'').split('').slice(0, ${def.properties.fieldLength}).join('');`);
	tempCode.push(`${tab(2)}var_${i} = _.padEnd(var_${i}, ${def.properties.fieldLength}, ' ');`);
	return tempCode;
}


function parseDataStructuresForFileUtils(dataJson) {
	let code = [];
	code.push('/* eslint-disable quotes */');
	code.push('/* eslint-disable camelcase */');
	code.push('const _ = require(\'lodash\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaId => {
			const schema = dataJson.dataStructures[schemaId];
			const definition = dataJson.dataStructures[schemaId].definition;
			const formatType = dataJson.dataStructures[schemaId].formatType || 'JSON';
			if (!definition) {
				return;
			}
			// Function to return array of values;
			code.push(`function getValuesOf${schemaId}(data) {`);
			code.push(`${tab(1)}const values = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}values.push(_.get(data, '${properties.dataPath}') || '');`);
			});
			code.push(`${tab(1)}return values;`);
			code.push('}');
			// Function to return array of headers;
			code.push(`function getHeaderOf${schemaId}() {`);
			code.push(`${tab(1)}const headers = [];`);
			definition.forEach(def => {
				const properties = def.properties;
				code.push(`${tab(1)}headers.push('${properties.name}');`);
			});
			code.push(`${tab(1)}return headers;`);
			code.push('}');

			if (schema.subType == 'HRSF') {
				let headerKey = definition[0].properties.dataPath;
				let recordsKey = definition[1].properties.dataPath;
				let footerKey = definition[2].properties.dataPath;
				const headerDefinition = getDefinitionFromDataPath(_.cloneDeep(definition), headerKey);
				const recordsDefinition = getDefinitionFromDataPath(_.cloneDeep(definition), recordsKey);
				const footerDefinition = getDefinitionFromDataPath(_.cloneDeep(definition), footerKey);
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
					/**
					 * ***************************************
					 * parseDelimiterFile
					 * ***************************************
					 */
					code.push(`${tab(0)}function parseDelimiterFile${schemaId}(aoa) {`);
					code.push(`${tab(1)}let headerRow, recordsRows, footerRow;`);
					code.push(`${tab(1)}let data = {};`);
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
					headerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseCSVDataType(def, i, 'headerRow'));
						code.push(`${tab(2)}headers['${targetKey}'] = var_${i};`);
					});
					code.push(`${tab(2)}data['${headerKey}'] = headers;`);
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
					recordsDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseCSVDataType(def, i, 'item'));
						code.push(`${tab(2)}temp['${targetKey}'] = var_${i};`);
					});
					code.push(`${tab(3)}records.push(temp);`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}data['${recordsKey}'] = records;`);
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
					footerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseCSVDataType(def, i, 'footerRow'));
						code.push(`${tab(2)}footer['${targetKey}'] = var_${i};`);
					});
					code.push(`${tab(2)}data['${footerKey}'] = footer;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return data;`);
					code.push(`${tab(0)}}`);


					/**
					 * ***************************************
					 * renderDelimiterFile
					 * ***************************************
					 */
					code.push(`${tab(0)}function renderDelimiterFile${schemaId}(data) {`);
					code.push(`${tab(1)}let headerData, recordsData, footerData;`);
					code.push(`${tab(1)}let aoa = [];`);
					if (headerDefinition && headerDefinition.length > 0) {
						code.push(`${tab(1)}headerData = data['${headerKey}'];`);
					}
					if (recordsDefinition && recordsDefinition.length > 0) {
						code.push(`${tab(1)}recordsData = data['${recordsKey}'];`);
					}
					if (footerDefinition && footerDefinition.length > 0) {
						code.push(`${tab(1)}footerData = data['${footerKey}'];`);
					}
					/**
					 * =======================================
					 * Parse Header Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (headerData) {`);
					code.push(`${tab(2)}const headerRow = [];`);
					headerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(1)}let var_${i} = _.get(headerData, '${targetKey}');`);
						code = code.concat(getCodeToRenderCSVDataType(def, i));
						code.push(`${tab(1)}headerRow.push(var_${i});`);
					});
					code.push(`${tab(2)}aoa.push(headerRow);`);
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

					code.push(`${tab(1)}if (recordsData) {`);
					code.push(`${tab(2)}recordsData.forEach((item) => {`);
					code.push(`${tab(3)}const recordRow = [];`);
					recordsDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(3)}let var_${i} = _.get(item, '${targetKey}');`);
						code = code.concat(getCodeToRenderCSVDataType(def, i));
						code.push(`${tab(3)}recordRow.push(var_${i});`);
					});
					code.push(`${tab(3)}aoa.push(recordRow);`);
					code.push(`${tab(2)}});`);
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
					code.push(`${tab(1)}if (footerData) {`);
					code.push(`${tab(2)}const footerRow = {};`);
					footerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(1)}let var_${i} = _.get(footerData, '${targetKey}');`);
						code = code.concat(getCodeToRenderCSVDataType(def, i));
						code.push(`${tab(1)}footerRow.push(var_${i});`);
					});
					code.push(`${tab(2)}aoa.push(footerRow);`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return aoa;`);
					code.push(`${tab(0)}}`);
				}
				if (formatType === 'FLATFILE') {
					/**
					 * ***************************************
					 * parseFlatFile
					 * ***************************************
					 */
					code.push(`${tab(0)}function parseFlatFile${schemaId}(contents, isFirstRowHeader) {`);
					code.push(`${tab(1)}let lines = contents.split('\\n');`);
					code.push(`${tab(1)}let headerRow, recordsRows, footerRow;`);
					code.push(`${tab(1)}let data = {};`);
					if (headerDefinition && headerDefinition.length > 0) {
						code.push(`${tab(1)}headerRow = lines[0];`);
					}
					if (recordsDefinition && recordsDefinition.length > 0) {
						code.push(`${tab(1)}recordsRows = lines.splice(1);`);
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
					headerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseFLATFILEDataType(def, i, 'headerRowSegments'));
						code.push(`${tab(1)}_.set(header, '${targetKey}', var_${i});`);
					});
					code.push(`${tab(2)}data['${headerKey}'] = header;`);
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
					recordsDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseFLATFILEDataType(def, i, 'rowSegments'));
						code.push(`${tab(1)}_.set(tempData, '${targetKey}', var_${i});`);
					});
					code.push(`${tab(3)}records.push(tempData);`);
					code.push(`${tab(2)}});`);
					code.push(`${tab(2)}data['${recordsKey}'] = records;`);
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
					footerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code = code.concat(getCodeToParseFLATFILEDataType(def, i, 'footerRowSegments'));
						code.push(`${tab(1)}_.set(footer, '${targetKey}', var_${i});`);
					});
					code.push(`${tab(2)}data['${footerKey}'] = footer;`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return data;`);
					code.push(`${tab(0)}}`);

					/**
					 * ***************************************
					 * renderFlatFile
					 * ***************************************
					 */
					code.push(`${tab(0)}function renderFlatFile${schemaId}(data) {`);
					code.push(`${tab(1)}let lines = [];`);
					code.push(`${tab(1)}let headerData, recordsData, footerData;`);
					if (headerDefinition && headerDefinition.length > 0) {
						code.push(`${tab(1)}headerData = data['${headerKey}'];`);
					}
					if (recordsDefinition && recordsDefinition.length > 0) {
						code.push(`${tab(1)}recordsData = data['${recordsKey}'];`);
					}
					if (footerDefinition && footerDefinition.length > 0) {
						code.push(`${tab(1)}footerData = data['${footerKey}'];`);
					}
					/**
					 * =======================================
					 * Parse Header Start
					 * =======================================
					 */
					code.push(`${tab(1)}if (headerData) {`);
					code.push(`${tab(2)}let headerline = '';`);
					headerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(2)}let var_${i} = _.get(headerData, '${targetKey}');`);
						code = code.concat(getCodeToRenderFLATFILEDataType(def, i));
						code.push(`${tab(2)}headerline += var_${i};`);
					});
					code.push(`${tab(2)}lines.push(headerline);`);
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
					code.push(`${tab(1)}if (recordsData) {`);
					code.push(`${tab(2)}recordsData.forEach((rowData)=>{`);
					code.push(`${tab(3)}let rowline = '';`);
					recordsDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(2)}let var_${i} = _.get(rowData, '${targetKey}');`);
						code = code.concat(getCodeToRenderFLATFILEDataType(def, i));
						code.push(`${tab(2)}rowline += var_${i};`);
					});
					code.push(`${tab(3)}lines.push(rowline);`);
					code.push(`${tab(2)}});`);
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
					code.push(`${tab(1)}if (footerData) {`);
					code.push(`${tab(2)}let footerline = '';`);
					footerDefinition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						targetKey = targetKey.pop();
						code.push(`${tab(2)}let var_${i} = _.get(footerData, '${targetKey}');`);
						code = code.concat(getCodeToRenderFLATFILEDataType(def, i));
						code.push(`${tab(2)}footerline += var_${i};`);
					});
					code.push(`${tab(2)}lines.push(footerline);`);
					code.push(`${tab(1)}}`);
					/**
					 * =======================================
					 * Parse Footer End
					 * =======================================
					 */
					code.push(`${tab(1)}return lines.join('\\n');`);
					code.push(`${tab(0)}}`);
				}
			} else {
				if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
					// Function to Convert Data from CSV to JSON;
					code.push(`${tab(0)}function parseDelimiterFile${schemaId}(aoa, isFirstRowHeader) {`);
					code.push(`${tab(1)}let recordsRows = aoa;`);
					code.push(`${tab(1)}if(isFirstRowHeader){`);
					code.push(`${tab(2)}recordsRows = aoa.splice(1);`);
					code.push(`${tab(1)}}`);
					code.push(`${tab(1)}const records = [];`);
					code.push(`${tab(1)}recordsRows.forEach((rowData) => {`);
					code.push(`${tab(2)}const tempData = {};`);
					definition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						code = code.concat(getCodeToParseCSVDataType(def, i, 'rowData'));
						code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
					});
					code.push(`${tab(2)}records.push(tempData);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return records;`);
					code.push(`${tab(0)}}`);

					// Function to Convert Data from JSON to CSV;
					code.push(`${tab(0)}function renderDelimiterFile${schemaId}(records, addHeaderRow) {`);
					code.push(`${tab(1)}let aoa = [];`);
					code.push(`${tab(1)}if (addHeaderRow) {`);
					code.push(`${tab(2)}let headrow = [];`);
					//Iterate for Headers
					definition.filter(e => !e.properties.disabled).forEach((def, _i) => {
						code.push(`${tab(1)}headrow.push('${def.properties.name}');`);
					});
					code.push(`${tab(2)}aoa.push(headrow);`);
					code.push(`${tab(1)}}`);
					code.push(`${tab(1)}records.forEach((rowData) => {`);
					code.push(`${tab(2)}const row = [];`);
					definition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						code.push(`${tab(1)}let var_${i} = _.get(rowData, ${JSON.stringify(targetKey)});`);
						code = code.concat(getCodeToRenderCSVDataType(def, i));
						code.push(`${tab(1)}row.push(var_${i});`);
					});
					code.push(`${tab(2)}aoa.push(row);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return aoa;`);
					code.push(`${tab(0)}}`);
				}
				if (formatType === 'FLATFILE') {
					// Function to Read FLAT FILE data;
					code.push(`function parseFlatFile${schemaId}(contents, isFirstRowHeader) {`);
					code.push(`${tab(1)}let records = [];`);
					code.push(`${tab(1)}let rows = contents.split('\\n');`);
					code.push(`${tab(1)}if (isFirstRowHeader) {`);
					code.push(`${tab(2)}rows = rows.splice(1);`);
					code.push(`${tab(1)}}`);
					code.push(`${tab(1)}rows.forEach((rowData)=>{`);
					code.push(`${tab(1)}let tempData = {};`);
					code.push(`${tab(1)}let rowSegments = rowData.split('');`);
					definition.filter(e => !e.properties.disabled).forEach((def, i) => {
						let targetKey = _.cloneDeep(def.properties.dataPathSegs);
						code = code.concat(getCodeToParseFLATFILEDataType(def, i, 'rowSegments'));
						code.push(`${tab(1)}_.set(tempData, ${JSON.stringify(targetKey)}, var_${i});`);
					});
					code.push(`${tab(2)}records.push(tempData);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return records;`);
					code.push(`${tab(0)}}`);


					// Function to Write FLAT FILE data;
					code.push(`${tab(0)}function renderFlatFile${schemaId}(records, addHeaderRow) {`);
					code.push(`${tab(1)}let lines = [];`);
					code.push(`${tab(1)}if (addHeaderRow) {`);
					code.push(`${tab(2)}let headline = '';`);
					//Iterate for Headers
					definition.filter(e => !e.properties.disabled).forEach((def, i) => {
						code.push(`${tab(1)}let var_${i} = '${def.properties.name}';`);
						code.push(`${tab(1)}var_${i} = var_${i}.split('').slice(0, ${def.properties.fieldLength}).join('');`);
						code.push(`${tab(1)}var_${i} = _.padEnd(var_${i}, ${def.properties.fieldLength}, ' ');`);
						code.push(`${tab(1)}headline += var_${i};`);
					});
					code.push(`${tab(2)}lines.push(headline);`);
					code.push(`${tab(1)}}`);
					code.push(`${tab(1)}records.forEach((rowData)=>{`);
					code.push(`${tab(1)}let rowline = '';`);
					definition.filter(e => !e.properties.disabled).forEach((def, i) => {
						const sourceKey = def.properties.dataPathSegs;
						code.push(`${tab(2)}let var_${i} = _.get(rowData, ${JSON.stringify(sourceKey)});`);
						code = code.concat(getCodeToRenderFLATFILEDataType(def, i));
						code.push(`${tab(2)}rowline += var_${i};`);
					});
					code.push(`${tab(2)}lines.push(rowline);`);
					code.push(`${tab(1)}});`);
					code.push(`${tab(1)}return lines.join('\\n');`);
					code.push(`${tab(0)}}`);

				}
			}

			code.push(`module.exports.getValuesOf${schemaId} = getValuesOf${schemaId};`);
			code.push(`module.exports.getHeaderOf${schemaId} = getHeaderOf${schemaId};`);
			if (formatType === 'CSV' || formatType === 'DELIMITER' || formatType === 'EXCEL') {
				code.push(`module.exports.parseDelimiterFile${schemaId} = parseDelimiterFile${schemaId};`);
				code.push(`module.exports.renderDelimiterFile${schemaId} = renderDelimiterFile${schemaId};`);
			}
			if (formatType === 'FLATFILE') {
				code.push(`module.exports.parseFlatFile${schemaId} = parseFlatFile${schemaId};`);
				code.push(`module.exports.renderFlatFile${schemaId} = renderFlatFile${schemaId};`);
			}
		});
	}
	return code.join('\n');
}


module.exports.parseDataStructuresForFileUtils = parseDataStructuresForFileUtils;