export interface ShaderState {
  code: string;
  isPlaying: boolean;
  time: number;
  error: string | null;
}

export interface TextureChannel {
  id: number;
  url: string;
  name: string;
}

export enum Tab {
  EDITOR = 'EDITOR',
  CHANNELS = 'CHANNELS',
  AI_ASSISTANT = 'AI_ASSISTANT'
}
