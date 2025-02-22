import {useThree} from '@react-three/fiber'
import {
  type FixedJointParams,
  type RapierRigidBody,
  RigidBody,
  useFixedJoint,
} from '@react-three/rapier'
import {createRef, useMemo} from 'react'
import * as THREE from 'three'

export const sides = ['bottom', 'left', 'right', 'back', 'front'] as const
type Side = (typeof sides)[number]

export const fixedJointParams = [
  [0, 0, 0],
  [0, 0, 0, 1],
  [0, 0, 0],
  [0, 0, 0, 1],
] as FixedJointParams

export default function CanvasBoundRigidWorldBox() {
  type Refs = Record<Side, React.RefObject<RapierRigidBody>>
  const refs = Object.fromEntries(
    sides.map((side) => [side, createRef<RapierRigidBody>()]),
  ) as unknown as Refs

  useFixedJoint(refs.bottom, refs.left, fixedJointParams)
  useFixedJoint(refs.bottom, refs.right, fixedJointParams)
  useFixedJoint(refs.bottom, refs.back, fixedJointParams)
  useFixedJoint(refs.bottom, refs.front, fixedJointParams)

  type Configuration = {
    name: keyof typeof refs
    position: [number, number, number]
    args: [number, number, number]
  }
  const viewport = useThree((state) => state.viewport)
  const configurations = useMemo(() => {
    const {width: _width, height: _height, factor} = viewport
    const [width, height] = [_width * factor, _height * factor]

    return [
      {
        name: 'bottom',
        position: [0, -height / 2, 0],
        args: [width, 0.01, height * 2],
      },
      {
        name: 'left',
        position: [-width / 2, 0, 0],
        args: [0.01, height, height * 2],
      },
      {
        name: 'right',
        position: [width / 2, 0, 0],
        args: [0.01, height, height * 2],
      },
      {
        name: 'back',
        position: [0, 0, -height],
        args: [width, height, 0.01],
      },
      {
        name: 'front',
        position: [0, 0, height],
        args: [width, height, 0.01],
      },
    ] as Configuration[]
  }, [viewport])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({visible: false})
  }, [])

  return (
    <group>
      {configurations.map(({name, position, args}) => (
        <RigidBody key={name} ref={refs[name]} type="fixed" position={position}>
          <mesh key={name} material={material}>
            <boxGeometry args={args} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
