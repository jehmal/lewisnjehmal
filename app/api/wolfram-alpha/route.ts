import { NextResponse } from 'next/server';

interface WolframAlphaPod {
  id: string;
  subpods: Array<{ plaintext: string }>;
}

export async function POST(req: Request) {
  const { query } = await req.json();
  const appid = process.env.WOLFRAM_ALPHA_APP_ID;
  const apiUrl = `http://api.wolframalpha.com/v2/query?appid=${appid}&input=${encodeURIComponent(query)}&output=json`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Extract the result from the Wolfram Alpha response
    const result = data.queryresult.pods.find((pod: WolframAlphaPod) => pod.id === 'Result')?.subpods[0]?.plaintext;

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error fetching from Wolfram Alpha:', error);
    return NextResponse.json({ error: 'Failed to fetch from Wolfram Alpha' }, { status: 500 });
  }
}