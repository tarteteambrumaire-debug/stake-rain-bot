const express = require('express');
const https = require('https');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = '8736690342:AAFu1whZ7SeE072sM42adY_DcRS296mVQn4';
const FIREBASE_URL = 'alerte-rain-default-rtdb.europe-west1.firebasedatabase.app';
const ADMIN_CHAT_ID = '281374538';

function firebaseSet(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: FIREBASE_URL,
      path: '/' + path + '.json',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: '/bot' + TELEGRAM_TOKEN + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

app.post('/webhook', async (req, res) => {
  res.status(200).send('ok');
  try {
    const update = req.body;
    if (!update || !update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const username = msg.from.username ? '@' + msg.from.username : msg.from.first_name || 'Inconnu';
    const text = (msg.text || '').trim();

    if (text.startsWith('/register ')) {
      const pseudo = text.split(' ')[1].trim().toLowerCase();
      await firebaseSet('users/' + pseudo, {
        chatId: chatId.toString(),
        pseudo: pseudo,
        registeredAt: Date.now()
      });
      await sendMessage(chatId,
        '✅ <b>Enregistré !</b>\n\n' +
        '👤 Pseudo Stake : <b>' + pseudo + '</b>\n\n' +
        'Tu recevras maintenant les notifications quand :\n' +
        '• Tu reçois une rain\n' +
        '• Tu es mentionné dans le chat\n\n' +
        'Tape /help pour voir toutes les commandes.'
      );
      // Notifier l'admin
      await sendMessage(ADMIN_CHAT_ID,
        '🔔 <b>Nouvel enregistrement !</b>\n\n' +
        '👤 Pseudo Stake : <b>' + pseudo + '</b>\n' +
        '📱 Telegram : ' + username + '\n' +
        '🕐 ' + new Date().toLocaleString('fr-FR')
      );
    } else if (text === '/start') {
      await sendMessage(chatId,
        '🌧 <b>StakePulse Bot</b>\n\n' +
        'Pour recevoir les notifications, enregistre ton pseudo Stake :\n' +
        '/register tonpseudo'
      );
    } else if (text === '/help') {
      await sendMessage(chatId,
        '🌧 <b>StakePulse - Commandes</b>\n\n' +
        '/register pseudo - Enregistre ton pseudo Stake\n' +
        '/help - Affiche ce message'
      );
    } else {
      await sendMessage(chatId, 'Utilise /register tonpseudo pour t\'enregistrer.\nTape /help pour voir les commandes.');
    }
  } catch (e) {
    console.error('Erreur webhook:', e);
  }
});

app.get('/', (req, res) => res.send('StakePulse Bot - OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('StakePulse Bot en ligne sur port', PORT));
