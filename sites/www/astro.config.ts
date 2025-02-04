import sitemap from '@astrojs/sitemap'
import compress from 'astro-compress'
import icon from 'astro-icon'
import purgecss from 'astro-purgecss'
import {defineConfig} from 'astro/config'
import unocss from 'unocss/astro'
import {remarkReadingTime} from './src/remark-rehype/remark-reading-time'

// PurgeCSS can't find imported styles on it's own. For now this will fix.
import baseCSS from './src/styles/base.css?raw'
import proseCSS from './src/styles/prose.css?raw'
const styles = [baseCSS, proseCSS].join('\n')

// https://astro.build/config
export default defineConfig({
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  integrations: [
    sitemap(),
    icon(),
    unocss({injectReset: true}),
    purgecss({
      variables: true,
      keyframes: true,
      fontFace: true,
      safelist: {
        // Don't purge important class names like !bg-none.
        deep: [/!.*/],
      },
      css: [{raw: styles}],
    }),
    compress({
      SVG: false,
      Image: false,
      CSS: false,
      JavaScript: false,
      HTML: true,
    }),
  ],
})
