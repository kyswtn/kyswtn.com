import OGTemplate from '@/components/OGTemplate'
import type {Post} from '@/lib/content'
import {getOGImage} from '@/lib/og'
import type {APIRoute} from 'astro'

export {getStaticPaths} from './index.astro'
export const GET: APIRoute<Post> = async ({props}) => {
  return getOGImage(() =>
    OGTemplate({
      title: props.data.shortTitle ?? props.data.title,
      background: props.id === 'about' ? 'doggo' : undefined,
    }),
  )
}
