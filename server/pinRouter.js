const requiredEnv = (name) => {
  const value = String(process.env[name] || '').trim();

  if (!value) {
    throw new Error(`Chybí povinná proměnná prostředí ${name}.`);
  }

  return value;
};

const getConfiguredPins = () => ({
  user: requiredEnv('USER_PIN'),
  admin: requiredEnv('ADMIN_PIN'),
  honey: requiredEnv('HONEY_PIN'),
  duress: requiredEnv('DURESS_PIN'),
});

const normalizePin = (pin) => String(pin || '').replace(/[^0-9]/g, '').slice(0, 5);

const classifyPin = (pin, activePins) => {
  const cleanPin = normalizePin(pin);
  const configuredPins = getConfiguredPins();

  if (cleanPin === configuredPins.honey) {
    return { kind: 'honey', pin: cleanPin };
  }

  if (cleanPin === configuredPins.duress) {
    return { kind: 'duress', pin: cleanPin };
  }

  if (cleanPin === String(activePins?.admin || configuredPins.admin)) {
    return { kind: 'admin', pin: cleanPin };
  }

  if (cleanPin === String(activePins?.user || configuredPins.user)) {
    return { kind: 'user', pin: cleanPin };
  }

  return { kind: 'invalid', pin: cleanPin };
};

module.exports = {
  classifyPin,
  getConfiguredPins,
  normalizePin,
  requiredEnv,
};