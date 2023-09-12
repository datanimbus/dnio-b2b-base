const chai = require('chai');
const { maskStringData } = require('./common.utils'); // Replace 'your-module' with the actual module path

const { expect } = chai;

describe('maskStringData', () => {
	it('should return an empty string for an empty input', () => {
		const result = maskStringData('', 'all', 5);
		expect(result).to.equal('');
	});
	

	it('should default to masking 5 characters if charsToShow is not provided', () => {
		const input = '1234567890';
		const result = maskStringData(input, 'partial');
		expect(result).to.equal('*****67890');
	});

	it('should mask all characters if maskType is "all"', () => {
		const input = 'password123';
		const result = maskStringData(input, 'all');
		expect(result).to.equal('***********');
	});

	it('should mask only some characters if maskType is not "all"', () => {
		const input = 'password123';
		const result = maskStringData(input, 'partial', 4);
		expect(result).to.equal('*******d123');
	});
});
