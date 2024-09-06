import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant specializing in trading and finance." },
        { role: "user", content: message }
      ],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}