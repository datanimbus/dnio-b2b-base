/**
 * This module will create a definition file from the configuration provided by the user
 */

const _ = require('lodash');
const commonUtils = require('../utils/common.utils');

const mongooseFields = ['required', 'default', 'index', 'select', 'lowercase', 'uppercase', 'trim', 'match', 'enum', 'min', 'max', 'minlength', 'maxlength'];
function filterMongooseFields(schemaObj) {
	let newObj = _.pick(schemaObj, mongooseFields, 'type');
	if (!newObj['required']) delete newObj.required;
	if (!newObj['unique']) delete newObj.unique;
	return newObj;
}

function processSchema(schemaArr, mongoSchema, nestedKey, specialFields) {
	if (schemaArr[0] && schemaArr[0].key == '_self') {
		let attribute = schemaArr[0];
		if (attribute['properties'] && (attribute['properties']['password'] && !attribute['properties']['fileType'])) {
			specialFields['secureFields'].push(nestedKey);
		}
		if (attribute['properties'] && (attribute['properties']['fileType'])) {
			specialFields['fileFields'].push(nestedKey);
		}
		if (attribute['type'] === 'Object' && !attribute['properties']['schemaFree']) {
			processSchema(attribute['definition'], mongoSchema, nestedKey, specialFields);
		}
		else if (attribute['type'] === 'User') {
			processSchema(attribute['definition'], mongoSchema, nestedKey, specialFields);
		} else if (attribute['type'] === 'Array') {
			mongoSchema[0] = attribute['definition'][0]['type'] === 'Array' ? [] : {};
			processSchema(attribute['definition'], mongoSchema[0], nestedKey, specialFields);
		} else {
			mongoSchema['type'] = attribute['type'];
			if (attribute['properties']) {
				Object.keys(attribute['properties']).forEach(scKey => {
					if (mongooseFields.indexOf(scKey) > -1)
						mongoSchema[scKey] = attribute['properties'][scKey];
				});
				if (mongoSchema['enum'] && !mongoSchema['required']) {
					mongoSchema['enum'].push(null);
				}
				if (mongoSchema['enum'] && mongoSchema['type'] == 'Number') {
					let enumVal = mongoSchema['enum'].filter(val => val != null);
					const functionBody = mongoSchema['required'] ? `return [${enumVal}].indexOf(value) > -1` : `return value == null || [${enumVal}].indexOf(value) > -1`;
					mongoSchema['validate'] = [new Function('value', functionBody), 'No enum match founds'];
				}
				if (mongoSchema['type'] == 'Number') {
					const functionBody = `
					if(!value) return true;
					return Number.isFinite(value);
					`;
					const validationObj = { validator: new Function('value', functionBody) };
					if (mongoSchema['validate'])
						mongoSchema['validate'].push(validationObj);
					else {
						mongoSchema['validate'] = [validationObj];
					}
				}
			}
			if (attribute['type'] == 'Number' && attribute['properties'] && (attribute['properties']['precision'] || attribute['properties']['precision'] === 0)) {
				specialFields['precisionFields'].push({ field: nestedKey, precision: attribute['properties']['precision'] });
			}
			if (attribute['properties'] && attribute['properties']['dateType']) {
				specialFields['dateFields'].push({ field: nestedKey, dateType: attribute['properties']['dateType'], defaultTimezone: attribute['properties']['defaultTimezone'] });
			}
			// if (attribute['properties'] && (attribute['properties']['password'])) {
			// 	specialFields['secureFields'].push(nestedKey);
			// }
		}
	} else {
		schemaArr.forEach((attribute) => {
			let newNestedKey = (attribute.properties.dataPath || attribute.key);
			let key = newNestedKey.split('.').pop();
			if (attribute['type'] === 'Array') {
				mongoSchema[key] = {};
				mongoSchema[key]['type'] = [];
				if (attribute['definition']['properties'] && attribute['definition']['properties']['email']) {
					const functionBody = `
					if(value == null) return true;
					if(value.length == 0) return false;
					var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
					if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;
					const validationObj = { validator: new Function('value', functionBody), msg: key + ' is not a valid email' };
					if (mongoSchema[key]['validate'])
						mongoSchema[key]['validate'].push(validationObj);
					else {
						mongoSchema[key]['validate'] = [validationObj];
					}
				}
				if (attribute['definition'][0]['type'] === 'Array') {
					mongoSchema[key]['type'][0] = [];
					if (attribute['definition'][0]['properties'] && attribute['definition'][0]['properties']['email']) {
						const functionBody = `
						if(value == null) return true;
						if(value.length == 0) return false;
						var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
					if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;
						const validationObj = { validator: new Function('value', functionBody), msg: key + ' is not a valid email' };
						if (mongoSchema[key]['validate'])
							mongoSchema[key]['validate'].push(validationObj);
						else {
							mongoSchema[key]['validate'] = [validationObj];
						}
					}
				} else {
					mongoSchema[key]['type'][0] = {};
				}
				processSchema(attribute['definition'], mongoSchema[key]['type'][0], newNestedKey, specialFields);
			} else if (attribute['type'] === 'Object') {
				mongoSchema[key] = {};
				if (attribute['properties'] && attribute['properties']['schemaFree']) {
					return;
				}
				if (attribute['properties'] && (attribute['properties']['geoType'] || attribute['properties']['relatedTo'] || attribute['properties']['fileType'] || attribute['properties']['password'] || attribute['properties']['dateType'])) {
					mongoSchema[key]['type'] = {};
					processSchema(attribute['definition'], mongoSchema[key]['type'], newNestedKey, specialFields);
				} else {
					processSchema(attribute['definition'], mongoSchema[key], newNestedKey, specialFields);
				}
			}
			else if (attribute['type'] === 'User') {
				mongoSchema[key] = {};
				mongoSchema[key]['type'] = {};
				processSchema(attribute['definition'], mongoSchema[key]['type'], newNestedKey, specialFields);

			}
			// else if(attribute['type'] === 'Date') {

			// } 
			else {
				mongoSchema[key] = {};
				if (attribute['properties'])
					mongoSchema[key] = filterMongooseFields(attribute['properties']);

				mongoSchema[key]['type'] = attribute['type'];
			}
			if (attribute['properties']) {
				Object.keys(attribute['properties']).forEach(keyOfObj => {
					if (mongooseFields.indexOf(keyOfObj) > -1) {
						if (keyOfObj == 'default' && attribute['properties']['dateType']) {
							let dateValue = { 'rawData': attribute['properties'][keyOfObj] };
							mongoSchema[key][keyOfObj] = dateValue;
							// let defaultDate = commonUtils.getFormattedDate(null, dateValue, attribute['properties']['defaultTimezone'], []);
							// mongoSchema[key][keyOfObj] = defaultDate;
						} else {
							mongoSchema[key][keyOfObj] = attribute['properties'][keyOfObj];
						}
						if (!mongoSchema[key]['required']) delete mongoSchema[key].required;
						if (!mongoSchema[key]['unique']) delete mongoSchema[key].unique;
					}
				});
				if (mongoSchema[key]['enum'] && !mongoSchema[key]['required']) {
					mongoSchema[key]['enum'].push(null);
				}
				if (mongoSchema[key]['enum'] && mongoSchema[key]['type'] == 'Number') {
					let enumVal = mongoSchema[key]['enum'].filter(val => val != null);
					const functionBody = mongoSchema[key]['required'] ? `return [${enumVal}].indexOf(value) > -1` : `return value == null || [${enumVal}].indexOf(value) > -1`;
					mongoSchema[key]['validate'] = [{ validator: new Function('value', functionBody), msg: 'No enum match found for ' + key }];
				}
				if (mongoSchema[key]['required'] && mongoSchema[key]['type'] == 'String') {
					const functionBody = 'value = _.trim(value);\n return !_.isEmpty(value);';
					mongoSchema[key]['validate'] = [{ validator: new Function('value', functionBody), msg: key + ' is empty.' }];
				}
				if (attribute['properties']['email']) {
					const functionBody = `
					if(value == null) return true;
					if(value.length == 0) return false;
					var re = /^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/i;
					
					if(Array.isArray(value))
					{

						let flag=true;
						value.forEach(e => {
							
							flag= flag&&  re.test(e);
						});
						return flag;
					}else{
						return re.test(value);
					}`;

					const validationObj = { validator: new Function('value', functionBody), msg: key + ' is not a valid email' };
					if (mongoSchema[key]['validate'])
						mongoSchema[key]['validate'].push(validationObj);
					else {
						mongoSchema[key]['validate'] = [validationObj];
					}
				}
				if (attribute['properties']['pattern']) {
					let functionBody;
					if (attribute['properties']['password']) {
						functionBody = `
						var re = /${attribute['properties']['pattern']}/;
						if(value && value.value && value.value.trim()){
							var arr = re.exec(value.value.trim());
							if(!arr) return false;
							return (arr[0] == arr.input);
							// return re.test(value.value);
						}
						return true;
						`;
					} else {
						functionBody = `
						var re = /${attribute['properties']['pattern']}/;
						if(value && value.trim()){
							var arr = re.exec(value.trim());
							if(!arr) return false;
							return (arr[0] == arr.input);
							// return re.test(value);
						}
						return true;
						`;
					}
					const validationObj = { validator: new Function('value', functionBody), msg: key + ' regex is invalid' };
					if (mongoSchema[key]['validate'])
						mongoSchema[key]['validate'].push(validationObj);
					else {
						mongoSchema[key]['validate'] = [validationObj];
					}
				}
				if (attribute['type'] == 'Number') {
					const functionBody = `
					if(!value) return true;
					return Number.isFinite(value);
					`;
					const validationObj = { validator: new Function('value', functionBody) };
					if (mongoSchema[key]['validate'])
						mongoSchema[key]['validate'].push(validationObj);
					else {
						mongoSchema[key]['validate'] = [validationObj];
					}
				}
				if (attribute['type'] == 'Number' && attribute['properties'] && (attribute['properties']['precision'] || attribute['properties']['precision'] === 0)) {
					specialFields['precisionFields'].push({ field: newNestedKey, precision: attribute['properties']['precision'] });
				}
				if (attribute['properties'] && attribute['properties']['dateType']) {
					specialFields['dateFields'].push({ field: newNestedKey, dateType: attribute['properties']['dateType'], defaultTimezone: attribute['properties']['defaultTimezone'] });
				}
				if (attribute['properties'] && attribute['properties']['createOnly']) {
					specialFields['createOnlyFields'].push(newNestedKey);
				}
				if (attribute['properties'] && attribute['properties']['password'] && !attribute['properties']['fileType']) {
					specialFields['secureFields'].push(newNestedKey);
				}
				if (attribute['properties'] && attribute['properties']['fileType']) {
					specialFields['fileFields'].push(newNestedKey);
				}
				if (attribute['properties'] && attribute['properties']['unique'] && !attribute['properties']['password']) {
					let locale = attribute['properties'].locale || 'en';
					specialFields['uniqueFields'].push({ key: newNestedKey, locale });
				}
				if (attribute['properties'] && attribute['properties']['unique'] && (attribute['properties']['relatedTo'] || attribute['type'] === 'User')) {
					delete mongoSchema[key]['unique'];
					delete mongoSchema[key]['uniqueCaseInsensitive'];
					specialFields['relationUniqueFields'].push(newNestedKey);
				}
				if (attribute['properties'] && attribute['properties']['required'] && (attribute['properties']['relatedTo'] || attribute['type'] === 'User')) {
					// specialFields['relationRequiredFields'].push(newNestedKey);
					const functionBody = '_id = value && value._id ?_.trim(value._id) : null;\n return !_.isEmpty(_id);';
					mongoSchema[key]['validate'] = [{ validator: new Function('value', functionBody), msg: key + '._id is empty.' }];
				}
				if (attribute['properties'] && attribute['properties']['default'] && (attribute['properties']['relatedTo'] || attribute['type'] === 'User')) {
					mongoSchema[key]['default'] = { '_id': attribute['properties']['default'] };
				}
			}
		});
	}
}

