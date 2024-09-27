import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { lightingLoad, powerOutletsLoad, airConditioningLoad, voltage, powerFactor } = await req.json();

    const prompt = `Calculate the maximum demand for the following parameters:
    - Lighting Load: ${lightingLoad} W
    - Power Outlets Load: ${powerOutletsLoad} W
    - Air Conditioning Load: ${airConditioningLoad} W
    - Voltage: ${voltage} V
    - Power Factor: ${powerFactor}
    Provide the result in amperes (A).`;

    const response = await openai.completions.create({
      model: "o1-preview-2024-09-12",
      prompt,
      max_tokens: 50,
    });

    const result = response.choices[0].text.trim();

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error calculating maximum demand:', error);
    return NextResponse.json({ error: 'An error occurred while calculating the maximum demand' }, { status: 500 });
  }
}