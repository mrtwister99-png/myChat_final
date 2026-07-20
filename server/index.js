const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const state = {
  userPin: '1111',
  adminPin: '8831',
  adminStatus: 'off',

  nextUserNumber: 1,

  users: [],

  chats: {},

  mutedUsers: {},

  secretMutedUsers: {},
};

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getPublicUsers = () => {
  return state.users.map((user) => ({
    id: user.id,
    name: user.name,
    colour: user.colour,
    online: user.online,
    lastSeenAt: user.lastSeenAt,
  }));
};

const getPublicState = () => {
  return {
    userPin: state.userPin,
    adminStatus: state.adminStatus,
    users: getPublicUsers(),
    mutedUsers: state.mutedUsers,
    secretMutedUsers: state.secretMutedUsers,
  };
};

const emitState = () => {
  io.emit('server:state', getPublicState());
};

const ensureChatForUser = (user) => {
  if (!state.chats[user.id]) {
    state.chats[user.id] = [
      {
        id: createMessageId(),
        sender: 'admin',
        text: 'Ahoj, tady admin. Napiš mi zprávu.',
        createdAt: Date.now(),
      },
    ];
  }
};

const createUserForSocket = (socket) => {
  const userId = String(state.nextUserNumber);
  const userName = `Uzivatel ${state.nextUserNumber}`;

  state.nextUserNumber += 1;

  const user = {
    id: userId,
    name: userName,
    colour: '#dceaff',
    online: true,
    lastSeenAt: Date.now(),
    socketId: socket.id,
   };

  state.users.push(user);

  socket.data.role = 'user';
  socket.data.userId = user.id;

  socket.join('users');
  socket.join(`user:${user.id}`);

  ensureChatForUser(user);

  return user;
};

const getUserById = (userId) => {
  return state.users.find((user) => user.id === userId);
};

const markUserOnline = (userId, socket) => {
  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          online: true,
          lastSeenAt: Date.now(),
          socketId: socket.id,
        }
      : user
  );

  socket.data.role = 'user';
  socket.data.userId = userId;

  socket.join('users');
  socket.join(`user:${userId}`);
};

const markUserOfflineBySocket = (socket) => {
  const userId = socket.data.userId;

  if (!userId) {
    return;
  }

  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          online: false,
          lastSeenAt: Date.now(),
          socketId: null,
        }
      : user
  );
};

const kickUser = (userId, reason = 'Byl jsi vyhozen z roomky.') => {
  const user = getUserById(userId);

  if (!user) {
    return;
  }

  io.to(`user:${userId}`).emit('user:kicked', {
    userId,
    reason,
  });

  state.users = state.users.filter((item) => item.id !== userId);

  delete state.mutedUsers[userId];
  delete state.secretMutedUsers[userId];

  emitState();
};

