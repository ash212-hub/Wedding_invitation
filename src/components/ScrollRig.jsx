import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";
import { Aeroplane } from "./Aeroplane";
import { VerticalPillar } from "./VerticalPillar";
import Ceremony from "./Ceremony ";

/* ------------------------------------------------------------------ */
/*  STEP 1 — plane pass + fog-reveal tilt                               */
/*                                                                      */
/*  Camera position is FIXED for the whole sequence — it never          */
/*  translates. Only its gaze rotates.                                  */
/*                                                                      */
/*  Angle convention (matches "90° = level, 90-30=60 is down" math):    */
/*    angle = 90   -> looking level at the horizon                      */
/*    angle > 90   -> looking upward   (elevation = angle - 90)         */
/*    angle < 90   -> looking downward (elevation = angle - 90, neg.)   */
/*                                                                      */
/*  Stage A (pages 0 -> ~3.2): plane crosses right-to-left directly     */
/*    in front of the camera, then exits. Camera gaze holds at          */
/*    CAMERA_ANGLE_START (120° -> 30° above level).                     */
/*  Stage B (pages 3.4 -> 7): gaze rotates down from 120° to 60°        */
/*    (30° above level -> 30° below level). Fog density eases from      */
/*    "thick / hides pillar" to "clear / pillar fully visible" in       */
/*    lockstep — that's the reveal. The pillar itself never moves;      */
/*    it's simply uncovered as the fog thins while the gaze arrives.    */
/* ------------------------------------------------------------------ */
const TOTAL_PAGES = 20; // must match <ScrollControls pages={...}> and TOTAL_PAGES in VerticalPillar.jsx

// ===== Plane flight path — straight right-to-left pass, in front of camera =====
const FLIGHT_KEYFRAMES = [
    { page: 0, x: 10, y: 1, z: -2, roll: -6 },   // enters from the right
    { page: 1.2, x: 2, y: 1, z: -2, roll: 0 },   // passes directly in front of camera
    { page: 2.5, x: -6, y: 1, z: -2, roll: 4 },  // continuing left, slight bank
    { page: 3.2, x: -16, y: 1, z: -2, roll: 0 }, // fully off-screen, out of the scene
];

const PLANE_VANISH_START = 2.6;
const PLANE_VANISH_END = 3.3;

// ===== Camera — fixed position, only the gaze angle changes =====
const CAMERA_FIXED_POSITION = [0, 1.6, 5]; // set once, never moves

const CAMERA_ANGLE_START = 120; // 90 + 30 -> looking 30° above level (during plane pass)
const CAMERA_ANGLE_END = 60;    // 90 - 30 -> looking 30° below level (onto the pillar)
const CAMERA_TILT_START_PAGE = 3.4; // tilt begins only once the plane has fully vanished
const CAMERA_TILT_END_PAGE = 7;
const CAMERA_LOOK_DISTANCE = 9;
const CAMERA_TILT_DAMPING = 2; // slow, deliberate — not snappy
// thin — pillar fully visible
const CAMERA_HANDOFF_PAGE = 7.5; // must match STAGE_START in Ceremony.jsx — ScrollRig stops driving camera here

// ===== Plane model / motion tuning =====
const MODEL_FORWARD_OFFSET_DEG = 0;
const PAGE_DAMPING = 4;
const CURVE_TENSION = 0.5;

