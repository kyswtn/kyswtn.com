import {Canvas, type GroupProps, useFrame} from '@react-three/fiber'
import {Physics, type RapierRigidBody, RigidBody, type RigidBodyProps} from '@react-three/rapier'
import {Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {fetchBlobAndCache} from './fetchBlobAndCache'
import {getImageDataFromFile} from './getImageDataFromFile'
import {pixelateImage} from './pixelateImage'
import {useRaycastedOnDrag} from './useRaycastedOnDrag'

type VoxelIshProps = {
  image: string
  blockSize?: number
}

export default function VoxelIsh(props: VoxelIshProps) {
  const {image: filePath, blockSize = 1} = props
  const [imageData, setImageData] = useState<ImageData>()

  useEffect(() => {
    ;(async () => {
      const blob = await fetchBlobAndCache(filePath)
      const file = new File([blob], filePath, {type: blob.type})
      const imageData = await getImageDataFromFile(file)
      setImageData(imageData)
    })()
  }, [filePath])

  return (
    <Canvas camera={{position: [0, 5, 1]}}>
      <directionalLight color="white" position={[-36, 2, -82]} intensity={15} />
      <directionalLight intensity={0.25} />
      <ambientLight intensity={0.25} />

      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]}>
          {imageData ? <VoxelImage imageData={imageData} blockSize={blockSize} /> : null}
        </Physics>
      </Suspense>
    </Canvas>
  )
}

type VoxelImageProps = {
  imageData: ImageData
  blockSize?: number
}

type ActiveDrag = {
  instanceId: number
  rigidBody: RapierRigidBody
}

const tmpObject3d = new THREE.Object3D()
const tmpObject3dPosition = new THREE.Vector3()
const yAxisNormal = new THREE.Vector3(0, 1, 0)

