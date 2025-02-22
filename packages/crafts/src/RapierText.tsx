import {Center, Text3D, useTexture} from '@react-three/drei'
import {Canvas} from '@react-three/fiber'
import {Physics} from '@react-three/rapier'
import {Suspense} from 'react'
import * as THREE from 'three'
import CanvasBoundOrthographicCamera from './CanvasBoundOrthographicCamera'
import DraggableRigidBody from './DraggableRigidBody'

type RapierTextProps = {
  text: string[]
  font: string
  texture: string
  textSize?: number
  padding?: number
}

export default function RapierText(props: RapierTextProps) {
  return (
    <Canvas>
      <CanvasBoundOrthographicCamera position={[1, 0, 10]} zoom={60} />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]}>
          <Scene {...props} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

function Scene(props: RapierTextProps) {
  const {text, font, texture: _texture, textSize = 3, padding = -1.5} = props
  const moveback = ((textSize + padding) * (text.length - 1)) / 2
  const sizeStep = textSize + padding
  const texture = useTexture(_texture)

  return (
    <group>
      {text.map((char, index) => (
        <DraggableRigidBody
          key={index}
          position={[index * sizeStep - moveback, (index % 2 === 0 ? textSize / 1.4 : 0) - 1, 0]}
          rotation={new THREE.Euler(0, -0.25, 0.25)}
          linearDamping={1.25}
          angularDamping={1.25}
        >
          <Center>
            <Text3D
              font={font}
              size={textSize}
              height={textSize / 2}
              smooth={0.1}
              letterSpacing={0}
              lineHeight={0}
            >
              {char}
              <meshMatcapMaterial matcap={texture} />
            </Text3D>
          </Center>
        </DraggableRigidBody>
      ))}
    </group>
  )
}
