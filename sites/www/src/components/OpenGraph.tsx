import {gray} from '@radix-ui/colors'
import iconSvg from '../../public/favicon.svg?url'

export type Props = {
  title?: string
}

export default function OpenGraph(props: Props = {}) {
  const {title} = props

  // TODO: Incorporate post's published date and reading time into OG.
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        color: '#000',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '56px',
        }}
      >
        <img
          src={iconSvg}
          alt="logo"
          style={{
            fontSize: '64px',
            width: '1em',
            height: '1em',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0 0 128px 0',
        }}
      >
        <div
          style={{
            padding: '0 112px 84px 56px',
            fontFamily: 'Geist',
            fontWeight: 'bold',
            fontSize: '84px',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: '100%',
            borderTop: '4px dashed',
            borderColor: gray.gray6,
          }}
        />
      </div>
    </div>
  )
}
