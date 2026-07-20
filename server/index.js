const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = 3001;

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/**
 * Dočasná paměť serveru.
 * Později se to nahradí databází.
 */
const state = {
  userPin: '1111',
  adminPin: '8831',
  adminStatus: 'off',

  users: [
    {
      id: '1',
      name: 'Uzivatel 1',
      colour: '#dceaff',
      online: false,
    },
  ],

  chats: {
    '1': [
      {
        id: 1,
        sender: 'admin',
        text: 'Ahoj, tady admin. Napiš mi zprávu.',
        createdAt: Date.now(),
      },
    ],
  },

  mutedUsers: {},
};

const getPublicState = () => {
  return {
    userPin: state.userPin,
    adminStatus: state.adminStatus,
    users: state.users,
    mutedUsers: state.mutedUsers,
  };
};

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Chat-XP server jede!',
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('server:state', getPublicState());

  socket.on('auth:checkPin', ({ pin }) => {
    if (pin === state.adminPin) {
      socket.emit('auth:success', {
        role: 'admin',
      });
      return;
    }

    if (pin === state.userPin) {
      socket.emit('auth:success', {
        role: 'user',
        userId: '1',
        userName: 'Uzivatel 1',
      });

      state.users = state.users.map((user) =>
        user.id === '1'
          ? {
              ...user,
              online: true,
            }
          : user
      );

      io.emit('server:state', getPublicState());
      return;
    }

    socket.emit('auth:error', {
      message: 'Špatný PIN.',
    });
  });

  socket.on('chat:get', ({ userId }) => {
    socket.emit('chat:messages', {
      userId,
      messages: state.chats[userId] || [],
    });
  });

  socket.on('chat:send', ({ userId, sender, text }) => {
    const trimmedText = String(text || '').trim();

    if (!trimmedText) {
      return;
    }

    const muteUntil = state.mutedUsers[userId] || 0;

    if (sender === 'user' && muteUntil > Date.now()) {
      socket.emit('chat:muted', {
        userId,
        muteUntil,
      });
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender,
      text: trimmedText,
      createdAt: Date.now(),
    };

    if (!state.chats[userId]) {
      state.chats[userId] = [];
    }

    state.chats[userId].push(newMessage);

    io.emit('chat:messages', {
      userId,
      messages: state.chats[userId],
    });
  });

  socket.on('admin:setStatus', ({ status }) => {
    state.adminStatus = status === 'on' ? 'on' : 'off';

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:setUserPin', ({ pin }) => {
    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Uživatelský PIN musí mít 4 číslice.',
      });
      return;
    }

    state.userPin = cleanPin;
    state.users = [];

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:setAdminPin', ({ pin }) => {
    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Admin PIN musí mít 4 číslice.',
      });
      return;
    }

    state.adminPin = cleanPin;

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:renameUser', ({ userId, name }) => {
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            name: cleanName,
          }
        : user
    );

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:kickUser', ({ userId }) => {
    state.users = state.users.filter((user) => user.id !== userId);

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:muteUser', ({ userId, milliseconds }) => {
    const duration = Number(milliseconds || 0);

    if (!duration) {
      return;
    }

    state.mutedUsers[userId] = Date.now() + duration;

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:unmuteUser', ({ userId }) => {
    delete state.mutedUsers[userId];

    io.emit('server:state', getPublicState());
  });

  socket.on('admin:setUserColour', ({ userId, colour }) => {
    state.users = state.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            colour,
          }
        : user
    );

    io.emit('server:state', getPublicState());
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server jede na http://localhost:${PORT}`);
});