function VoxelImage({imageData: _imageData, blockSize = 1}: VoxelImageProps) {
  // Process image and turn them into renderable block props, shift coordinates to recenter etc.
  const imageData = useMemo(() => pixelateImage(_imageData), [_imageData])
  const blocks = useMemo(() => {
    const shiftLeft = imageData.width / 2.1
    const shiftRight = imageData.height / 1.95
    return getBlocksFromImageData(imageData, blockSize, [shiftLeft, shiftRight])
  }, [imageData, blockSize])

  // RoundedBoxGeometry used by instancedMesh, with colors attribute.
  const colors = useMemo(() => new Float32Array(blocks.flatMap((b) => b.color)), [blocks])
  const instancedMeshGeometry = useMemo(() => {
    const geometry = new RoundedBoxGeometry(blockSize, blockSize, blockSize, 4, 0.015)
    geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 4))
    return geometry
  }, [blockSize, colors])

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    for (let i = 0; i < blocks.length; i++) {
      const [x, y, z] = blocks[i].position
      // The blocks will be initially hidden, but they must be rendered otherwise instancedMesh
      // will render blocks on [0, 0, 0] on start.
      tmpObject3d.scale.set(0, 0, 0)
      tmpObject3d.position.set(x, y, z)
      tmpObject3d.updateMatrix()
      instancedMeshRef.current.setMatrixAt(i, tmpObject3d.matrix)
    }
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  }, [blocks])

  // These geometry and materials will be used by invisible drag handles and rigid bodies.
  // biome-ignore format: Single line reads better.
  const blockSizedBoxGeometry = useMemo(
    () => new THREE.BoxGeometry(blockSize, blockSize, blockSize),
    [blockSize],
  )
  const basicInvisibleMaterial = useMemo(() => new THREE.MeshBasicMaterial({visible: false}), [])
  const dragHandlesGroupRef = useRef<THREE.Group>(null!)
  const dragHandles = useRef<THREE.Mesh[]>([])
  const rigidBodies = useRef<RapierRigidBody[]>([])
  const activeDrag = useRef<ActiveDrag>()
  const bindGestures = useRaycastedOnDrag({
    planeNormal: yAxisNormal,
    intersectingRef: dragHandlesGroupRef,
    onDragStart: (dragHandle) => {
      // Set active drag triple.
      const instanceId = dragHandle.userData.index as number
      const rigidBody = rigidBodies.current[instanceId]
      activeDrag.current = {instanceId, rigidBody}

      // Wake rigidBody up to prepare for kinematic translation.
      rigidBody.setBodyType(2, true)
    },
    onDrag: (dragHandle) => {
      if (activeDrag.current === undefined) return
      const {instanceId, rigidBody} = activeDrag.current

      // Update instance's position.
      const {x, y, z} = dragHandle.position
      tmpObject3d.position.set(x, y, z)
      // Since the instance will be moved to new position, there's no need to care about previous
      // position of temporary object, but previous rotation (and scale) must be taken into account.
      tmpObject3d.setRotationFromEuler(dragHandle.rotation)
      tmpObject3d.updateMatrix()
      instancedMeshRef.current.setMatrixAt(instanceId, tmpObject3d.matrix)
      instancedMeshRef.current.instanceMatrix.needsUpdate = true

      // Move linked rigidbody kinematically.
      tmpObject3d.getWorldPosition(tmpObject3dPosition)
      rigidBody.setNextKinematicTranslation(tmpObject3dPosition)
    },
    onDragEnd: () => {
      if (!activeDrag.current) return
      activeDrag.current.rigidBody.setBodyType(0, true)
      activeDrag.current = undefined
    },
  })

  // Animate blocks on mount.
  const animationProgress = useRef<number[]>([])
  const animationComplete = useRef(false)
  useFrame((_, delta) => {
    if (animationComplete.current) return
    if (animationProgress.current.length < 1) {
      animationProgress.current = blocks.map(() => 0)
    }

    let allBlocksFinished = true
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const [x, y, z] = block.position
      const delayFactor = block.distanceFromCenter * 0.25

      // Increment progress after delay.
      if (animationProgress.current[i] < delayFactor) {
        animationProgress.current[i] += delta
        allBlocksFinished = false
        continue
      }

      const progress = (animationProgress.current[i] - delayFactor) / 1.0
      if (progress < 1) {
        animationProgress.current[i] += delta
        const easedProgress = 1 - (1 - progress) ** 6

        // Lerp position between start and target.
        const startY = y - 0.25
        const newY = THREE.MathUtils.lerp(startY, y, easedProgress)

        // Update block's position and scale.
        tmpObject3d.rotation.set(0, 0, 0, THREE.Euler.DEFAULT_ORDER)
        tmpObject3d.scale.set(1, 1, 1)
        tmpObject3d.position.set(x, newY, z)
        tmpObject3d.updateMatrix()
        instancedMeshRef.current.setMatrixAt(i, tmpObject3d.matrix)

        allBlocksFinished = false
      }
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true
    if (allBlocksFinished) animationComplete.current = true
  })

  // This gets triggered whenever a rigid body's state change. This saves me from having to sync
  // instances to rigid bodies with hooks such as useAfterPhysicsStep.
  type RigidBodyState = ReturnType<NonNullable<RigidBodyProps['transformState']>>
  const transformRigidBodyState = useCallback((state: RigidBodyState, index: number) => {
    return {
      ...state,
      getMatrix: (matrix) => {
        instancedMeshRef.current.getMatrixAt(index, matrix)
        return matrix
      },
      setMatrix: (matrix) => {
        // Don't sync if the instance is the one being dragged.
        if (activeDrag.current?.instanceId === index) return

        // Sync drag handle.
        const dragHandle = dragHandles.current[index]
        if (dragHandle) {
          dragHandle.position.setFromMatrixPosition(matrix)
          dragHandle.setRotationFromMatrix(matrix)
        }

        // Don't sync if the blocks have not finished animating.
        if (!animationComplete.current) return state

        // Sync instance.
        instancedMeshRef.current.setMatrixAt(index, matrix)
        instancedMeshRef.current.instanceMatrix.needsUpdate = true
      },
      meshType: 'instancedMesh',
    } as typeof state
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset refs on blocks update.
  useEffect(() => {
    return () => {
      dragHandles.current = []
      rigidBodies.current = []
      animationProgress.current = []
      animationComplete.current = false
      if (instancedMeshRef.current) {
        instancedMeshRef.current.clear()
        instancedMeshRef.current.instanceMatrix.needsUpdate = true
      }
    }
  }, [blocks])

  return (
    <group>
      <instancedMesh
        ref={instancedMeshRef}
        args={[instancedMeshGeometry, undefined, blocks.length]}
      >
        <meshPhysicalMaterial vertexColors />
      </instancedMesh>

      <group ref={dragHandlesGroupRef} {...(bindGestures() as GroupProps)}>
        {blocks.map((block, index) => (
          <mesh
            key={block.key}
            userData={{index}}
            position={block.position}
            ref={(dragHandle) => {
              if (dragHandle) dragHandles.current[index] = dragHandle
            }}
            geometry={blockSizedBoxGeometry}
            material={basicInvisibleMaterial}
          />
        ))}
      </group>

      {blocks.map((block, index) => (
        <RigidBody
          key={block.key}
          position={block.position}
          ref={(rigidBody) => {
            if (rigidBody) rigidBodies.current[index] = rigidBody
          }}
          // This is the function internally used by @react-three/rapier's InstancedRigidBodies.
          transformState={(state) => transformRigidBodyState(state, index)}
          // Physics configurations to make blocks behave the way they do.
          angularDamping={1.5}
          linearDamping={1.5}
        >
          <mesh geometry={blockSizedBoxGeometry} material={basicInvisibleMaterial} />
        </RigidBody>
      ))}
    </group>
  )
}

type BlockProps = {
  key: string
  position: [x: number, y: number, z: number]
  color: [r: number, g: number, b: number, a: number]
  distanceFromCenter: number
}

function getBlocksFromImageData(
  imageData: ImageData,
  blockSize: number,
  shifts: readonly [number, number],
): BlockProps[] {
  const {data, width, height} = imageData
  const [shiftLeft, shiftTop] = shifts
  const [centerX, centerY] = [width / 2, height / 2]

  const keyPrefix = Date.now().toString(36)
  const blocks: BlockProps[] = []
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const index = i * width + j

      // ImageData comes with a flat Uint8 array where each 4 items represent a pixel and it's
      // RGBA values.
      const [r, g, b, a] = data.slice(index * 4, index * 4 + 4)
      if (a <= 0) continue

      blocks.push({
        key: `${keyPrefix}-${j}-${i}`,
        position: [(j - shiftLeft) * blockSize, 0, (i - shiftTop) * blockSize],
        distanceFromCenter: Math.sqrt((centerX - j) ** 2 + (centerY - i) ** 2) / centerX,
        color: [r / 255, g / 255, b / 255, a],
      })
    }
  }
  return blocks
}
