'use strict'

const dynamoose = require('dynamoose')
const utils = require('../lib/utils')

const productSchema = new dynamoose.Schema({
	id: String,
	name: String,
	description: String,
	brand: String,
	images: {
		type: Array,
		schema: [String],
		required: false,
		default: [],
	},
	seller: String,
	price: Number,
	qty: Number,
	category: String,
}, {
	'timestamps': {
		'createdAt': ['createDate', 'creation'],
		'updatedAt': ['updateDate', 'updated'],
	},
})

module.exports = dynamoose.model(utils.dbCons.COLLECTION_PRODUCTS, productSchema)


