/* ============================================================
   PERIOD RAGS — SUPABASE CLIENT
   ============================================================ */

const SUPABASE_URL  = 'BURAYA_SUPABASE_URL';
const SUPABASE_KEY  = 'BURAYA_ANON_KEY';

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
