export interface SpotlightVariation {
  id: string;
  name: string;
  filename: string;
  url: string;
  downloadUrl: string;
  primaryColor: string;
  secondaryColor: string;
  styleDesc: string;
  resolution: string;
  fileSize?: string;
  isDefault?: boolean;
}

export type BackgroundMode = 'dark' | 'checkerboard' | 'white' | 'cream_parchment';

