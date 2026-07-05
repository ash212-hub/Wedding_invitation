import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";
import { Couple } from "./Couple";

/* ------------------------------------------------------------------ */
/*  VerticalPillar                                                     */
/*                                                                      */
/*  A single pillar that emerges as the camera tilts down (see          */
/*  ScrollRig's camera tilt stage). This component drives its OWN       */
/*  reveal animation from scroll position, so it stays fully decoupled  */
/*  from ScrollRig — just render <VerticalPillar /> anywhere.           */
/*                                                                      */
/*  The Couple model sits ON TOP of the pillar and rises with it as it  */
/*  grows — it has its own group/transform, entirely separate from the  */
/*  pillar mesh's scale, so it never gets stretched or squished.        */
/*                                                                      */
/*  Timeline (in "pages" — must match TOTAL_PAGES in ScrollRig.jsx):    */
/*    before APPEAR_START     : invisible                              */
/*    APPEAR_START -> VISIBLE : grows up in height, as if rising out     */
/*                              of the ground/clouds — solid color       */
/*                              throughout, no fading                   */
/*    VISIBLE onward          : fully revealed, gentle idle glow pulse  */
/* ------------------------------------------------------------------ */
const TOTAL_PAGES = 20; // must match TOTAL_PAGES in ScrollRig.jsx

const PILLAR_APPEAR_START = 4.5;    // starts growing in
const PILLAR_FULLY_VISIBLE = 7.5;   // fully revealed
const PILLAR_IDLE_PULSE_SPEED = 0.6; // gentle breathing glow once visible
const PILLAR_REVEAL_DAMPING = 3;    // slower/steadier than the plane's damping — this is meant to feel slow and deliberate

const PILLAR_POSITION = [0, -5, 2]; // [x, groundY, z] — where its base sits in the scene
const PILLAR_WIDTH = 2;
const PILLAR_HEIGHT = 9;
const PILLAR_DEPTH = 2;
const PILLAR_COLOR = "#4a90d9";

// Couple sits on top of the pillar. Adjust COUPLE_FOOT_OFFSET if the Couple
// model's own origin isn't exactly at its feet (e.g. if it still looks like
// it's floating above or sunk into the pillar top, nudge this up/down).
const COUPLE_FOOT_OFFSET = 1;
const COUPLE_SCALE = 1;

function ease(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

function getRevealT(page) {
    if (page <= PILLAR_APPEAR_START) return 0;
    if (page >= PILLAR_FULLY_VISIBLE) return 1;
    return ease(
        (page - PILLAR_APPEAR_START) / (PILLAR_FULLY_VISIBLE - PILLAR_APPEAR_START)
    );
}

export function VerticalPillar() {
    const scroll = useScroll();
    const pillarMeshRef = useRef(); // owns the pillar's OWN scale/position only
    const coupleGroupRef = useRef(); // owns the couple's OWN position only — never scaled
    const smoothedPage = useRef(0);

    const geometry = useMemo(
        () => new THREE.BoxGeometry(PILLAR_WIDTH, PILLAR_HEIGHT, PILLAR_DEPTH),
        []
    );

    // No transparency/opacity — pillar is always fully solid, normal color.
    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: PILLAR_COLOR,
                emissive: PILLAR_COLOR,
                emissiveIntensity: 0.35,
                metalness: 0.6,
                roughness: 0.35,
            }),
        []
    );

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;
        smoothedPage.current = THREE.MathUtils.damp(
            smoothedPage.current,
            rawPage,
            PILLAR_REVEAL_DAMPING,
            delta
        );

        const revealT = getRevealT(smoothedPage.current);
        const scaleY = THREE.MathUtils.lerp(0.15, 1, revealT);
        const visible = revealT > 0.01;

        // --- Pillar mesh: grows in height, base anchored at ground level. ---
        if (pillarMeshRef.current) {
            pillarMeshRef.current.scale.set(1, scaleY, 1);
            const baseY = PILLAR_POSITION[1] + (PILLAR_HEIGHT * scaleY) / 2;
            pillarMeshRef.current.position.set(PILLAR_POSITION[0], baseY, PILLAR_POSITION[2]);
            pillarMeshRef.current.visible = visible;

            // Gentle idle glow once fully visible — subtle, just enough to feel alive.
            material.emissiveIntensity =
                revealT >= 1
                    ? 0.35 + Math.sin(state.clock.elapsedTime * PILLAR_IDLE_PULSE_SPEED) * 0.15
                    : 0.35;
        }

        // --- Couple: sits on top of the pillar's current top surface, rising ---
        // --- together with it. Own group, own scale (always 1) — never gets ---
        // --- stretched by the pillar's non-uniform scale. ---
        if (coupleGroupRef.current) {
            const pillarTopY = PILLAR_POSITION[1] + PILLAR_HEIGHT * scaleY;
            coupleGroupRef.current.position.set(
                PILLAR_POSITION[0],
                pillarTopY + COUPLE_FOOT_OFFSET,
                PILLAR_POSITION[2]
            );
            coupleGroupRef.current.visible = visible;
        }
    });

    return (
        <>
            <mesh ref={pillarMeshRef} geometry={geometry} material={material} />
            <group ref={coupleGroupRef}>
                <Couple scale={COUPLE_SCALE} />
            </group>
        </>
    );
}