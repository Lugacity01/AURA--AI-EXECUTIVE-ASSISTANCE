import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const systemPrompt = `You are Aura, an elite Executive AI Assistant writing on behalf of the user. 
Your goal is to write a highly personalized, professional email based on the Base Prompt and the Recipient's Profile Context.
The email should sound human, warm, but incredibly sharp. Adopt the requested Tone.
Output exactly as a JSON object with 'subject' and 'body' string properties. Do not wrap in markdown or backticks.`;

  const userPrompt = `
Base Prompt:
Dear [Student's Name],

Congratulations! We are pleased to inform you that you have been selected for Cohort 1 of the LUGACITY Optimal Solutions Tech Bootcamp.

Please find the key details regarding your upcoming programme below:

• Start Date: 10 August 2026
• Assigned Track: [Company]
• Programme Features: Hands-on technical training, a comprehensive capstone project, and a professional certificate upon successful completion.

To ensure you receive all critical updates and session links, please join our official WhatsApp group via the link below:
https://chat.whatsapp.com/H0MNLIlbXjxGvWtmiJldIZ?s=cl&p=a&ilr=4

Best wishes,
LUGACITY Optimal Solutions.

Recipient Profile Context:
- Name: Akinyemi Martins Olamide
- Company: AI Engineering
- Job Title: 
- Department: 
- Previous Notes: 
- AI Summary: 
- Desired Tone: Professional

CRITICAL INSTRUCTION 1: You MUST replace any placeholders like [Student's Name], [Name], or instructions like (Check individual from their company name as their track) with the actual corresponding data from the Recipient Profile Context. Do NOT output the raw brackets or instructions in the final email.
CRITICAL INSTRUCTION 2: If the Base Prompt includes a signature or sign-off at the end (e.g. "Best, [Name] [Title]"), use their EXACT signature. Do not change it. If there is no signature in the prompt, sign off exactly as: User

Generate the 'subject' and 'body'.`;

  console.log("Calling AI...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  console.log(response.choices[0].message.content);
}

main().catch(console.error);
