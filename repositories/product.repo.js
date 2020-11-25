'use strict'

require('../models/product.model')
const utils = require('../lib/utils')
const dynamoose = require('dynamoose')
const { v4: uuidv4 } = require('uuid')

const productCollection = utils.dbCons.COLLECTION_PRODUCTS
const Product = dynamoose.model(utils.dbCons.COLLECTION_PRODUCTS)

module.exports.insertOne = async (documentJSON) => {
	try {
		documentJSON.id = uuidv4()
		const newProduct = new Product(documentJSON)
		utils.logger.debug(`Product Details Object Data to Add ${JSON.stringify(newProduct)}`)
		return await newProduct.save()
	} catch (e) {
		utils.logger.error(`error while saving data to dynamo db, collection : ${productCollection}`, e)
		throw new Error('Unable to add Products')
	}
}

module.exports.findOne = async (hasKey) => {
	try {
		utils.logger.debug(`query to find products ${JSON.stringify(hasKey)}`)
		const result = await Product.query("id").eq(hasKey).exec()

		utils.logger.debug(`products matching find query : ${JSON.stringify(result)}`)
		return result
	} catch (e) {
		utils.logger.error(`error while finding data from collection : ${utils.dbCons.COLLECTION_PRODUCTS} for query ${hasKey}`, e)
		throw new Error("Error finding products for given query")
	}
}

module.exports.findAll = async () => {
	try {

		const result = await Product.scan().exec()
		utils.logger.debug(`products matching find query : ${JSON.stringify(result)}`)
		return result
	} catch (e) {
		utils.logger.error(`error while finding data from collection : ${utils.dbCons.COLLECTION_PRODUCTS} `, e)
		throw new Error("Error finding products for given query")
	}
}

module.exports.deleteProduct = async (productID) => {
	try {
		utils.logger.debug(`Query to update ${JSON.stringify({id: productID})}`)
		await Product.delete({id: productID})
		return await Product.query("id").eq(productID).exec()
	} catch (e) {
		utils.logger.error(`error while updating data to DynamoDB, collection : ${productCollection} for product id ${productID}`, e)
		return new Error("Invalid Data")
	}
}

module.exports.updateProductById = async (productID, dataToUpdate) => {
	try {
		utils.logger.debug("Product Object Data", dataToUpdate)
		utils.logger.debug(`Query for update ${JSON.stringify({id: productID})}`, `data to update = ${JSON.stringify( dataToUpdate)}`)
		await Product.update({id: productID}, dataToUpdate)
		return await Product.query("id").eq(productID).exec()
	} catch (e) {
		utils.logger.error(`error while updating data to DynamoDB, collection : ${productCollection} for product id ${productID}`, e)
		return new Error("Invalid Data")
	}
}
