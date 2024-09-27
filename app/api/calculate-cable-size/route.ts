import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { current, voltage, length } = await req.json();

    const prompt = `Calculate the cable size for the following parameters:
    - Current: ${current} A
    - Voltage: ${voltage} V
    - Length: ${length} m
    Provide the result in mm².`;

    const response = await openai.completions.create({
      model: "o1-preview-2024-09-12",
      prompt,
      max_tokens: 50,
    });

    const result = response.choices[0].text.trim();

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error calculating cable size:', error);
    return NextResponse.json({ error: 'An error occurred while calculating the cable size' }, { status: 500 });
  }
}