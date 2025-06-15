// backend/api/generate.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Allow CORS on real requests
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    // 1. Create the prediction
    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: 'aa74f5342c79e8eae4c206790f604c78b4e1c5bbd27ab5fb1e1a5d540a938d9a', // free emoji model for testing
        input: { prompt },
      }),
    });

    const prediction = await predictionRes.json();

    if (prediction.detail) {
      return res.status(422).json({ error: prediction.detail });
    }

    const predictionId = prediction.id;
    let image = null;
    let tries = 0;

    // 2. Poll for result (max 10 tries)
    while (tries < 10) {
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      const checkData = await checkRes.json();

      if (checkData.status === 'succeeded') {
        image = checkData.output?.[0];
        break;
      }
      if (checkData.status === 'failed') {
        return res.status(500).json({ error: 'Image generation failed.' });
      }

      await new Promise(r => setTimeout(r, 1000)); // wait 1 second
      tries++;
    }

    if (!image) {
      return res.status(500).json({ error: 'No image returned.' });
    }

    return res.status(200).json({ image });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate image.' });
  }
}
