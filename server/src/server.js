require('dotenv').config();
const http = require('http');

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
const { Server } = require('socket.io');
const app = require('./app');
const { setupPresence } = require('./socket/presenceHandler');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

setupPresence(io);

server.listen(PORT, () => {
  console.log(`GLFlow API running on http://localhost:${PORT}`);
});
