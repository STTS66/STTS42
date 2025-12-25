export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
}

export interface AppSettings {
  systemInstruction: string;
  model: string;
}

export enum ModelIds {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}