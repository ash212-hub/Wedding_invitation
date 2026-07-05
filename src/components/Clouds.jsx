import * as THREE from 'three'
import { Cloud, Clouds as DreiClouds } from '@react-three/drei'

/*
Simple sky clouds using drei's <Clouds>/<Cloud>.
Drop <Clouds /> anywhere inside your <Canvas>.
Tweak the CONFIG array below to add/remove/reposition puffs.
*/

const CONFIG = [
    { seed: 1, position: [-8, 4, -10], scale: 2.2, volume: 8, opacity: 0.8 },
    { seed: 2, position: [6, 6, -14], scale: 3, volume: 10, opacity: 0.7 },
    { seed: 3, position: [0, 2, -20], scale: 2.6, volume: 9, opacity: 0.75 },
    { seed: 4, position: [-14, 7, -6], scale: 1.8, volume: 6, opacity: 0.6 },
]

export function Clouds() {
    return (
        <DreiClouds material={THREE.MeshBasicMaterial}>
            {CONFIG.map((cfg, i) => (
                <Cloud
                    key={i}
                    seed={cfg.seed}
                    position={cfg.position}
                    scale={cfg.scale}
                    volume={cfg.volume}
                    opacity={cfg.opacity}
                    fade={100}
                    speed={0.2} // built-in gentle drift, no useFrame needed
                />
            ))}
        </DreiClouds>
    )
}