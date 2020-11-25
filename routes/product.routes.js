'use strict'
const express = require('express')
const utils = require('../lib/utils')
const router = express.Router()
const _ = require('lodash')
const productRepository = require('../repositories/product.repo')
const httpStatusCode = require('http-status-codes').StatusCodes
const config = require('../config/default')
const dynamoose = require('dynamoose')
const AWS = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')

// loads s3 configurations and credentials
const s3 = new AWS.S3(config[utils.configCons.FIELD_AWS][utils.configCons.FIELD_S3_CLIENT_CONFIG])
const upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: config[utils.configCons.FIELD_AWS].s3_bucket_name,
		contentType: multerS3.AUTO_CONTENT_TYPE,
		metadata: function (req, file, cb) {
			cb(null, {fieldName: file.fieldname})
		},
		key: function (req, file, cb) {
			cb(null, "images/" + Date.now().toString() + "-" + file.originalname)
		}
	})
})

dynamoose.aws.sdk.config.update(
	config[utils.configCons.FIELD_AWS][utils.configCons.FIELD_S3_CLIENT_CONFIG])

function prepareProductBody(dataFromBody, forEdit = false) {
	const product = _.cloneDeep(dataFromBody)
	if (forEdit) {
		delete product.images
		delete product.id
	}
	return product
}

const addProduct = async (req, res, next) => {
	try {
		utils.logger.info(`Request body contains : ${JSON.stringify(req.body)}`)
		const productDetailsFromBody = req.body.product

		const response = {}
		const newProduct = prepareProductBody(productDetailsFromBody)
		const result = await productRepository.insertOne(newProduct)
		utils.logger.debug(`Response from inserting product ${JSON.stringify(result)}`)

		if (result) {
			response.product = result
		} else {
			response.product = null
			response.error = 'Failed to Add new Product'
		}
		res.status(httpStatusCode.OK).send(utils.responseGenerators(response, httpStatusCode.OK, 'Product Added Successfully'))
	} catch (err) {
		utils.logger.error(`addProduct error : ${err}`)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err.message, httpStatusCode.INTERNAL_SERVER_ERROR, err, err))
	}
}

const getProducts = async (req, res, next) => {
	try {
		const products = await productRepository.findAll()
		// const totalProductsCount = await productRepository.count(findQuery)
		utils.logger.debug(`Products list : ${JSON.stringify(products)}`)

		const responseData = { products: products, product_count: products.length }
		res.status(httpStatusCode.OK).send(utils.responseGenerators(responseData, httpStatusCode.OK, 'Products Fetched Successfully'))
	} catch
		(err) {
		utils.logger.error(err)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err, httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
	}
}

const getProductDetails = async (req, res, next) => {
	try {
		const productId = req.params.product_id
		if (!productId) {
			utils.logger.debug(`Can not find product id in url params : ${JSON.stringify(req.params)}`)
			res.status(httpStatusCode.INTERNAL_SERVER_ERROR).
				send(utils.responseGenerators('Please provide Product id', httpStatusCode.INTERNAL_SERVER_ERROR, 'No Product Id found'))
			return
		}
		let responseData = {}
		const product = await productRepository.findOne(productId)
		utils.logger.debug(`Product  : ${JSON.stringify(product)}`)
		if (!(product && product[0])) {
			responseData = null
			res.status(httpStatusCode.OK).send(utils.responseGenerators(responseData, httpStatusCode.INTERNAL_SERVER_ERROR, 'Product does not exit'))
			return
		}
		responseData.product = product[0]
		res.status(httpStatusCode.OK).send(utils.responseGenerators(responseData, httpStatusCode.OK, 'Product Details Fetched Successfully'))
	} catch (err) {
		utils.logger.error(err)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err, httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
	}
}

const deleteProduct = async (req, res, next) => {
	try {
		const productId = req.params.product_id
		utils.logger.info(`Request to delete the product contains : ${JSON.stringify(productId)}`)
		if (!productId) {
			utils.logger.debug(`Can not find product id in url params : ${JSON.stringify(req.params)}`)
			res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.responseGenerators("Please provide Product id to delete", httpStatusCode.INTERNAL_SERVER_ERROR, "No Product Id found"))
			return
		}
		const response = await productRepository.deleteProduct(productId)
		utils.logger.debug(`Response From Product Delete  ${JSON.stringify(response)}`)
		res.status(httpStatusCode.OK).send(utils.responseGenerators(response, httpStatusCode.OK, "Product Deleted"))
	} catch (err) {
		utils.logger.error(`Delete Product Error ${err}`)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err, httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
	}
}

const updateProduct = async (req, res, next) => {
	try {
		utils.logger.info(`Request body contains : ${JSON.stringify(req.body)}`)
		const productDetailsFromBody = req.body.product

		const productToUpdate = prepareProductBody(productDetailsFromBody, true)
		const productId = req.params.product_id
		if (!productId) {
			utils.logger.debug(`Can not find product id in url params : ${JSON.stringify(req.params)}`)
			res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.responseGenerators("Please provide Product id to edit", httpStatusCode.INTERNAL_SERVER_ERROR, "No Product Id found"))
			return
		}
		const result = await productRepository.updateProductById(productId, productToUpdate)
		utils.logger.debug(`Response From Product Update  ${JSON.stringify(result)}`)
		let response = null
		if (result) {
			response = {product: result[0]}
		}

		res.status(httpStatusCode.OK).send(utils.responseGenerators(response, httpStatusCode.OK, "Product Updated"))
	} catch (err) {
		utils.logger.error(`Update Product Error ${err}`)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err, httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
	}
}

const addImageToProduct = async (req, res, next) => {
	try {
		const productID = req.params.product_id
		if (!productID) {
			res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator("Product ID not provided", httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
			return
		}
		let dataToUpdate
		dataToUpdate = {
			"$ADD":{images: req.file.location}
		}
		const result = await productRepository.updateProductById(productID, dataToUpdate)
		utils.logger.debug('Add Image to Product/Product Update Response', result)
		const response = {}
		response.updated_product = result

		utils.logger.debug(`Response from adding image to product details : ${JSON.stringify(result)}`)
		res.status(httpStatusCode.OK).send(utils.responseGenerators(response, httpStatusCode.OK, "Image Added successfully"))
	} catch (err) {
		utils.logger.error(err)
		res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(utils.errorsArrayGenrator(err, httpStatusCode.INTERNAL_SERVER_ERROR, 'server error'))
	}
}


router.post('/', addProduct)
router.get('/', getProducts)
router.get('/:product_id', getProductDetails)
router.delete('/:product_id', deleteProduct)
router.put('/:product_id', updateProduct)
router.post('/:product_id/image', upload.single('image'), addImageToProduct)

module.exports = router