const kickAllUsers = (reason = 'Roomka byla změněna. Přihlaš se znovu.') => {
  io.to('users').emit('room:kicked', {
    reason,
  });

  state.users = [];
  state.mutedUsers = {};
  state.secretMutedUsers = {};

  emitState();
};

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Chat-XP server jede!',
    users: getPublicUsers(),
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('server:state', getPublicState());

  socket.on('auth:checkPin', ({ pin, lastUserId }) => {
    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);
    const cleanLastId = String(lastUserId || socket.data.lastUserId || '').trim();

    if (cleanPin === state.adminPin) {
      socket.data.role = 'admin';
      socket.join('admins');

      socket.emit('auth:success', {
        role: 'admin',
      });

      emitState();
      return;
    }

    if (cleanPin === state.userPin) {
      if (cleanLastId) {
        const existing = getUserById(cleanLastId);

        if (existing) {
          markUserOnline(existing.id, socket);
          socket.data.lastUserId = existing.id;

          socket.emit('auth:success', {
            role: 'user',
            userId: existing.id,
            userName: existing.name,
          });

          socket.emit('chat:messages', {
            userId: existing.id,
            messages: state.chats[existing.id] || [],
          });

          emitState();
          return;
        }
      }

      const user = createUserForSocket(socket);
      socket.data.lastUserId = user.id;

      socket.emit('auth:success', {
        role: 'user',
        userId: user.id,
        userName: user.name,
      });

      socket.emit('chat:messages', {
        userId: user.id,
        messages: state.chats[user.id] || [],
      });

      emitState();
      return;
    }

    socket.emit('auth:error', {
      message: 'Špatný PIN.',
    });
  });

  socket.on('chat:get', ({ userId }) => {
    const cleanUserId = String(userId || '');

    socket.emit('chat:messages', {
      userId: cleanUserId,
      messages: state.chats[cleanUserId] || [],
    });
  });

  socket.on('chat:send', ({ userId, sender, text }) => {
  const cleanUserId = String(userId || '');
  const cleanSender = String(sender || '');
  const trimmedText = String(text || '').trim();

  if (!cleanUserId || !trimmedText) {
    return;
  }

  const user = getUserById(cleanUserId);

  if (cleanSender === 'user') {
    if (!user) {
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Už nejsi v roomce. Přihlaš se znovu.',
      });
      return;
    }

    if (socket.data.userId !== cleanUserId) {
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Neplatné přihlášení. Přihlaš se znovu.',
      });
      return;
    }

    const muteUntil = state.mutedUsers[cleanUserId] || 0;

    if (muteUntil > Date.now()) {
      socket.emit('chat:muted', {
        userId: cleanUserId,
        muteUntil,
      });
      return;
    }

    markUserOnline(cleanUserId, socket);
  }

  const allowedSenders = ['user', 'admin', 'system'];

  if (!allowedSenders.includes(cleanSender)) {
    return;
  }

  const newMessage = {
    id: createMessageId(),
    sender: cleanSender,
    text: trimmedText,
    createdAt: Date.now(),
  };

  if (!state.chats[cleanUserId]) {
    state.chats[cleanUserId] = [];
  }

  state.chats[cleanUserId].push(newMessage);

  io.emit('chat:messages', {
    userId: cleanUserId,
    messages: state.chats[cleanUserId],
  });

  emitState();
});

  socket.on('admin:setStatus', ({ status }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    state.adminStatus = status === 'on' ? 'on' : 'off';

    emitState();
  });

  socket.on('admin:setUserPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Uživatelský PIN musí mít 4 číslice.',
      });
      return;
    }

    state.userPin = cleanPin;

    kickAllUsers('PIN roomky byl změněn. Přihlaš se znovu.');

    emitState();
  });

  socket.on('admin:setAdminPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Admin PIN musí mít 4 číslice.',
      });
      return;
    }

    state.adminPin = cleanPin;

    emitState();
  });

  socket.on('admin:renameUser', ({ userId, name }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanName = String(name || '').trim();

    if (!cleanUserId || !cleanName) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            name: cleanName,
          }
        : user
    );

    emitState();
  });

  socket.on('admin:kickUser', ({ userId }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');

    if (!cleanUserId) {
      return;
    }

    kickUser(cleanUserId, 'Byl jsi vyhozen adminem z roomky.');
  });

  socket.on('admin:muteUser', ({ userId, milliseconds }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const duration = Number(milliseconds || 0);

    if (!cleanUserId || !duration) {
      return;
    }

    state.mutedUsers[cleanUserId] = Date.now() + duration;

    emitState();
  });

  socket.on('admin:unmuteUser', ({ userId }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');

    if (!cleanUserId) {
      return;
    }

    delete state.mutedUsers[cleanUserId];

    emitState();
  });

  socket.on('admin:secretMuteUser', ({ userId, enabled }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');

    if (!cleanUserId) {
      return;
    }

    state.secretMutedUsers[cleanUserId] = Boolean(enabled);

    emitState();
  });

  socket.on('admin:setUserColour', ({ userId, colour }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanColour = String(colour || '').trim();

    if (!cleanUserId || !cleanColour) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            colour: cleanColour,
          }
        : user
    );

    emitState();
  });

  socket.on('notifications:registerToken', ({ token, role, userId }) => {
    const cleanToken = String(token || '').trim();

    if (!cleanToken) {
      return;
    }

    socket.data.pushToken = cleanToken;

    if (role === 'admin') {
      socket.data.role = 'admin';
      socket.join('admins');
    }

    if (role === 'user' && userId) {
      socket.data.role = 'user';
      socket.data.userId = String(userId);
      socket.join('users');
      socket.join(`user:${String(userId)}`);
    }

    console.log('Push token registered:', {
      socketId: socket.id,
      role,
      userId,
      token: cleanToken.slice(0, 20) + '...',
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    markUserOfflineBySocket(socket);

    emitState();
  });
});
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'Server alive' });

});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Chat-XP server běží na portu ${PORT}`);
});
