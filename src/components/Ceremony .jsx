import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

import HaldiCard from "./HaldiCard";
import MehndiCard from "./MehndiCard";
import SangeetCard from "./SangeetCard";
import BaaratCard from "./BaaratCard";
import ThankYouCard from "./ThankYouCard";

/* ------------------------------------------------------------------ */
/*  Ceremony                                                          */
/*                                                                      */
/*  Runs AFTER the pillar/couple reveal finishes (~page 7.5). Camera    */
/*  orbits clockwise around the pillar while slowly descending, making  */
/*  one stop per ceremony: Haldi -> Mehndi -> Sangeet -> Baarat, then    */
/*  continuing PAST a full loop to Thank You (405°) so the ending feels  */
/*  like a continuous spiral rather than snapping back to the start.    */
/*                                                                      */
/*  *** HANDOFF FIX ***                                                 */
/*  ScrollRig.jsx leaves the camera at CAMERA_FIXED_POSITION, gazing    */
/*  at CAMERA_HANDOFF_ANGLE_DEG (see its CAMERA_ANGLE_END). To avoid a   */
/*  jump-cut, ORBIT_RADIUS / ORBIT_START_Y below are DERIVED from that   */
/*  same fixed position + the pillar position, instead of independent    */
/*  guesses. That fixes the camera POSITION jump.                       */
/*  The ROTATION jump is fixed separately: for the first                */
/*  LOOKAT_BLEND_PAGES of this stage, the lookAt target eases from       */
/*  ScrollRig's actual gaze target (HANDOFF_LOOK_TARGET) into this       */
/*  component's own pillar-axis lookAt, instead of snapping instantly.  */
/*  If CAMERA_FIXED_POSITION / CAMERA_ANGLE_END / CAMERA_LOOK_DISTANCE   */
/*  ever change in ScrollRig.jsx, update the matching constants here.   */
/*                                                                      */
/*  *** CARD PLACEMENT — "poster on the wall" ***                       */
/*  The pillar is a BOX (VerticalPillar.jsx: PILLAR_WIDTH = PILLAR_DEPTH */
/*  = 2), not a cylinder, so its distance-from-axis is NOT constant      */
/*  around the loop — it's 1 unit at a flat face, but ~1.41 (half the    */
/*  diagonal) at a 45° corner. Four of the five stops (haldi/mehndi/     */
/*  sangeet/baarat, at 0/90/180/270°) land exactly on flat faces, so     */
/*  they use CARD_FACE_RADIUS. The fifth stop (thankyou, at 405° = 45°)  */
/*  lands on a CORNER, not a face, so it uses the larger                 */
/*  CARD_CORNER_RADIUS instead — otherwise that one poster would clip     */
/*  into the box geometry. Cards face OUTWARD (rotationY = angleRad),    */
/*  flush against the surface, like a poster taped to the wall — not     */
/*  facing inward toward the pillar's core.                              */
/*  CARD_WIDTH/HEIGHT are sized to fit within the pillar's face width     */
/*  (PILLAR_WIDTH = 2) so posters don't overhang the edges.               */
/* ------------------------------------------------------------------ */

const TOTAL_PAGES = 20; // must match TOTAL_PAGES in ScrollRig.jsx / VerticalPillar.jsx
const CAMERA_DAMPING = 3; // matches the slow/deliberate feel used elsewhere

// Must match VerticalPillar.jsx
const PILLAR_POSITION = [0, -5, 2];
const PILLAR_HEIGHT = 9;
const PILLAR_WIDTH = 2; // must match VerticalPillar.jsx PILLAR_WIDTH
const PILLAR_DEPTH = 2; // must match VerticalPillar.jsx PILLAR_DEPTH

// --- Handoff constants — MUST match ScrollRig.jsx exactly ---
const CAMERA_FIXED_POSITION = [0, 1.6, 5]; // must match ScrollRig.jsx CAMERA_FIXED_POSITION
const CAMERA_HANDOFF_ANGLE_DEG = 60; // must match ScrollRig.jsx CAMERA_ANGLE_END
const CAMERA_LOOK_DISTANCE = 9; // must match ScrollRig.jsx CAMERA_LOOK_DISTANCE
const LOOKAT_BLEND_PAGES = 1.5; // pages over which lookAt eases from ScrollRig's gaze to the pillar-axis lookAt

// Camera orbit geometry — DERIVED from the handoff position/pillar, not
// hardcoded, so Stage 0 starts exactly where ScrollRig leaves the camera.
const ORBIT_RADIUS = Math.hypot(
    CAMERA_FIXED_POSITION[0] - PILLAR_POSITION[0],
    CAMERA_FIXED_POSITION[2] - PILLAR_POSITION[2]
);