let stringify = function (obj) {
	var placeholder = '____PLACEHOLDER____';
	var fns = [];
	var json = JSON.stringify(obj, function (key, value) {
		if (typeof value === 'function') {
			fns.push(value);
			return placeholder;
		}
		return value;
	}, 4);
	json = json.replace(new RegExp('"' + placeholder + '"', 'g'), function () {
		return fns.shift();
	});
	return json;
};

function generateDefinition(config) {
	let id = config._id;
	console.log(`GenerateDefinition :: ${id}`);
	let data = config.definition;
	var definition = {};
	let specialFields = {
		createOnlyFields: [],
		precisionFields: [],
		secureFields: [],
		uniqueFields: [],
		fileFields: [],
		relationUniqueFields: [],
		dateFields: [],
		// relationRequiredFields: []
	};
	try {
		processSchema(data, definition, null, specialFields);
	} catch (e) {
		console.log(`GenerateDefinition :: ${id} :: Schema invalid`);
		console.log(`GenerateDefinition :: ${id} :: ${e.message}`);
		throw new Error('Schema invalid');
	}
	config.createOnlyFields = specialFields.createOnlyFields;
	config.precisionFields = specialFields.precisionFields;
	config.secureFields = specialFields.secureFields;
	config.fileFields = specialFields.fileFields;
	config.uniqueFields = specialFields.uniqueFields;
	config.dateFields = specialFields.dateFields;
	config.relationUniqueFields = specialFields.relationUniqueFields;
	// config.relationRequiredFields = specialFields.relationRequiredFields;
	definition['_id'] = {
		type: 'String'
	};

	definition['_expireAt'] = {
		type: 'Date'
	};
	definition['_metadata'] = {
		type: {
			version: {
				type: {
					service: { type: 'Number', default: 0 },
					release: { type: 'String', default: 0 }
				}
			},
			filemapper: { type: 'String' },
			workflow: { type: 'String' }
		}
	};
	return 'const _ = require(\'lodash\');\n var definition = ' + stringify(definition) + ';\nmodule.exports.definition=definition;';
}

