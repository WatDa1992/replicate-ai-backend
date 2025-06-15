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
    const prediction = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
      },
      body: JSON.stringify({
        version: "cf2f1cf1-0910-41c4-9bee-502d0507d6d4", // emoji-style model
        input: {
          prompt: prompt,
          width: 512,
          height: 512,
          num_outputs: 1
        }
      })
    });

    const predictionData = await prediction.json();

    // Now poll until it's done
    let finalResult = predictionData;
    while (finalResult.status !== "succeeded" && finalResult.status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const check = await fetch(`https://api.replicate.com/v1/predictions/${predictionData.id}`, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      finalResult = await check.json();
    }

    if (finalResult.status === "succeeded") {
      return res.status(200).json({ image: finalResult.output[0] });
    } else {
      return res.status(500).json({ error: "Image generation failed" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate image" });
  }
}
