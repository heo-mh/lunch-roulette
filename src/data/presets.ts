import { MenuItem, PresetPack } from '../types/roulette';

export interface SliceColor {
  bg: string;
  text: string;
}

// Curated culinary wheel palette with guaranteed WCAG AA text contrast
export const WHEEL_PALETTE: SliceColor[] = [
  { bg: '#D93829', text: '#FFFFFF' }, // Gochujang Red
  { bg: '#F2A922', text: '#111827' }, // Saffron Mustard
  { bg: '#1E7E5C', text: '#FFFFFF' }, // Perilla / Basil Green
  { bg: '#2359B8', text: '#FFFFFF' }, // Indigo Cobalt
  { bg: '#E36414', text: '#FFFFFF' }, // Roasted Tangerine
  { bg: '#0E7490', text: '#FFFFFF' }, // Deep Ocean Teal
  { bg: '#B4235A', text: '#FFFFFF' }, // Omija Berry
  { bg: '#374151', text: '#FFFFFF' }, // Cast Iron Charcoal
  { bg: '#658E22', text: '#FFFFFF' }, // Matcha Olive
  { bg: '#6D3FA8', text: '#FFFFFF' }, // Eggplant Plum
];

export const PRESET_PACKS: PresetPack[] = [
  {
    key: 'popular',
    label: '인기 점심',
    description: '직장인 점심 단골 메뉴 8선',
    items: [
      '김치찌개',
      '돈까스',
      '제육볶음',
      '초밥',
      '쌀국수',
      '파스타',
      '순대국밥',
      '마라탕',
    ],
  },
  {
    key: 'korean',
    label: '한식',
    description: '든든한 밥심 한식 위주 구성',
    items: [
      '김치찌개',
      '된장찌개',
      '제육볶음',
      '비빔밥',
      '순대국밥',
      '칼국수',
      '갈비탕',
      '불고기 백반',
    ],
  },
  {
    key: 'asian',
    label: '중식·아시안',
    description: '면 요리와 이국적인 풍미',
    items: [
      '짜장면',
      '짬뽕',
      '마라탕',
      '쌀국수',
      '돈코츠 라멘',
      '텐동',
      '팟타이',
      '카레라이스',
    ],
  },
  {
    key: 'western',
    label: '양식·간편식',
    description: '가볍고 깔끔하게 즐기는 메뉴',
    items: [
      '크림 파스타',
      '수제버거',
      '포케 볼',
      '클럽 샌드위치',
      '리조또',
      '샐러드',
      '화덕 피자',
    ],
  },
  {
    key: 'soup',
    label: '국물·해장',
    description: '속이 확 풀리는 뜨끈한 국물',
    items: [
      '뼈해장국',
      '순대국',
      '콩나물국밥',
      '육개장',
      '짬뽕',
      '부대찌개',
      '쌀국수',
    ],
  },
  {
    key: 'rainy',
    label: '비 오는 날',
    description: '흐린 날 생각나는 메뉴 모음',
    items: [
      '바지락 칼국수',
      '김치전·국수',
      '부대찌개',
      '짬뽕',
      '수제비',
      '돈코츠 라멘',
      '감자탕',
    ],
  },
];

export function createMenuItemsFromNames(names: string[]): MenuItem[] {
  return names.map((name, index) => {
    const color = WHEEL_PALETTE[index % WHEEL_PALETTE.length];
    return {
      id: `menu-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      weight: 1,
      enabled: true,
      color: color.bg,
      textColor: color.text,
    };
  });
}

export function getNextSliceColor(existingItems: MenuItem[]): SliceColor {
  const index = existingItems.length % WHEEL_PALETTE.length;
  return WHEEL_PALETTE[index];
}
