/* ============================================================
   PERIOD RAGS — SUPABASE CLIENT
   ============================================================ */

const SUPABASE_URL  = 'https://sjhdkjwuyajrqwznuvqc.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaGRrand1eWFqcnF3em51dnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzE2ODcsImV4cCI6MjA5NDUwNzY4N30.XJ3chNTj-W0BQK7SDgVhNxWJt6ieGVyXoshUHCZLh_U';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---- SHA-256 password hashing ---- */
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ============================================================
   AUTH
   ============================================================ */
async function sbRegister(username, password) {
  const password_hash = await hashPassword(password);
  const { error } = await _sb.from('profiles').insert({ username, password_hash, is_admin: false });
  if (error) throw error;
  return { username, is_admin: false };
}

async function sbLogin(username, password) {
  const password_hash = await hashPassword(password);
  const { data, error } = await _sb.from('profiles')
    .select('username, is_admin')
    .eq('username', username)
    .eq('password_hash', password_hash)
    .single();
  if (error || !data) throw new Error('Kullanıcı adı veya şifre hatalı.');
  return data;
}

async function sbUsernameExists(username) {
  const { data } = await _sb.from('profiles').select('id').eq('username', username).single();
  return !!data;
}

/* ============================================================
   EVENTS
   ============================================================ */
async function sbGetEvents() {
  const { data } = await _sb.from('events').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function sbSaveEvent(ev) {
  if (ev.id) {
    const { error } = await _sb.from('events').update({
      title: ev.title, type: ev.type, cover: ev.cover,
      date: ev.date || null, time: ev.time, location: ev.location,
      description: ev.desc, content: ev.content,
      image_url: ev.image || null, featured: ev.featured
    }).eq('id', ev.id);
    if (error) throw error;
  } else {
    const { error } = await _sb.from('events').insert({
      title: ev.title, type: ev.type, cover: ev.cover,
      date: ev.date || null, time: ev.time, location: ev.location,
      description: ev.desc, content: ev.content,
      image_url: ev.image || null, featured: ev.featured
    });
    if (error) throw error;
  }
}

async function sbDeleteEvent(id) {
  const { error } = await _sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

/* ============================================================
   GALLERY
   ============================================================ */
async function sbGetGallery() {
  const { data } = await _sb.from('gallery').select('*').order('sort_order').order('created_at');
  return data || [];
}

async function sbAddPhoto(photo) {
  const { error } = await _sb.from('gallery').insert({
    image_url: photo.src, caption: photo.caption,
    large: photo.large, is_static: false, sort_order: 999
  });
  if (error) throw error;
}

async function sbDeletePhoto(id) {
  const { error } = await _sb.from('gallery').delete().eq('id', id);
  if (error) throw error;
}

async function sbTogglePhotoLarge(id, large) {
  const { error } = await _sb.from('gallery').update({ large }).eq('id', id);
  if (error) throw error;
}

/* ============================================================
   KULLANICI YÖNETİMİ
   ============================================================ */
async function sbGetUsers() {
  const { data, error } = await _sb.from('profiles').select('id, username, is_admin, created_at').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function sbSetAdmin(username, is_admin) {
  const { error } = await _sb.from('profiles').update({ is_admin }).eq('username', username);
  if (error) throw error;
}

async function sbGetProfile(username) {
  const { data } = await _sb.from('profiles').select('username, is_admin').eq('username', username).single();
  return data || null;
}

/* ============================================================
   SKOR TABLOSU
   ============================================================ */
async function sbGetLeaderboard() {
  const { data, error } = await _sb.from('scores')
    .select('username, score')
    .order('score', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function sbSaveScore(username, score) {
  const { data: existing } = await _sb.from('scores')
    .select('score').eq('username', username).single();
  if (!existing || score > existing.score) {
    const { error } = await _sb.from('scores')
      .upsert({ username, score, updated_at: new Date().toISOString() }, { onConflict: 'username' });
    if (error) throw error;
  }
}

/* ============================================================
   ÇARK — SPIN KODLARI
   ============================================================ */
async function sbCheckWeeklySpin(username) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await _sb.from('wheel_spins')
    .select('id, spun_at, prize, code')
    .eq('username', username)
    .gte('spun_at', weekAgo)
    .order('spun_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

function _genSpinCode() {
  return 'PR-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

async function sbSaveWheelSpin(username, prize) {
  for (let i = 0; i < 5; i++) {
    const code = _genSpinCode();
    const { data, error } = await _sb.from('wheel_spins')
      .insert({ username, prize, code })
      .select().single();
    if (!error) return data;
    if (error.code !== '23505') throw error;
  }
  throw new Error('Kod üretme başarısız, tekrar dene.');
}

async function sbGetAllSpins() {
  const { data, error } = await _sb.from('wheel_spins')
    .select('*').order('spun_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function sbGetUserSpins(username) {
  const { data, error } = await _sb.from('wheel_spins')
    .select('*').eq('username', username).order('spun_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function sbVerifySpin(code) {
  const { data, error } = await _sb.from('wheel_spins')
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq('code', code.toUpperCase()).select().single();
  if (error) throw error;
  return data;
}

async function sbLookupSpin(query) {
  const q = query.trim();
  const upper = q.toUpperCase();
  // Kod araması: PR- prefix yoksa otomatik ekle, her iki şekli de dene
  const codesToTry = upper.startsWith('PR-') ? [upper] : ['PR-' + upper, upper];
  for (const code of codesToTry) {
    const { data } = await _sb.from('wheel_spins').select('*').eq('code', code).maybeSingle();
    if (data) return data;
  }
  // Kullanıcı adı ile ara
  const { data: byUser } = await _sb.from('wheel_spins')
    .select('*').eq('username', q).eq('verified', false)
    .order('spun_at', { ascending: false }).limit(1).maybeSingle();
  return byUser || null;
}
