
/**
 *
 * @param {object} flowData The Data Stack schema flowData
 */
function convertToJSONSchema(flowData) {
	const tempSchema = {
		$schema: 'http://json-schema.org/draft-07/schema#',
		$id: `http://appveen.com/${flowData._id}.schema.json`,
		title: flowData._id,
		type: 'object'
	};
	const converted = getProperties(flowData.definition);
	tempSchema.properties = converted.properties;
	tempSchema.required = converted.required;
	return tempSchema;
}


function getProperties(definition) {
	const required = [];
	const properties = {};
	definition.forEach(def => {
		let dataKey = def.key;
		if (def.properties.dataKey) {
			dataKey = def.properties.dataKey;
		}
		const dataTypes = [];
		if (def.type.toLowerCase() === 'date'
			|| def.type.toLowerCase() === 'user'
			|| def.type.toLowerCase() === 'geojson'
			|| def.type.toLowerCase() === 'file') {
			def.type = 'string';
		}
		dataTypes.push(def.type.toLowerCase());
		if (!def.properties.required) {
			dataTypes.push('null');
		}
		properties[dataKey] = {
			type: dataTypes,
			description: def.properties.description
		};
		if (def.type === 'Object') {
			const converted = getProperties(def.definition);
			properties[dataKey].properties = converted.properties;
			properties[dataKey].required = converted.required;
		} else if (def.type === 'Array') {
			properties[dataKey].items = {};
			properties[dataKey].items.type = def.definition[0].type.toLowerCase();
			if (def.definition[0].type === 'Object') {
				const converted = getProperties(def.definition[0].definition);
				properties[dataKey].items.properties = converted.properties;
				properties[dataKey].items.required = converted.required;
			} else {
				const validations = getValidations(def.definition[0]);
				Object.assign(properties[dataKey].items, validations);
			}
		} else {
			const validations = getValidations(def);
			Object.assign(properties[dataKey], validations);
		}
		if (def.properties.required) {
			required.push(dataKey);
		}
	});
	return {
		properties,
		required
	};
}


function getValidations(def) {
	const properties = {};
	if (def.properties.min != null && def.properties.min != undefined) {
		properties.minimum = parseInt(def.properties.min);
	}
	if (def.properties.max != null && def.properties.max != undefined) {
		properties.maximum = parseInt(def.properties.max);
	}
	if (def.properties.minlength != null && def.properties.minlength != undefined) {
		properties.minLength = parseInt(def.properties.minlength);
	}
	if (def.properties.maxlength != null && def.properties.maxlength != undefined) {
		properties.maxLength = parseInt(def.properties.maxlength);
	}
	if (def.properties.pattern != null && def.properties.pattern != undefined) {
		properties.pattern = def.properties.pattern;
	}
	if (def.properties.enum != null && def.properties.enum != undefined) {
		properties.enum = def.properties.enum;
	}
	if (def.properties.precision != null && def.properties.precision != undefined) {
		if (def.properties.precision > 0) {
			const decimals = new Array(def.properties.precision);
			decimals.fill(0);
			decimals.pop();
			decimals.push(1);
			decimals.unshift('.');
			decimals.unshift(0);
			properties.multipleOf = parseFloat(decimals.join(''));
		} else {
			properties.type = 'integer';
		}
	}
	return properties;
}


module.exports.convertToJSONSchema = convertToJSONSchema;  