const mongoose = require('mongoose');

const GroupChatsSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
    },
    instruction: {
      type: String,
      required: true,
      default: 'Оқушыларға математика тақырыптарын түсіндіретін ботсың',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GroupChats', GroupChatsSchema);
