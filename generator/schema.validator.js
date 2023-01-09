const fs = require('fs');
const Ajv = require('ajv');
const ajv = new Ajv();

let schema = fs.readFileSync('../flow.schema.json').toString();
schema = JSON.parse(schema);
const validate = ajv.compile(schema);

const cl = console.log;

function checkFlowGraph(flowDefinition) {
	console.log('Checking node dependency graph');
	let nodes = [];
	let dg = {
		i: { s: [], e: [] },
		e: { s: [], e: [] }
	};
	cl(`Flow name - ${flowDefinition.name}`);
	flowDefinition.inputNode.onSuccess.forEach(node => {
		if (nodes.indexOf(node._id) != -1) nodes.push(node._id);
		dg.i.s.push(node._id);
	});
	flowDefinition.inputNode.onError.forEach(node => {
		if (nodes.indexOf(node._id) != -1) nodes.push(node._id);
		dg.i.e.push(node._id);
	});
	flowDefinition.nodes.forEach(node => {
		dg[node._id] = { s: [], e: [] };
		if (nodes.indexOf(node._id) == -1) nodes.push(node._id);

		node.onSuccess.forEach(node => {
			if (nodes.indexOf(node._id) != -1) nodes.push(node._id);
			dg[node._id].s.push(node._id);
		});
		node.onError.forEach(node => {
			if (nodes.indexOf(node._id) != -1) nodes.push(node._id);
			dg[node._id].e.push(node._id);
		});
	});
	flowDefinition.error.forEach(node => {
		dg[node._id] = { s: [], e: [] };
		node.onSuccess.forEach(node => dg[node._id].s.push(node._id));
		node.onError.forEach(node => dg[node._id].e.push(node._id));
	});
	cl(nodes);
	cl(dg);
}

module.exports = (flowDefinition) => {
	const valid = validate(flowDefinition);
	if (!valid) throw Error(ajv.errorsText(validate.errors));
	console.log('Flow definition is valid');
	checkFlowGraph(flowDefinition);
};