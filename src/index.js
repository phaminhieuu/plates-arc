import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react'
import ReactDOM from 'react-dom'
import * as THREE from 'three'
import { Canvas, createPortal, extend, useFrame } from 'react-three-fiber'
import { Cylinder, Environment } from '@react-three/drei'
import { a, config, useSpring, useSprings } from '@react-spring/three'
import { RoundedBoxBufferGeometry } from 'three/examples/jsm/geometries/RoundedBoxBufferGeometry'
import { CustomMaterial } from './material'
import usePostprocessing from './use-postprocessing'
import { getZ, SUPER_STIFF_CONFIG } from './utils'
import './styles.css'
import { useTweaks } from 'use-tweaks'

extend({ RoundedBoxBufferGeometry })

const ROW = 20
const COL = 20
const NUM = ROW * COL
const _obj = new THREE.Object3D()

function SpinningThing() {
  const instance = useRef()
  const scale = useMemo(() => new Array(NUM).fill().map(() => (Math.random() < 0.03 ? 3 : 1)), [])
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() / 4
    let id = 0
    for (let y = 0; y < ROW; y += 1) {
      for (let x = 0; x < COL; x += 1) {
        const s = scale[id]
        _obj.scale.set(s, s, s)
        _obj.position.set(
          (x - COL / 2) / 3 - 5,
          (y - ROW / 2) / 3 + 7,
          -10 +
            (Math.cos((4 * Math.PI * (x - COL / 2)) / COL + time) + Math.sin((8 * Math.PI * (y - ROW / 2)) / ROW + time)) +
            0.2 * (Math.cos((12 * Math.PI * (x - COL / 2)) / COL + time) + Math.sin((17 * Math.PI * (y - ROW / 2)) / ROW + time))
        )
        _obj.updateMatrix()
        instance.current.setMatrixAt(id, _obj.matrix)
        id += 1
      }
    }
    instance.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group rotation={[-Math.PI / 6, 0, -Math.PI / 6]}>
      <instancedMesh ref={instance} args={[null, null, NUM]}>
        <octahedronBufferGeometry args={[0.02, 2, 2]} />
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  )
}

function Plate(props) {
  const { position, springXY, springZ, flowMapOffset, tDiffuse, tDiffuseBlur } = props
  const { x, y, z } = useSpring({
    x: springXY.to([0, 1], [0, position[0]]),
    y: springXY.to([0, 1], [0, position[1]]),
    z: springZ.to([0, 1], [position[2], 0])
  })
  const materialProps = {
    attachArray: 'material',
    color: '#303030'
  }
  return (
    <a.mesh castShadow scale-z={0.04} position-x={x} position-y={y} position-z={z}>
      <roundedBoxBufferGeometry args={[1, 1, 1, 1, 0.02]} />
      <meshStandardMaterial {...materialProps} />
      <meshStandardMaterial {...materialProps} />
      <meshStandardMaterial {...materialProps} />
      <meshStandardMaterial {...materialProps} />
      <CustomMaterial
        {...materialProps}
        flowMapOffset={flowMapOffset}
        roughness={0.2}
        metalness={0.9}
        clearcoat={1}
        envMapIntensity={0.3}
        tDiffuse={tDiffuse}
        tDiffuseBlur={tDiffuseBlur}
      />
      <meshStandardMaterial {...materialProps} />
    </a.mesh>
  )
}

function Cube() {
  const refXY = useRef()
  const refZ = useRef()
  const [targetCamera] = useState(() => new THREE.PerspectiveCamera())
  const [targetScene] = useState(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('black')
    return scene
  })
  const [savePass, blurPass] = usePostprocessing(targetScene, targetCamera)
  const [springs] = useSprings(9, () => ({
    ref: refXY,
    x: 0
  }))
  const [{ z }] = useSpring(() => ({
    ref: refZ,
    z: 0
  }))

  useEffect(() => {
    async function animation() {
      await refXY.current.start((i) => ({
        x: 1,
        delay: i * 100,
        config: SUPER_STIFF_CONFIG
      }))
      await refZ.current.start({
        z: 1,
        config: SUPER_STIFF_CONFIG,
        delay: 1000
      })
      setTimeout(() => {
        refXY.current.start({ x: 0, config: config.molasses })
        refZ.current.start({ z: 0, config: config.molasses })
      }, 3000)
    }
    animation()
    const id = setInterval(animation, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {createPortal(<SpinningThing />, targetScene)}
      <group scale={[2, 2, 2]} rotation-x={-Math.PI / 6}>
        {/* <Cylinder receiveShadow args={[1.3, 1.3, 0.2, 64, 64]} rotation-x={Math.PI / 2} position-z={-0.15}>
          <meshStandardMaterial metalness={1} roughness={0.3} color="#292929" />
        </Cylinder> */}
        {springs.map(({ x }, index) => (
          <Plate
            key={`0${index}`}
            springXY={x}
            springZ={z}
            flowMapOffset={[-(index % 3) / 3, -Math.floor(index / 3) / 3]}
            position={[(index % 3) - 1, Math.floor(index / 3) - 1, getZ(index) / 32]}
            tDiffuse={savePass.renderTarget.texture}
            tDiffuseBlur={blurPass.renderTarget.texture}
          />
        ))}
      </group>
    </>
  )
}

function App() {
  const { pixelRatio } = useTweaks({
    pixelRatio: { value: 2, min: 1, max: 2 }
  })
  return (
    <Canvas
      concurrent
      shadowMap
      orthographic
      pixelRatio={pixelRatio}
      camera={{ near: 0.1, far: 100, position: [-4, 4, 10], zoom: 60 }}
      gl={{ powerPreference: 'high-performance', antialias: false, stencil: false, depth: false }}>
      <ambientLight intensity={0.1} />
      <spotLight
        castShadow
        angle={Math.PI / 2}
        penumbra={1}
        intensity={1.1}
        position={[10, 10, 10]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Suspense fallback={null}>
        <Cube />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
