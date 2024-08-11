import { openai, createOpenAI } from "@ai-sdk/openai";
import { mistral } from "@ai-sdk/mistral";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText, tool } from "ai";
import { google } from "@ai-sdk/google";

// Allowing API calls to extend beyond normal limit.
export const maxDuration = 60;

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  console.log("Messages from Routes: ", messages);

  let ansModel;

  if (model == "claude-3-5-sonnet-20240620") {
    ansModel = anthropic("claude-3-5-sonnet-20240620");
  } else {
    ansModel = google("models/gemini-1.5-pro-latest");
  }

  const result = await streamText({
    model: ansModel,
    temperature: 0,
    messages: convertToCoreMessages(messages),
    system:
      "You are an AI web search engine that helps users find information on the internet." +
      "You use the 'web_search' tool to search for information on the internet." +
      "Always call the 'web_search' tool to get the information, no need to do a chain of thought or say anything else, go straight to the point." +
      "Once you have found the information, you provide the user with the information you found in brief like a news paper detail." +
      "The detail should be 3-5 paragraphs in 10-12 sentences, some time pointers, each with citations in the [Text](link) format always!" +
      "Citations can be inline of the text like this: Hey there! [Google](https://google.com) is a search engine." +
      "Do not start the responses with newline characters, always start with the first sentence." +
      "The current date is: " +
      new Date()
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          weekday: "short",
        })
        .replace(/(\w+), (\w+) (\d+), (\d+)/, "$4-$2-$3 ($1)") +
      +"Never use the heading format in your response!." +
      "Refrain from saying things like 'Certainly! I'll search for information about OpenAI GEMINI Flash using the web search tool.'",
    tools: {
      web_search: tool({
        description:
          "Search the web for information with the given query, max results and search depth.",
        parameters: z.object({
          query: z.string().describe("The Search Query to look for in the web"),
          maxResults: z
            .number()
            .describe("The maximum number of results to return"),
          searchDepth: z
            .enum(["basic", "advanced"])
            .describe("The search depth to use for the search"),
        }),
        execute: async ({
          query,
          maxResults,
          searchDepth,
        }: {
          query: string;
          maxResults: number;
          searchDepth: "basic" | "advanced";
        }) => {
          const apiKey = process.env.TAVILY_API_KEY;
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: apiKey,
              query,
              max_results: maxResults < 5 ? 5 : maxResults,
              search_depth: searchDepth,
              include_images: true,
              include_answers: true,
            }),
          });

          const data = await response.json();

          let context = data.results.map(
            (obj: { url: any; content: any; title: any; raw_content: any }) => {
              return {
                url: obj.url,
                title: obj.title,
                content: obj.content,
                raw_content: obj.raw_content,
              };
            }
          );

          return {
            results: context,
          };
        },
      }),
    },
    onFinish: async (messages) => {
      console.log("Hello");
    },
  });

  return result.toAIStreamResponse();
}
