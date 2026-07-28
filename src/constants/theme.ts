export interface PrimaryColorPreset {
  id: string
  name: string
  hex: string
  rgb: string
  hoverRgb: string
  lightRgb: string
  darkRgb: string
}

export const PRIMARY_COLOR_PRESETS: PrimaryColorPreset[] = [
  {
    id: 'emerald',
    name: 'Emerald Green',
    hex: '#16A34A',
    rgb: '22 163 74',
    hoverRgb: '21 128 61',
    lightRgb: '220 252 231',
    darkRgb: '22 101 52'
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    hex: '#4F46E5',
    rgb: '79 70 229',
    hoverRgb: '67 56 202',
    lightRgb: '238 242 255',
    darkRgb: '55 48 163'
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    hex: '#0284C7',
    rgb: '2 132 199',
    hoverRgb: '3 105 161',
    lightRgb: '224 242 254',
    darkRgb: '7 89 133'
  },
  {
    id: 'teal',
    name: 'Deep Teal',
    hex: '#0D9488',
    rgb: '13 148 136',
    hoverRgb: '15 118 110',
    lightRgb: '240 253 250',
    darkRgb: '17 94 89'
  },
  {
    id: 'violet',
    name: 'Deep Violet',
    hex: '#7C3AED',
    rgb: '124 58 237',
    hoverRgb: '109 40 217',
    lightRgb: '245 243 255',
    darkRgb: '91 33 182'
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    hex: '#E11D48',
    rgb: '225 29 72',
    hoverRgb: '190 18 60',
    lightRgb: '255 241 242',
    darkRgb: '159 18 57'
  }
]

export function getPresetById(presetIdOrHex?: string): PrimaryColorPreset {
  if (!presetIdOrHex) return PRIMARY_COLOR_PRESETS[0]
  const found = PRIMARY_COLOR_PRESETS.find(
    (p) => p.id === presetIdOrHex || p.hex.toLowerCase() === presetIdOrHex.toLowerCase()
  )
  return found || PRIMARY_COLOR_PRESETS[0]
}

export function applyPrimaryColor(presetIdOrHex?: string): void {
  const preset = getPresetById(presetIdOrHex)
  const root = document.documentElement

  root.style.setProperty('--primary-rgb', preset.rgb)
  root.style.setProperty('--primary-hover-rgb', preset.hoverRgb)
  root.style.setProperty('--primary-light-rgb', preset.lightRgb)
  root.style.setProperty('--primary-dark-rgb', preset.darkRgb)
  root.style.setProperty('--primary-hex', preset.hex)
}
