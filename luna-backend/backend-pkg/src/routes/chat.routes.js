const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

// All chat routes are protected
router.use(protect);

router.post('/query', chatController.query);

module.exports = router;
