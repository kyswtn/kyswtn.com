import {defineConfig, presetWind, transformerDirectives} from 'unocss'
import {presetRadixColors} from 'unocss-preset-radix-colors'
import {theme} from 'unocss/preset-wind'

type DefaultFontFamily = Record<'sans' | 'serif' | 'mono', string>
const systemFonts = theme.fontFamily as DefaultFontFamily
const fontFamily = {
  'system-sans': systemFonts.sans,
  'system-serif': systemFonts.serif,
  sans: ['Geist', "'Geist Fallback'", systemFonts.sans].join(', '),
  serif: ["'Source Serif 4 Variable'", "'Source Serif 4 Fallback'", systemFonts.serif].join(', '),
  mono: ['Monaco', 'ui-monospace', 'Menlo', systemFonts.mono].join(', '),
}

export default defineConfig({
  theme: {
    fontFamily,
    letterSpacing: {
      serif: '-0.018em',
    },
  },
  shortcuts: {
    'font-serif': 'font-serif tracking-serif',
  },
  transformers: [
    // Enable @apply directives.
    transformerDirectives(),
  ],
  presets: [
    presetWind({dark: 'class'}),
    presetRadixColors({
      prefix: '',
      lightSelector: '.light',
      darkSelector: '.dark',
      colors: [
        // neutral
        'gray',
        // error
        'red',
        // success
        'green',
        // warning
        'yellow',
        'orange',
        // info
        'blue',
      ],
      aliases: {},
    }),
  ],
})
