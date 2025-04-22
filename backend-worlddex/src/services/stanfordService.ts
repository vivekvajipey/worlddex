import { OpenAI } from "openai";
import { Tier2Result } from "../../../shared/types/identify";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT =
`You are a Stanford University tour guide. Here are the landmarks you can identify:
- Hoover Tower
- Memorial Church
- Cantor Museum
- Main Quad
- Green Library

Respond ONLY with the name of the landmark or “Unknown”.`;

export async function identifyLandmark(base64Data:string):Promise<Tier2Result>{
  const chat = await openai.chat.completions.create({
    model: "gpt-4.1-mini-2025-04-14",
    temperature:0,
    max_tokens:10,
    messages:[{
      role:"user",
      content:[
        {type:"text",text:PROMPT},
        {type:"image_url",image_url:{url:`data:image/jpeg;base64,${base64Data}`}}
      ]
    }]
  });

  return {
    label: chat.choices[0].message.content?.trim() || null,
    provider: "GPT-4.1-mini",
    confidence: 1     // we don’t get a score; treat as 1
  };
}
