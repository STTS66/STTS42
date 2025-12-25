import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, ModelIds } from "../types";

// Helper to get the API client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

/**
 * Creates a chat instance with the provided system instruction.
 * Note: The SDK Chat object maintains its own history in memory for the session.
 * We re-initialize it when the user switches chats or changes settings to ensure consistency.
 */
export const createChatSession = (systemInstruction: string, model: string = ModelIds.FLASH): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

/**
 * Sends a message to the model and streams the response.
 */
export const sendMessageStream = async (
  chat: Chat, 
  message: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  return chat.sendMessageStream({ message });
};

/**
 * Generates a title for a new chat session based on the first message.
 */
export const generateChatTitle = async (firstMessage: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: ModelIds.FLASH,
      contents: `Summarize the following message into a short, 3-5 word title for a chat history list. Do not use quotes. Message: "${firstMessage}"`,
    });
    return response.text?.trim() || "New Chat";
  } catch (error) {
    console.error("Failed to generate title", error);
    return "New Chat";
  }
};