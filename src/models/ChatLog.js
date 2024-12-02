const mongoose = require('mongoose');

// Schema definition for chat logs
const ChatLogSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true }, // Chat ID from WhatsApp
    messageType: { type: String, required: true }, // Message type (text, image, etc.)
    from: { type: String, required: true }, // Sender ID
    body: { type: mongoose.Schema.Types.Mixed, required: false }, // Message body
    timestamp: { type: Number, required: true }, // Message timestamp
    type: { type: String, required: true }, // Message type (text, image, etc.)
    base64Media: { type: String }, // Base64 encoded
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatLog', ChatLogSchema);
