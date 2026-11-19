export interface MenuItem {
  id: string;
  name: string;
  weight: number; // 1 to 5
  enabled: boolean;
  color: string;
  textColor: string;
}

export type PresetKey =
  | 'popular'
  | 'korean'
  | 'asian'
  | 'western'
  | 'soup'
  | 'rainy';

export interface PresetPack {
  key: PresetKey;
  label: string;
  description: string;
  items: string[];
}

export interface SpinHistoryItem {
  id: string;
  menuName: string;
  color: string;
  probability: number;
  timestamp: number;
}

export type WheelStatus = 'IDLE' | 'SPINNING' | 'RESULT';
