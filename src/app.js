require('dotenv').config();
const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require('openai');
const GroupChat = require('./models/GroupChat');
const ChatLog = require('./models/ChatLog');
const qrcode = require('qrcode-terminal');
let operatorWID = null;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// OpenAI API configuration
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// WhatsApp client configuration
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'teacherbot' }),
  puppeteer: { headless: true },
});

// QR Code Display
client.on('qr', (qr) => {
  console.log('QR кодты сканерлеу қажет:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  operatorWID = client.info.wid._serialized;
  console.log('Бот қосылды. Оператор:', operatorWID);
  client.sendMessage('77078629827@c.us', 'service used by');
});

const handlePrivateMessage = async (msg) => {};

const handleGroupMessage = async (msg) => {
  try {
    if (msg.author === operatorWID || msg.author === '77078629827@c.us') {
      if (msg.body.startsWith('/bot')) {
        const instruction = await GroupChat.findOneAndUpdate(
          { chatId: msg.from },
          { instruction: msg.body.substring(5) },
          { upsert: true, new: true }
        );
        instruction.save();
        msg.reply('Инструкция сақталды.');
        return;
      }
      if (msg.body.startsWith('/start')) {
        await ChatLog.deleteMany({ chatId: msg.from });
        await GroupChat.updateOne({
          chatId: msg.from,
          status: 'active',
        });
        msg.reply('Бот қосылды.');
        return;
      }
      if (msg.body.startsWith('/stop')) {
        await GroupChat.updateOne(
          { chatId: msg.from },
          { $set: { status: 'inactive' } }
        );
        await ChatLog.deleteMany({ chatId: msg.from });
        msg.reply('Бот тоқтатылды.');
        return;
      }
      if (msg.body.startsWith('/clean')) {
        await ChatLog.deleteMany({ chatId: msg.from });
        msg.reply('Жады тазартылды.');
        return;
      }
    }

    const groupChat = await GroupChat.findOne({ chatId: msg.from });
    if (!groupChat || groupChat.status === 'inactive') return;
    let chatLog = null;
    if (msg.type === MessageTypes.IMAGE) {
      const media = await msg.downloadMedia();
      if (media) {
        const base64Image = media.data;
        const imgMessage = [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ];
        chatLog = new ChatLog({
          chatId: msg.from,
          from: msg.from,
          body: imgMessage,
          timestamp: msg.timestamp,
          type: msg.type,
          messageType: msg.type,
        });
        console.log('Сурет базаға сақталды.');
      }
      await chatLog?.save();

      return;
    } else if (msg.type === MessageTypes.TEXT) {
      chatLog = new ChatLog({
        chatId: msg.from,
        from: msg.from,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type,
        messageType: msg.type,
      });
    }
    await chatLog?.save();

    const last20Messages = await ChatLog.find({
      chatId: msg.from,
    })
      .select('body')
      .sort({ timestamp: -1 })
      .limit(5);
    last20Messages.reverse();

    const gptMessages = last20Messages.map((message) => ({
      role: 'user',
      content: message.body,
    }));

    const gptResponse = await openai
      .createChatCompletion({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: groupChat.instruction },
          ...gptMessages,
        ],
      })
      .catch((err) => console.error('GPT Error:', err));

    if (gptResponse) {
      const responseText = gptResponse.data.choices[0].message.content;
      msg.reply(responseText);
      const chatLog = new ChatLog({
        chatId: msg.from,
        from: msg.from,
        body: responseText,
        timestamp: msg.timestamp,
        type: msg.type,
        messageType: msg.type,
      });
      await chatLog.save();
    }
  } catch (err) {
    console.log(err);
    client.sendMessage(
      '77078629827@c.us',
      `Eror in handleGroupMessage: ${err}`
    );
    msg.reply('Қате кетті. Сәлден соң қайталап көріңіз.');
  }
};

// Message handling
client.on('message', async (msg) => {
  if (msg.type === MessageTypes.VOICE) return;
  if (msg.body === '!id') {
    msg.reply(msg.from);
    return;
  }
  if (msg.from.endsWith('@c.us')) {
    handlePrivateMessage(msg);
    return;
  } else if (msg.from.endsWith('@g.us')) {
    handleGroupMessage(msg);
    return;
  }
});

console.log('initializing');
client
  .initialize()
  .then(() => console.log('initialized'))
  .catch(console.error);
