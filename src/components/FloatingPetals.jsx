import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  FloatingPetals                                                     */
/*                                                                      */
/*  Ambient background particles — now using the REAL cherry blossom    */
/*  meshes from your Cloudinary GLB instead of a flat circle. The       */
/*  model has 5 distinct pieces (2 flowers, 1 bud, 2 petals); each      */
/*  gets its own InstancedMesh so they can be scattered independently   */
/*  with random position, random rotation, and random fall/drift        */
/*  timing — same physics feel as before, just with real geometry.      */
/*                                                                      */
/*  Purely decorative, does NOT read scroll — always animating, so it   */
/*  works as atmosphere behind/around the pillar regardless of stage.   */
/*                                                                      */
/*  Usage: just drop <FloatingPetals /> anywhere in the scene tree,      */
/*  e.g. inside ScrollRig's return, alongside <VerticalPillar /> etc.    */
/*  Needs to be inside a <Suspense> boundary (same as any other GLTF     */
/*  model) since useGLTF suspends while the file downloads.              */
/* ------------------------------------------------------------------ */

const MODEL_URL =
    "https://res.cloudinary.com/db9t6csa1/image/upload/v1783245366/cherry_blossom_petals_flowers_and_flower_bud_lgeine.glb";

// --- Tunable spawn volume — adjust to roughly surround your pillar ---
const SPAWN_WIDTH = 14;   // total X spread (centered on 0)
const SPAWN_HEIGHT = 16;  // total Y spread
const SPAWN_DEPTH = 10;   // total Z spread
const SPAWN_CENTER = [0, -2, 3]; // roughly centered near the pillar/camera area

// Total petals across ALL 5 mesh types combined (split evenly between them).
const TOTAL_PETAL_COUNT = 60;

// The source model appears to be modeled at a large scale (its own mesh
// offsets are in the tens of units — see Model.jsx's position={[83.448,...]}
// etc). This scales each individual instance down to something reasonable
// in a normal Three.js scene. TUNE THIS against how it actually looks —
// if petals look tiny, increase it; if they dwarf the pillar, decrease it.
const BASE_MODEL_SCALE = 0.02;
const PETAL_MIN_SCALE_MULT = 0.1;
const PETAL_MAX_SCALE_MULT = 0.5;

const FALL_SPEED_MIN = 0.15;
const FALL_SPEED_MAX = 0.4;
const DRIFT_SPEED = 0.3;   // sideways sway speed
const DRIFT_AMOUNT = 0.6;  // sideways sway distance
const SPIN_SPEED_MAX = 1.2;

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

// One InstancedMesh for a single petal/flower/bud mesh type — handles its
// own random particle data and per-frame fall/drift/spin animation.
function PetalTypeInstances({ geometry, material, count }) {
    const meshRef = useRef();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return Array.from({ length: count }, () => ({
            basePos: new THREE.Vector3(
                SPAWN_CENTER[0] + randomRange(-SPAWN_WIDTH / 2, SPAWN_WIDTH / 2),
                SPAWN_CENTER[1] + randomRange(-SPAWN_HEIGHT / 2, SPAWN_HEIGHT / 2),
                SPAWN_CENTER[2] + randomRange(-SPAWN_DEPTH / 2, SPAWN_DEPTH / 2)
            ),
            fallSpeed: randomRange(FALL_SPEED_MIN, FALL_SPEED_MAX),
            driftPhase: randomRange(0, Math.PI * 2),
            driftSpeedMult: randomRange(0.7, 1.3),
            spinSpeed: randomRange(-SPIN_SPEED_MAX, SPIN_SPEED_MAX),
            // Independent random starting rotation on all 3 axes, so
            // petals don't all start facing the same way.
            spinPhaseX: randomRange(0, Math.PI * 2),
            spinPhaseY: randomRange(0, Math.PI * 2),
            spinPhaseZ: randomRange(0, Math.PI * 2),
            scaleMult: randomRange(PETAL_MIN_SCALE_MULT, PETAL_MAX_SCALE_MULT),
        }));
    }, [count]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;

        particles.forEach((p, i) => {
            // Fall downward continuously, looping back to the top once below range.
            let y = p.basePos.y - ((t * p.fallSpeed) % SPAWN_HEIGHT);
            if (y < SPAWN_CENTER[1] - SPAWN_HEIGHT / 2) {
                y += SPAWN_HEIGHT;
            }

            // Gentle side-to-side drift, like a petal caught in light air.
            const x =
                p.basePos.x +
                Math.sin(t * DRIFT_SPEED * p.driftSpeedMult + p.driftPhase) * DRIFT_AMOUNT;

            dummy.position.set(x, y, p.basePos.z);
            dummy.rotation.set(
                p.spinPhaseX + t * p.spinSpeed * 0.3,
                p.spinPhaseY + t * p.spinSpeed * 0.5,
                p.spinPhaseZ + t * p.spinSpeed
            );
            dummy.scale.setScalar(BASE_MODEL_SCALE * p.scaleMult);
            dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, count]} />
    );
}

export default function FloatingPetals() {
    const { nodes, materials } = useGLTF(MODEL_URL);

    // The 5 distinct mesh types from the source GLB — see Model.jsx for
    // where these node/material names come from.
    const petalTypes = useMemo(
        () => [
            {
                geometry: nodes.flower_1_cherry_tree_leaves_0.geometry,
                material: materials.cherry_tree_leaves,
            },
            {
                geometry: nodes.flower_2_cherry_tree_leaves1_0.geometry,
                material: materials.cherry_tree_leaves1,
            },
            {
                geometry: nodes.bud_cherry_tree_leaves2_0.geometry,
                material: materials.cherry_tree_leaves2,
            },
            {
                geometry: nodes.petal_1_cherry_tree_leaves3_0.geometry,
                material: materials.cherry_tree_leaves3,
            },
            {
                geometry: nodes.petal_2_cherry_tree_leaves4_0.geometry,
                material: materials.cherry_tree_leaves4,
            },
        ],
        [nodes, materials]
    );

    const countPerType = Math.max(1, Math.floor(TOTAL_PETAL_COUNT / petalTypes.length));

    return (
        <>
            {petalTypes.map((pt, i) => (
                <PetalTypeInstances
                    key={i}
                    geometry={pt.geometry}
                    material={pt.material}
                    count={countPerType}
                />
            ))}
        </>
    );
}

useGLTF.preload(MODEL_URL);