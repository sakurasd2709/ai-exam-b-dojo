// Vercel Serverless Function: Cloud Sync Backend via GitHub Secret Gist
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '5346c60e3b0f6b900639414cdebba136';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.headers['x-github-token'] || GITHUB_TOKEN;
  const gistId = req.headers['x-gist-id'] || GIST_ID;

  if (!token || !gistId) {
    return res.status(500).json({
      error: 'Cloud sync storage is not configured properly. Please set GITHUB_TOKEN in Vercel settings.'
    });
  }

  // Sanitize key
  const rawKey = req.query.key || 'default';
  const safeKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'default';
  const fileName = progress_.json;

  const headers = {
    'Authorization': Bearer ,
    'User-Agent': 'AI-Exam-B-Dojo',
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  try {
    // 1. SAVE (POST / PUT)
    if (req.method === 'POST' || req.method === 'PUT') {
      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          // ignore
        }
      }
      if (!payload) {
        return res.status(400).json({ error: 'Missing body data' });
      }

      const gistUpdatePayload = {
        files: {
          [fileName]: {
            content: JSON.stringify({
              ...payload,
              updatedAt: Date.now()
            }, null, 2)
          }
        }
      };

      const updateRes = await fetch(https://api.github.com/gists/, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(gistUpdatePayload)
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return res.status(updateRes.status).json({ error: 'Failed to update Gist', detail: errText });
      }

      return res.status(200).json({ success: true, message: 'Saved to cloud successfully', key: safeKey });
    }

    // 2. LOAD (GET)
    if (req.method === 'GET') {
      const gistRes = await fetch(https://api.github.com/gists/, {
        headers,
        cache: 'no-store'
      });

      if (!gistRes.ok) {
        return res.status(gistRes.status).json({ error: 'Failed to fetch Gist' });
      }

      const gistData = await gistRes.json();
      const fileObj = gistData.files && gistData.files[fileName];
      const rawContent = fileObj ? fileObj.content : null;

      if (!rawContent) {
        return res.status(404).json({ error: 'No progress found for this key', key: safeKey });
      }

      const parsed = JSON.parse(rawContent);
      return res.status(200).json(parsed);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Sync API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