async function parseDataStructures(dataJson) {
	const code = ['/* eslint-disable camelcase */', ''];
	code.push('const fs = require(\'fs\');');
	code.push('const path = require(\'path\');');
	code.push('const log4js = require(\'log4js\');');
	code.push('const mongoose = require(\'mongoose\');');
	code.push('const _ = require(\'lodash\');');
	code.push('');
	code.push('const mongooseUtils = require(\'../../utils/mongoose.utils\');');
	code.push('');
	code.push('const logger = log4js.getLogger(global.loggerName);');
	code.push('');

	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		await Object.keys(dataJson.dataStructures).reduce(async (prev, schemaID) => {
			try {
				await prev;
				let schema = dataJson.dataStructures[schemaID];
				code.push(`const counterOptions_${schemaID} = {};`);
				code.push(`const definition_${schemaID} = require('../schemas/${schemaID}.definition').definition;`);
				if (schemaID.startsWith('SRVC')) {
					let dataService = await commonUtils.getDataService(schemaID);
					if (dataService.schemaFree) {
						code.push(`const schema_${schemaID} = mongooseUtils.MakeSchema(definition_${schemaID}, { strict: false });`);
					} else {
						code.push(`const schema_${schemaID} = mongooseUtils.MakeSchema(definition_${schemaID});`);
					}
					code.push(`counterOptions_${schemaID}.prefix = '${dataService.definition[0].prefix}';`);
					code.push(`counterOptions_${schemaID}.counterName = '${dataService.collectionName}';`);
					code.push(`counterOptions_${schemaID}.suffix = '${dataService.definition[0].suffix}';`);
					code.push(`counterOptions_${schemaID}.padding = '${dataService.definition[0].padding}';`);
					code.push(`counterOptions_${schemaID}.counter = '${dataService.definition[0].counter}';`);
					code.push(`schema_${schemaID}.plugin(mongooseUtils.metadataPlugin(counterOptions_${schemaID}));`);
					code.push(`let model_${schemaID} = mongoose.model('${schemaID}');`);
					code.push(`if (!model_${schemaID}) {`);
					code.push(`model_${schemaID} = mongoose.model('${schemaID}', schema_${schemaID}, '${dataService.collectionName}');`);
					code.push('}');
					code.push(`let model_${schemaID} = mongoose.model('${schemaID}', schema_${schemaID}, '${dataService.collectionName}');`);
					code.push('');
					code.push('');
				} else if (schemaID.startsWith('DF')) {
					code.push(`const schema_${schemaID} = mongooseUtils.MakeSchema(definition_${schemaID});`);
					code.push(`counterOptions_${schemaID}.prefix = '${_.toUpper(schema.name.substring(0, 3))}';`);
					code.push(`counterOptions_${schemaID}.counterName = 'dataformat.${schemaID}';`);
					code.push(`counterOptions_${schemaID}.suffix = null;`);
					code.push(`counterOptions_${schemaID}.padding = null;`);
					code.push(`counterOptions_${schemaID}.counter = 1001;`);
					code.push(`schema_${schemaID}.plugin(mongooseUtils.metadataPlugin(counterOptions_${schemaID}));`);
					code.push(`let model_${schemaID} = mongoose.model('${schemaID}');`);
					code.push(`if (!model_${schemaID}) {`);
					code.push(`model_${schemaID} = mongoose.model('${schemaID}', schema_${schemaID}, 'dataformat.${schemaID}');`);
					code.push('}');
					code.push('');
					code.push('');
				}
				code.push(`async function validate_schema_${schemaID} (data) {`);
				code.push('\tlet error = null;');
				code.push('\ttry {');
				code.push(`\t\tlet document_${schemaID} = new model_${schemaID}(data);`);
				code.push(`\t\tawait document_${schemaID}.validate();`);
				code.push('\t} catch(err) {');
				code.push('\t\tlogger.error(err);');
				code.push('\t\terror = err;');
				code.push('\t} finally {');
				code.push('\t\treturn error;');
				code.push('\t}');
				code.push('}');
				code.push(`module.exports.validate_schema_${schemaID} = validate_schema_${schemaID};`);
			} catch (err) {
				console.log(err);
			}
		}, Promise.resolve());
	}
	return code.join('\n');
}

module.exports.generateDefinition = generateDefinition;
module.exports.parseDataStructures = parseDataStructures;