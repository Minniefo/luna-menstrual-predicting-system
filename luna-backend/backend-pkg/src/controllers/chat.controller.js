const chatService = require('../services/chat.service');

/**
 * Luna Chat Controller
 */
exports.query = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const response = await chatService.processQuery(req.user.id, query);

    return res.json({
      success: true,
      data: {
        reply: response,
        timestamp: new Date()
      }
    });

  } catch (err) {
    console.error('Chat Controller Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat query',
      error: err.message
    });
  }
};
