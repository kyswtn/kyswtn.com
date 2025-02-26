import OGTemplate from '@/components/OGTemplate'
import {getOGImage} from '@/lib/og'
import type {APIRoute} from 'astro'

export const GET: APIRoute = async ({props}) => {
  return getOGImage(() =>
    OGTemplate({
      title: 'Micro',
      background: 'walk',
    }),
  )
}
