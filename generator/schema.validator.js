const fs = require('fs');
const Ajv = require('ajv');
const ajv = new Ajv();

let schema = fs.readFileSync('../flow.schema.json').toString();
schema = JSON.parse(schema);
const validate = ajv.compile(schema);

module.exports = (flowDefinition) => {
	const valid = validate(flowDefinition);
	if (!valid) throw Error(ajv.errorsText(validate.errors));
	else console.log('Flow definition is valid');
}