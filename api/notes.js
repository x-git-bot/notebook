// Single API endpoint. Data lives in Upstash Redis, behind your password.
const crypto = require('crypto');

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PASSWORD = process.env.APP_PASSWORD;

const TREE_KEY = 'notes:tree';
const PROMPTS_KEY = 'notes:prompts';
const pageKey = id => 'notes:page:' + id;
const progKey = id => 'notes:progress:' + id;
const validId = id => typeof id === 'string' && /^[a-z0-9_-]{1,40}$/i.test(id);

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function sameText(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // allow the Android app (served from https://localhost) to call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-password');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!URL_ || !TOKEN || !PASSWORD)
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  if (!sameText(req.headers['x-password'] || '', PASSWORD))
    return res.status(401).json({ error: 'Wrong password' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { action } = body;

  try {
    switch (action) {
      case 'ping':
        return res.json({ ok: true });

      case 'getTree': {
        const raw = await redis(['GET', TREE_KEY]);
        return res.json({ tree: raw ? JSON.parse(raw) : { subjects: [] } });
      }

      case 'saveTree': {
        if (!body.tree || !Array.isArray(body.tree.subjects))
          return res.status(400).json({ error: 'Bad tree' });
        await redis(['SET', TREE_KEY, JSON.stringify(body.tree)]);
        return res.json({ ok: true });
      }

      case 'getPrompts': {
        const raw = await redis(['GET', PROMPTS_KEY]);
        return res.json({ prompts: raw ? JSON.parse(raw) : [] });
      }

      case 'savePrompts': {
        if (!Array.isArray(body.prompts)) return res.status(400).json({ error: 'Bad prompts' });
        const str = JSON.stringify(body.prompts);
        if (str.length > 400_000) return res.status(413).json({ error: 'Too large' });
        await redis(['SET', PROMPTS_KEY, str]);
        return res.json({ ok: true });
      }

      case 'getPage': {
        if (!validId(body.id)) return res.status(400).json({ error: 'Bad id' });
        const html = await redis(['GET', pageKey(body.id)]);
        return res.json({ html: html || '' });
      }

      case 'savePage': {
        if (!validId(body.id) || typeof body.html !== 'string')
          return res.status(400).json({ error: 'Bad request' });
        if (body.html.length > 3_500_000)
          return res.status(413).json({ error: 'HTML too large (max ~3.5 MB)' });
        await redis(['SET', pageKey(body.id), body.html]);
        return res.json({ ok: true });
      }

      case 'getProgress': {
        if (!validId(body.id)) return res.status(400).json({ error: 'Bad id' });
        const raw = await redis(['GET', progKey(body.id)]);
        return res.json({ data: raw ? JSON.parse(raw) : {} });
      }

      case 'saveProgress': {
        if (!validId(body.id) || typeof body.data !== 'object' || !body.data)
          return res.status(400).json({ error: 'Bad request' });
        const str = JSON.stringify(body.data);
        if (str.length > 500_000) return res.status(413).json({ error: 'Progress too large' });
        await redis(['SET', progKey(body.id), str]);
        return res.json({ ok: true });
      }

      case 'deletePages': {
        const ids = (body.ids || []).filter(validId);
        if (ids.length) await redis(['DEL', ...ids.map(pageKey), ...ids.map(progKey)]);
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
