const express  = require('express');
const {searchPostController } = require('../controller/search-controller')
const {authenticateRequest} = require('../middleware/authMiddlewar')

const router = express.Router()

router.use(authenticateRequest)

router.get('/posts',searchPostController)

module.exports = router;