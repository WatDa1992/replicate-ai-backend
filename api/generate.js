import fetch from 'node-fetch';

export default async function handler(req, res) {
  // 👇 Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // 👇 Allow CORS on actual POST request
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: "7762fd07e4c67fbe0c076755b50d4bb74f50f3c60695387c95c8f3a7f0e4c92d",
        input: { prompt },
      }),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate image" });
  }
}