function ease(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

function pageToCurveT(page, kfs) {
    const n = kfs.length;
    if (page <= kfs[0].page) return 0;
    if (page >= kfs[n - 1].page) return 1;
    for (let i = 0; i < n - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        if (page >= a.page && page <= b.page) {
            const localT = (page - a.page) / (b.page - a.page);
            return (i + localT) / (n - 1);
        }
    }
    return 1;
}

function getRoll(page, kfs) {
    const n = kfs.length;
    if (page <= kfs[0].page) return kfs[0].roll;
    if (page >= kfs[n - 1].page) return kfs[n - 1].roll;
    for (let i = 0; i < n - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        if (page >= a.page && page <= b.page) {
            const t = ease((page - a.page) / (b.page - a.page));
            return THREE.MathUtils.lerp(a.roll, b.roll, t);
        }
    }
    return kfs[n - 1].roll;
}

function getPlaneOpacity(page) {
    if (page <= PLANE_VANISH_START) return 1;
    if (page >= PLANE_VANISH_END) return 0;
    return 1 - ease((page - PLANE_VANISH_START) / (PLANE_VANISH_END - PLANE_VANISH_START));
}

export function ScrollRig() {
    const scroll = useScroll();
    const planeRef = useRef();
    const smoothedPage = useRef(0);
    const lastHeadingRad = useRef(0);
    const smoothedAngleDeg = useRef(CAMERA_ANGLE_START);
    const cameraPlaced = useRef(false);

    const curve = useMemo(() => {
        const points = FLIGHT_KEYFRAMES.map((k) => new THREE.Vector3(k.x, k.y ?? 0, k.z));
        return new THREE.CatmullRomCurve3(points, false, "catmullrom", CURVE_TENSION);
    }, []);

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;
        smoothedPage.current = THREE.MathUtils.damp(smoothedPage.current, rawPage, PAGE_DAMPING, delta);
        const page = smoothedPage.current;
        // ===== PLANE =====
        if (planeRef.current) {
            const t = pageToCurveT(page, FLIGHT_KEYFRAMES);
            const pos = curve.getPoint(t);
            const tangent = curve.getTangent(t);
            const roll = getRoll(page, FLIGHT_KEYFRAMES);

            const horizontalLenSq = tangent.x * tangent.x + tangent.z * tangent.z;
            let headingRad;
            if (horizontalLenSq < 1e-6) {
                headingRad = lastHeadingRad.current;
            } else {
                headingRad =
                    Math.atan2(tangent.x, tangent.z) + THREE.MathUtils.degToRad(MODEL_FORWARD_OFFSET_DEG);
                lastHeadingRad.current = headingRad;
            }
            const pitchRad = -Math.atan2(tangent.y, Math.sqrt(horizontalLenSq) || 1e-6);

            planeRef.current.position.set(pos.x, pos.y, pos.z);
            planeRef.current.rotation.set(pitchRad, headingRad, THREE.MathUtils.degToRad(roll));

            const opacity = getPlaneOpacity(page);
            planeRef.current.visible = opacity > 0.01;
            if (planeRef.current.visible) {
                planeRef.current.traverse((obj) => {
                    if (obj.isMesh && obj.material) {
                        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                        mats.forEach((m) => {
                            m.transparent = true;
                            m.opacity = opacity;
                        });
                    }
                });
            }
        }

        // ===== CAMERA — only while ScrollRig owns it (Ceremony takes over at CAMERA_HANDOFF_PAGE) =====
        if (page < CAMERA_HANDOFF_PAGE) {
            // ===== CAMERA — always enforce fixed position while ScrollRig owns it =====
            // Must re-assert every frame (NOT just once) — otherwise scrolling
            // BACKWARD from Ceremony's orbit leaves the camera wherever Ceremony
            // last placed it, instead of resetting here. That was the bug.
            state.camera.position.set(...CAMERA_FIXED_POSITION);

            // ===== CAMERA — gaze angle tilts from 120° -> 60° (in place, rotation only) =====
            const tiltT = ease(
                THREE.MathUtils.clamp(
                    (page - CAMERA_TILT_START_PAGE) / (CAMERA_TILT_END_PAGE - CAMERA_TILT_START_PAGE),
                    0,
                    1
                )
            );
            const targetAngleDeg = THREE.MathUtils.lerp(CAMERA_ANGLE_START, CAMERA_ANGLE_END, tiltT);
            smoothedAngleDeg.current = THREE.MathUtils.damp(
                smoothedAngleDeg.current,
                targetAngleDeg,
                CAMERA_TILT_DAMPING,
                delta
            );

            // Convert the 90°-is-level angle into an actual elevation in radians.
            const elevationRad = THREE.MathUtils.degToRad(smoothedAngleDeg.current - 90);
            const gazeDir = new THREE.Vector3(0, Math.sin(elevationRad), -Math.cos(elevationRad));
            const lookTarget = new THREE.Vector3(
                state.camera.position.x + gazeDir.x * CAMERA_LOOK_DISTANCE,
                state.camera.position.y + gazeDir.y * CAMERA_LOOK_DISTANCE,
                state.camera.position.z + gazeDir.z * CAMERA_LOOK_DISTANCE
            );
            state.camera.lookAt(lookTarget);
        }
    });

    return (
        <>

            <group ref={planeRef}>
                <Aeroplane />
            </group>



            <VerticalPillar />
            <Ceremony />
        </>
    );
}