// Card ("poster") geometry — INDEPENDENT of the camera's orbit radius,
// derived instead from the pillar's own box dimensions.
const CARD_WALL_OFFSET = 0.05; // tiny gap so the poster doesn't z-fight with the pillar surface
const CARD_FACE_RADIUS = PILLAR_WIDTH / 2 + CARD_WALL_OFFSET; // for the 4 flat-face stops
const CARD_CORNER_RADIUS =
    Math.hypot(PILLAR_WIDTH / 2, PILLAR_DEPTH / 2) + CARD_WALL_OFFSET; // for the 45° corner stop (thankyou)

const CARD_WIDTH = 1.7; // fits within PILLAR_WIDTH (2) without overhanging the face
const CARD_HEIGHT = 2.2;

// Height (Y) the orbit starts at (= ScrollRig's fixed camera height, so no
// height jump) and ends at (near the pillar base) — descends across all 5 stops.
const ORBIT_START_Y = CAMERA_FIXED_POSITION[1];
const ORBIT_END_Y = PILLAR_POSITION[1] + PILLAR_HEIGHT * 0.15;

// --- Stage keyframes: page, orbit angle (deg), height ---
// Angle 0 = front (where the couple/camera already is at page 7.5).
// Clockwise = increasing angle = "moving right" as requested.
// isCorner marks the one stage (thankyou, 45°) that lands on a box corner
// rather than a flat face, so its card uses CARD_CORNER_RADIUS.
const STAGE_START = 7.5; // must match PILLAR_FULLY_VISIBLE in VerticalPillar.jsx / CAMERA_HANDOFF_PAGE in ScrollRig.jsx

const STAGES = [
    { name: "haldi", page: 7.5, angleDeg: 0, heightT: 0, isCorner: false, yOffset: -1.2 }, // nudged down slightly
    { name: "mehndi", page: 10.5, angleDeg: 90, heightT: 0.25, isCorner: false, yOffset: 0 },
    { name: "sangeet", page: 13.5, angleDeg: 180, heightT: 0.5, isCorner: false, yOffset: 0 },
    { name: "baarat", page: 16.5, angleDeg: 270, heightT: 0.75, isCorner: false, yOffset: 0 },
    { name: "thankyou", page: 19.5, angleDeg: 405, heightT: 1, isCorner: true, yOffset: 0 },
];

const CARD_COMPONENTS = {
    haldi: HaldiCard,
    mehndi: MehndiCard,
    sangeet: SangeetCard,
    baarat: BaaratCard,
    thankyou: ThankYouCard,
};

// Each card fades in/out around its own stop — visible roughly from
// halfway-to-previous-stop through halfway-to-next-stop.
const CARD_FADE_WINDOW = 1.5; // pages of fade in/out on each side

