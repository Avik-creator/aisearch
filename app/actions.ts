"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function suggestQuestions(history: Message[]) {
  "use server";
  const { object } = await generateObject({
    model: google("models/gemini-1.5-pro-latest"),
    temperature: 0,
    system: `You are a search engine query generator. You 'have' to create 3 questions for the search engine based on the message history which has been provided to you.
The questions should be open-ended and should encourage further discussion while maintaining the whole context. Limit it to 5-10 words per question. 
Always put the user input's context is some way so that the next search knows what to search for exactly.
Never use pronouns in the questions as they blur the context.`,
    messages: history,
    schema: z.object({
      questions: z
        .array(z.string())
        .describe("The Generated Questions based on the Message History."),
    }),
  });

  return {
    questions: object.questions,
  };
}
