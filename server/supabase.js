const { createClient } = require('@supabase/supabase-js');
const { requiredEnv } = require('./pinRouter');

const supabaseUrl = requiredEnv('SUPABASE_URL');
const supabaseKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const loadPersistedConfig = async () => {
  if (!supabase) {
    return null;
  }

  // FIX: driv stacila jedna rozbita tabulka (napr. chybejici sloupec
  // active_pins.type) a throw shodil nacteni VSEHO ostatniho - PINu,
  // banu, special pinu i obnovy chatu. Ted se kazdy dotaz resi zvlast.
  const safeSelect = async (label, query) => {
    try {
      const { data, error } = await query;

      if (error) {
        console.log(`Supabase ${label} preskoceno:`, error.message || error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log(`Supabase ${label} selhalo:`, error?.message || error);
      return [];
    }
  };

  const [pins, config, kickedIps, recoveryRequests, specialPins] = await Promise.all([
    safeSelect('active_pins', supabase.from('active_pins').select('type, pin')),
    safeSelect('admin_config', supabase.from('admin_config').select('key, value')),
    safeSelect('kicked_ips', supabase.from('kicked_ips').select('ip, reason, created_at')),
    safeSelect('recovery_requests', supabase.from('recovery_requests').select('*').order('created_at', { ascending: false }).limit(100)),
    safeSelect('special_pins', supabase.from('special_pins').select('user_id, pin')),
  ]);

  return {
    pins,
    config,
    kickedIps,
    recoveryRequests,
    specialPins,
  };
};

module.exports = {
  supabase,
  loadPersistedConfig,
};
