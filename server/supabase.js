const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const ensureDefaultPins = async () => {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from('active_pins').upsert([
      { type: 'user', pin: '33065' },
      { type: 'admin', pin: '66601' },
    ], { onConflict: 'type' });
  } catch (error) {
    console.log('Supabase default pins sync skipped:', error?.message || error);
  }
};

const loadPersistedConfig = async () => {
  if (!supabase) {
    return null;
  }

  const [pinsResult, configResult, kickedResult, recoveryResult, specialPinsResult] = await Promise.all([
    supabase.from('active_pins').select('type, pin'),
    supabase.from('admin_config').select('key, value'),
    supabase.from('kicked_ips').select('ip, reason, created_at'),
    supabase.from('recovery_requests').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('special_pins').select('user_id, pin'),
  ]);

  if (pinsResult.error || configResult.error || kickedResult.error || recoveryResult.error || specialPinsResult.error) {
    throw pinsResult.error || configResult.error || kickedResult.error || recoveryResult.error || specialPinsResult.error;
  }

  return {
    pins: pinsResult.data || [],
    config: configResult.data || [],
    kickedIps: kickedResult.data || [],
    recoveryRequests: recoveryResult.data || [],
    specialPins: specialPinsResult.data || [],
  };
};

module.exports = {
  supabase,
  ensureDefaultPins,
  loadPersistedConfig,
};
