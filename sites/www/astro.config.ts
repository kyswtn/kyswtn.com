import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import rehypeShiki, {type RehypeShikiOptions} from '@shikijs/rehype'
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
} from '@shikijs/transformers'
import compress from 'astro-compress'
import icon from 'astro-icon'
import purgecss from 'astro-purgecss'
import {defineConfig} from 'astro/config'
import remarkDirective from 'remark-directive'
import type {BuiltinTheme} from 'shiki'
import unocss from 'unocss/astro'
import {remarkReadingTime} from './src/remark-rehype/remark-reading-time'
import {remarkSidenotes} from './src/remark-rehype/remark-sidenotes'
import base64Loader from './src/vite/base64-loader'

const shikiThemes: Record<string, BuiltinTheme> = {
  light: 'github-light-default',
  dark: 'poimandres',
}

// PurgeCSS can't find imported styles on it's own. For now this will fix.
import baseCSS from './src/styles/base.css?raw'
import proseCSS from './src/styles/prose.css?raw'
import shikiCSS from './src/styles/shiki.css?raw'
const styles = [baseCSS, proseCSS, shikiCSS].join('\n')

const domainName = process.env.DOMAIN_NAME ?? process.env.VERCEL_URL
if (!domainName || domainName.startsWith('http://') || domainName.startsWith('https://')) {
  throw new Error(
    '`DOMAIN_NAME` environment variable must be set' + ', and without the protocol scheme',
  )
}

// https://astro.build/config
export default defineConfig({
  site: `https://${domainName}`,
  devToolbar: {
    enabled: false,
  },
  experimental: {
    svg: true,
  },
  markdown: {
    remarkRehype: {},
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: shikiThemes,
      // @ts-ignore
      transformers: [
        transformerMetaHighlight(),
        transformerNotationDiff({matchAlgorithm: 'v3'}),
        transformerNotationErrorLevel({matchAlgorithm: 'v3'}),
      ],
    },
    remarkPlugins: [remarkReadingTime, remarkDirective, remarkSidenotes],
    rehypePlugins: [
      [
        rehypeShiki,
        {
          inline: 'tailing-curly-colon',
          themes: shikiThemes,
        } satisfies RehypeShikiOptions,
      ],
    ],
  },
  integrations: [
    sitemap(),
    icon(),
    react(),
    mdx(),
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
  vite: {
    plugins: [base64Loader],
  },
})
