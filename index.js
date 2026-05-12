const express = require('express');
const https = require('https');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = '8631866608:AAHF9Q9FfwJjNJLRg66nZbnqxgloPHebUak';
const FIREBASE_URL = 'alerte-rain-default-rtdb.europe-west1.firebasedatabase.app';

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

function firebaseDelete(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: FIREBASE_URL,
      path: '/' + path + '.json',
      method: 'DELETE',
    };
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
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
    const text = (msg.text || '').trim();

    if (text.startsWith('/register ') || text.startsWith('/start ')) {
      const parts = text.split(' ');
      const pseudo = parts[1] ? parts[1].trim().toLowerCase() : null;
      if (!pseudo) {
        await sendMessage(chatId, 'Usage : /register tonpseudostake');
        return;
      }
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
    } else if (text === '/start') {
      await sendMessage(chatId,
        '🌧 <b>Stake Rain Notifier Bot</b>\n\n' +
        'Pour recevoir les notifications, enregistre ton pseudo Stake :\n' +
        '/register tonpseudo\n\n' +
        'Exemple : /register alleluiateam'
      );
    } else if (text === '/help') {
      await sendMessage(chatId,
        '🌧 <b>Stake Rain Notifier - Commandes</b>\n\n' +
        '/register pseudo - Enregistre ton pseudo Stake\n' +
        '/unregister - Supprime ton enregistrement\n' +
        '/status - Verifie ton enregistrement\n' +
        '/help - Affiche ce message'
      );
    } else if (text === '/unregister') {
      await sendMessage(chatId, 'Pour te desinscrire, contacte l\'administrateur.');
    } else if (text === '/status') {
      await sendMessage(chatId,
        'Envoie <b>/register tonpseudo</b> pour verifier ou mettre a jour ton enregistrement.'
      );
    } else {
      await sendMessage(chatId, 'Commande inconnue. Tape /help pour voir les commandes disponibles.');
    }
  } catch (e) {
    console.error('Erreur webhook:', e);
  }
});

app.get('/', (req, res) => res.send('Stake Rain Notifier Bot - OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot en ligne sur port', PORT));
