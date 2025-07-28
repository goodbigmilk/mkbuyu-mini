// API接口统一入口
const auth = require('./auth')
const product = require('./product')
const cart = require('./cart')
const order = require('./order')
const upload = require('./upload')
const user = require('./user')
const shop = require('./shop')

module.exports = {
  auth,
  product,
  cart,
  order,
  upload,
  user,
  shop
} 