const fs = require('fs');
const Ajv = require('ajv');
const ajv = new Ajv();

let schema = fs.readFileSync('../flow.schema.json').toString();
schema = JSON.parse(schema);

let flowData = fs.readFileSync('../test/test.01.simpleAPI.json').toString();
flowData = JSON.parse(flowData);

const validate = ajv.compile(schema);
const valid = validate(flowData);
if (!valid) {
	console.log(ajv.errorsText(validate.errors));
}
else console.log('Valid');