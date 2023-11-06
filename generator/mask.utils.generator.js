function tab(len) {
	let d = '';
	while (len > 0) {
		d += '\t';
		len--;
	}
	return d;
}

function parseDataStructuresForMasking(dataJson) {
	let code = [];
	code.push('/* eslint-disable quotes */');
	code.push('/* eslint-disable camelcase */');
	code.push('const _ = require(\'lodash\');');
	code.push('const commonUtils = require(\'./common.utils\');');
	if (dataJson.dataStructures && Object.keys(dataJson.dataStructures).length > 0) {
		Object.keys(dataJson.dataStructures).forEach(schemaId => {
			const definition = dataJson.dataStructures[schemaId].definition;
			// const formatType = dataJson.dataStructures[schemaId].formatType || 'JSON';
			// Function to return array of values;
			code.push(`function maskDataFor${schemaId} (data) {`);
			code = code.concat(parseForMasking(definition));
			code.push(`${tab(1)}return data;`);
			code.push(`${tab(0)}}`);

			code.push(`${tab(0)}module.exports.maskDataFor${schemaId} = maskDataFor${schemaId};`);
		});
	}

	code.push(`${tab(0)}function maskCommon (data) {`);
	console.log(dataJson.appData.maskingPaths);
	(dataJson.appData.maskingPaths || []).forEach((item, i) => {
		item.index = i;
		if (item.dataPath.indexOf('[#]') > -1) {
			let path = JSON.parse(item.dataPath);
			let arrayIndexes = path.map((e, i) => {
				if (e == '[#]') return i;
			}).filter(e => e).reverse();
			let multiPaths = [];
			for (let index = 0; index < arrayIndexes.length; index++) {
				const arrCurrIndex = arrayIndexes[index];
				let temp = path.splice(arrCurrIndex);
				temp.splice(0, 1);
				multiPaths.push(temp);
			}
			multiPaths.push(path);
			multiPaths.reverse();
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}// Masking of ${item.dataPath} Start`);
			code.push(`${tab(3)}// =========================================`);
			code = code.concat(maskRecursive(item, multiPaths, 'data', 0));
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}`);
		} else {
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}// Masking of ${item.dataPath} Start`);
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}let var_${i} = _.get(data, ${item.dataPath});`);
			code.push(`${tab(3)}if(var_${i}) {`);
			code.push(`${tab(4)}var_${i} = commonUtils.maskStringData(var_${i}, '${item.maskType}', ${item.chars});`);
			code.push(`${tab(4)}_.set(data, ${item.dataPath}, var_${i});`);
			code.push(`${tab(3)}}`);
			code.push(`${tab(3)}// =========================================`);
			code.push(`${tab(3)}`);
		}
	});
	code.push(`${tab(1)}return data;`);
	code.push(`${tab(0)}}`);
	code.push(`${tab(0)}module.exports.maskCommon = maskCommon;`);
	function maskRecursive(maskConfig, multiPaths, prev, i) {
		let tempCode = [];
		let curr = multiPaths[i];
		let varName = `var_${maskConfig.index}_${i}`;
		tempCode.push(`${tab(0)}let ${varName} = _.get(${prev}, ${JSON.stringify(curr)});`);
		tempCode.push(`${tab(0)}if (${varName}) {`);
		tempCode.push(`${tab(0)}if (_.isArray(${varName})) {`);
		tempCode.push(`${tab(0)}let new_${varName} = ${varName}.map(item=>{`);
		if (multiPaths.length - 1 == i) {
			// Mask Item
			tempCode.push(`${tab(0)}item = commonUtils.maskStringData(item, '${maskConfig.maskType}', ${maskConfig.chars});`);
		} else {
			tempCode = tempCode.concat(maskRecursive(maskConfig, multiPaths, 'item', i + 1));
		}
		tempCode.push(`${tab(0)}return item;`);
		tempCode.push(`${tab(0)}});`);
		tempCode.push(`${tab(0)}_.set(${prev}, ${JSON.stringify(curr)}, new_${varName});`);
		tempCode.push(`${tab(0)}} else {`);
		if (multiPaths.length - 1 == i) {
			// Mask ${varName}
			tempCode.push(`${tab(0)}${varName} = commonUtils.maskStringData(${varName}, '${maskConfig.maskType}', ${maskConfig.chars});`);
		} else {
			tempCode = tempCode.concat(maskRecursive(maskConfig, multiPaths, varName, i + 1));
		}
		tempCode.push(`${tab(0)}_.set(${prev}, ${JSON.stringify(curr)}, ${varName});`);
		tempCode.push(`${tab(0)}}`);
		tempCode.push(`${tab(0)}}`);
		return tempCode;
	}

	function parseForMasking(definition, isArray) {
		let tempCode = [];
		if (!definition) {
			return tempCode;
		}
		definition.forEach((def, i) => {
			let properties = def.properties;
			let dataPathSegs = properties.dataPathSegs;
			if (def.type == 'Object') {
				tempCode = tempCode.concat(parseForMasking(def.definition));
			} else if (def.type == 'Array') {
				if (def.definition[0].type == 'Object') {
					tempCode.push(`${tab(1)}let arr_var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
					tempCode.push(`${tab(1)}if(arr_var_${i} && !_.isEmpty(arr_var_${i})){`);
					tempCode.push(`${tab(2)}arr_var_${i} = arr_var_${i}.map((item) => {`);
					tempCode = tempCode.concat(parseForMasking(def.definition[0].definition, true));
					// tempCode.push(`${tab(3)}return commonUtils.maskStringData(item, '${properties.masking}', ${chars});`);
					tempCode.push(`${tab(3)}return item;`);
					tempCode.push(`${tab(2)}});`);
					tempCode.push(`${tab(1)}}`);
					tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, arr_var_${i});`);
				} else {
					properties.masking = def.definition[0].properties.masking;
					if (properties.masking && properties.masking.startsWith('some') || properties.masking == 'all') {
						let chars = parseInt(properties.masking.split('_')[1], 10);
						tempCode.push(`${tab(1)}let var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
						tempCode.push(`${tab(1)}if(var_${i} && !_.isEmpty(var_${i})){`);
						tempCode.push(`${tab(2)}var_${i} = var_${i}.map((item) => {`);
						tempCode.push(`${tab(3)}return commonUtils.maskStringData(item, '${properties.masking}', ${chars});`);
						tempCode.push(`${tab(2)}});`);
						tempCode.push(`${tab(1)}}`);
						tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, var_${i});`);
					}
				}
			} else {
				if (properties.masking) {
					if (properties.masking.startsWith('some') || properties.masking == 'all') {
						let hashIndex = dataPathSegs.indexOf('[#]');
						if (hashIndex > -1) {
							dataPathSegs = dataPathSegs.splice(hashIndex + 1);
						}
						let chars = parseInt(properties.masking.split('_')[1], 10);
						tempCode.push(`${tab(1)}let var_${i} = _.get(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)});`);
						tempCode.push(`${tab(1)}if(var_${i} && _.trim(var_${i})){`);
						tempCode.push(`${tab(2)}var_${i} = commonUtils.maskStringData(var_${i}, '${properties.masking}', ${chars});`);
						tempCode.push(`${tab(1)}}`);
						tempCode.push(`${tab(1)}_.set(${isArray ? 'item' : 'data'}, ${JSON.stringify(dataPathSegs)}, var_${i});`);
					}
				}
			}
		});
		return tempCode;
	}
	return code.join('\n');
}

module.exports.parseDataStructuresForMasking = parseDataStructuresForMasking;