function ease(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

// Finds the two surrounding keyframes for a given page and returns an
// eased interpolation factor between them, clamped at both ends of STAGES.
function interpolateStages(page) {
    if (page <= STAGES[0].page) {
        return { angleDeg: STAGES[0].angleDeg, heightT: STAGES[0].heightT };
    }
    if (page >= STAGES[STAGES.length - 1].page) {
        const last = STAGES[STAGES.length - 1];
        return { angleDeg: last.angleDeg, heightT: last.heightT };
    }
    for (let i = 0; i < STAGES.length - 1; i++) {
        const a = STAGES[i];
        const b = STAGES[i + 1];
        if (page >= a.page && page <= b.page) {
            const t = ease((page - a.page) / (b.page - a.page));
            return {
                angleDeg: THREE.MathUtils.lerp(a.angleDeg, b.angleDeg, t),
                heightT: THREE.MathUtils.lerp(a.heightT, b.heightT, t),
            };
        }
    }
    return { angleDeg: 0, heightT: 0 };
}

// Simple triangular fade window around a stage's own page.
function getCardOpacity(page, stagePage) {

    const dist = Math.abs(page - stagePage);
    if (dist >= CARD_FADE_WINDOW) return 0;
    return ease(1 - dist / CARD_FADE_WINDOW);
}

// --- Reconstruct ScrollRig's final lookAt target (same math it uses for   ---
// --- CAMERA_ANGLE_END), so we know exactly what direction it hands off.  ---
const HANDOFF_ELEVATION_RAD = THREE.MathUtils.degToRad(CAMERA_HANDOFF_ANGLE_DEG - 90);
const HANDOFF_GAZE_DIR = new THREE.Vector3(
    0,
    Math.sin(HANDOFF_ELEVATION_RAD),
    -Math.cos(HANDOFF_ELEVATION_RAD)
);
const HANDOFF_LOOK_TARGET = new THREE.Vector3(
    CAMERA_FIXED_POSITION[0] + HANDOFF_GAZE_DIR.x * CAMERA_LOOK_DISTANCE,
    CAMERA_FIXED_POSITION[1] + HANDOFF_GAZE_DIR.y * CAMERA_LOOK_DISTANCE,
    CAMERA_FIXED_POSITION[2] + HANDOFF_GAZE_DIR.z * CAMERA_LOOK_DISTANCE
);

export default function Ceremony() {
    const scroll = useScroll();
    const { camera } = useThree();
    const smoothedPage = useRef(STAGE_START);

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;

        // Only take over the camera once we're in this stage's range.
        if (rawPage < STAGE_START) return;

        smoothedPage.current = THREE.MathUtils.damp(
            smoothedPage.current,
            rawPage,
            CAMERA_DAMPING,
            delta
        );

        const { angleDeg, heightT } = interpolateStages(smoothedPage.current);
        const angleRad = THREE.MathUtils.degToRad(angleDeg);
        const y = THREE.MathUtils.lerp(ORBIT_START_Y, ORBIT_END_Y, heightT);

        const camX = PILLAR_POSITION[0] + ORBIT_RADIUS * Math.sin(angleRad);
        const camZ = PILLAR_POSITION[2] + ORBIT_RADIUS * Math.cos(angleRad);

        camera.position.set(camX, y, camZ);

        // Blend the lookAt target from ScrollRig's handoff gaze into our own
        // pillar-axis lookAt over LOOKAT_BLEND_PAGES, so rotation doesn't snap.
        const pillarLookTarget = new THREE.Vector3(PILLAR_POSITION[0], y, PILLAR_POSITION[2]);
        const blendT = ease(
            (smoothedPage.current - STAGE_START) / LOOKAT_BLEND_PAGES
        );
        const finalLookTarget = new THREE.Vector3().lerpVectors(
            HANDOFF_LOOK_TARGET,
            pillarLookTarget,
            blendT
        );

        camera.lookAt(finalLookTarget);
    });

    return (
        <>
            {STAGES.map((stage) => {
                const angleRad = THREE.MathUtils.degToRad(stage.angleDeg);
                const y = THREE.MathUtils.lerp(ORBIT_START_Y, ORBIT_END_Y, stage.heightT) + (stage.yOffset || 0);

                // Flat-face stops sit at CARD_FACE_RADIUS; the corner stop
                // (thankyou) sits at the larger CARD_CORNER_RADIUS so it
                // doesn't clip into the pillar's box geometry.
                const radius = stage.isCorner ? CARD_CORNER_RADIUS : CARD_FACE_RADIUS;

                const cardX = PILLAR_POSITION[0] + radius * Math.sin(angleRad);
                const cardZ = PILLAR_POSITION[2] + radius * Math.cos(angleRad);

                // Face outward, flush against the surface — like a poster
                // taped to the wall, not facing inward toward the pillar core.
                const rotationY = angleRad;

                const CardComponent = CARD_COMPONENTS[stage.name];

                return (
                    <CeremonyCardSlot
                        key={stage.name}
                        CardComponent={CardComponent}
                        position={[cardX, y, cardZ]}
                        rotationY={rotationY}
                        stagePage={stage.page}
                    />
                );
            })}
        </>
    );
}

// Small wrapper so each card can read scroll independently for its own
// fade opacity, without re-running the full stage interpolation above.
// Drives the mesh's material opacity directly via ref each frame — a real
// fade, not a visibility snap.
function CeremonyCardSlot({ CardComponent, position, rotationY, stagePage }) {
    const scroll = useScroll();
    const meshRef = useRef();
    const opacityRef = useRef(0);

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;
        const targetOpacity = getCardOpacity(rawPage, stagePage);
        opacityRef.current = THREE.MathUtils.damp(
            opacityRef.current,
            targetOpacity,
            CAMERA_DAMPING,
            delta
        );

        if (meshRef.current) {
            meshRef.current.material.opacity = opacityRef.current;
            meshRef.current.visible = opacityRef.current > 0.01;
        }
    });

    return (
        <CardComponent
            ref={meshRef}
            position={position}
            rotationY={rotationY}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
        />
    );
}