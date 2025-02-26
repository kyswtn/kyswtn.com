import ogDoggo from '@/assets/og-doggo.png?base64'
import ogSit from '@/assets/og-sit.png?base64'
import ogWalk from '@/assets/og-walk.png?base64'
import iconSvg from '../../public/favicon.svg?url'

const backgrounds = {
  walk: ogWalk,
  sit: ogSit,
  doggo: ogDoggo,
}

export type Props = {
  title?: string
  background?: keyof typeof backgrounds
}

export default async function OGTemplate(props: Props) {
  const {title = '', background: _background = 'sit'} = props
  const background = `data:image/png;base64,${backgrounds[_background]}`

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
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
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: _background === 'doggo' ? 'center' : 'flex-start',
          padding: '0 56px 128px 56px',
        }}
      >
        <div
          style={{
            fontFamily: 'Geist',
            fontWeight: 'bold',
            fontSize: '84px',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
      </div>
      <img
        src={background}
        alt="background template"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: 9999,
        }}
      />
    </div>
  )
}
