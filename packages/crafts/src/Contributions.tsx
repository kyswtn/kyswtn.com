import {OrbitControls} from '@react-three/drei'
import {Canvas, type Euler, type Vector3, useThree} from '@react-three/fiber'
import {Physics} from '@react-three/rapier'
import {Suspense, useMemo} from 'react'
import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {randInt} from 'three/src/math/MathUtils.js'
import CanvasBoundOrthographicCamera from './CanvasBoundOrthographicCamera'
import CanvasBoundRigidWorldBox from './CanvasBoundRigidWorldBox'
import DraggableInstancedRigidBodies from './DraggableInstancedRigidBodies'

export type ContributionsProps = {
  blockSize?: number
  data?: number[]
}

export default function Contributions(props: ContributionsProps) {
  const {blockSize = 0.55, data = []} = props

  return (
    <Canvas>
      <CanvasBoundOrthographicCamera position={[0, 0, 200]} zoom={75} />

      <ambientLight intensity={2} />
      <directionalLight intensity={3} />

      <Suspense fallback={null}>
        <Physics>
          <Scene blockSize={blockSize} data={data} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

const tmpColor = new THREE.Color()
const palette = [
  '#ebedf0',
  '#9be9a8',
  '#40c463',
  '#30a14e',
  '#216e39',
  // Taken from GitHub as of 15/Jan/2024.
].map((c) => tmpColor.set(c).toArray())

function Scene(props: Required<ContributionsProps>) {
  const {blockSize, data} = props
  const viewport = useThree((state) => state.viewport)

  const contributions = useMemo(() => {
    const {width: _width, height: _height, factor} = viewport
    const [width, height] = [_width * factor, _height * factor]

    return data.map((c) => ({
      color: palette[c],
      position: [
        randInt(-width / 2.5, width / 2.5),
        randInt(0, height * 2),
        randInt(0, 1),
      ] as Vector3,
      rotation: [Math.random() * 1, Math.random() * 2, Math.random() * 3] as Euler,
    }))
  }, [data, viewport])

  const colors = useMemo(
    () => new Float32Array(contributions.flatMap((c) => c.color)),
    [contributions],
  )

  const geometry = useMemo(() => {
    const geometry = new RoundedBoxGeometry(blockSize, blockSize, blockSize, 4, 0.04)
    geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
    return geometry
  }, [blockSize, colors])

  const material = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({vertexColors: true, transmission: 0.5})
    return material
  }, [])

  return (
    <group>
      <CanvasBoundRigidWorldBox />
      <DraggableInstancedRigidBodies
        bodies={contributions.map((c) => ({position: c.position, rotation: c.rotation}))}
        geometry={geometry}
        material={material}
      />
    </group>
  )
}
