import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    // Step 1: Create a new prediction
    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
        input: { prompt },
      }),
    });

    const prediction = await predictionRes.json();
    const predictionId = prediction.id;

    // Step 2: Poll until it's done
    let output = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000)); // wait 3s

      const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      const statusJson = await statusRes.json();
      if (statusJson.status === 'succeeded') {
        output = statusJson.output;
        break;
      } else if (statusJson.status === 'failed') {
        return res.status(500).json({ error: 'Image generation failed' });
      }
    }

    if (!output) {
      return res.status(504).json({ error: 'Generation timed out' });
    }

    res.status(200).json({ image: output[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
}
