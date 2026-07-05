import { useRef } from "react";
import { Text } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

/*
Usage:
  <WeddingText
    font="/fonts/Inter-Medium.ttf"
    scriptFont="/fonts/GreatVibes-Regular.ttf"
    overline="TOGETHER WITH THEIR FAMILIES"
    groom="Rama"
    bride="Janaki"
    date="12TH DECEMBER 2026"
    location="HYDERABAD, INDIA"
    position={[0, 3, -1]}
  />

REVEAL BEHAVIOR — three stages, position is NEVER touched, only opacity:

  Stage 1 (TEXT_FADE_IN_START -> TEXT_FADE_IN_END):
    Cinematic reveal — text fades in from fully invisible to fully visible,
    sitting exactly where `position` places it. No movement, no scale, no
    drift — just a clean opacity ramp, like a title card resolving into
    focus.

  Stage 2 (TEXT_FADE_IN_END -> COUPLE_CENTERED_PAGE):
    Fully visible, completely static. This is the window where the couple
    is still rising up/moving toward the center of the page — text holds
    steady the whole time they're still arriving.

  Stage 3 (COUPLE_CENTERED_PAGE -> TEXT_FADE_OUT_END):
    Once the couple has actually REACHED the center of the page (i.e. their
    rise/arrival animation is done and they're settled front-and-center),
    the text fades OUT — same clean opacity ramp, reverse direction. This
    clears the text now that the couple themselves are the focal point.

  COUPLE_CENTERED_PAGE is the one number that ties this file to the actual
  Couple component's timing — set it to whatever page the couple's own
  arrival animation finishes on, so the text doesn't start fading until
  the couple is genuinely centered, not partway through rising.

  All of this is driven by scroll page, read independently via useScroll(),
  so this component stays fully self-contained — no props needed from
  ScrollRig or the Couple component.
*/

// --- COLOR SCHEME ---------------------------------------------------
const INK_COLOR = "#000000";
const ACCENT_COLOR = "#8b1e3f";

const OVERLINE_SIZE = 0.16;
const OVERLINE_LETTER_SPACING = 0.25;
const OVERLINE_GAP_BELOW = 0.45;

const NAME_SIZE = 0.7;
const AMPERSAND_SIZE = 0.9;
const NAME_ROW_GAP_BELOW = 0.55;
const STACKED_NAME_LINE_GAP = 0.5;

const DATE_SIZE = 0.18;
const DATE_LETTER_SPACING = 0.15;
const DATE_TO_LOCATION_GAP = 0.28;

const LOCATION_SIZE = 0.14;
const LOCATION_LETTER_SPACING = 0.15;

const MAX_WIDTH = 5;
const AMPERSAND_GAP = 0.5;

const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_SCALE = 0.7;
const MOBILE_MAX_WIDTH = 3.2;

// ===== Three-stage reveal timing (in "pages" — match TOTAL_PAGES elsewhere) =====
const TOTAL_PAGES = 20; // must match TOTAL_PAGES in ScrollRig.jsx / VerticalPillar.jsx

// Stage 1 — cinematic fade IN (matches the pillar's own reveal window, so
// the text resolves into view around the same time the pillar/scene settles)
const TEXT_FADE_IN_START = 7.5;   // was 4.5 — now starts right as PILLAR_FULLY_VISIBLE is reached
const TEXT_FADE_IN_END = 9;

// Stage 3 — fade OUT trigger: the page at which the couple has actually
// ARRIVED AT CENTER (not just started moving — fully settled front and
// center of the page). Update this to match the real Couple component's
// arrival page once that animation exists.
const COUPLE_CENTERED_PAGE = 12;   // was 10 — give more room after text fully fades in at 9
const TEXT_FADE_OUT_END = 13.5;  // how long the fade-out itself takes, after that point

const TEXT_REVEAL_DAMPING = 3; // slow, deliberate — matches the pillar's feel

function ease(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

// Returns 0->1->0 across the three stages: fades in, holds, fades out
// once the couple reaches center.
function getTextOpacity(page) {
    if (page <= TEXT_FADE_IN_START) return 0;
    if (page < TEXT_FADE_IN_END) {
        return ease((page - TEXT_FADE_IN_START) / (TEXT_FADE_IN_END - TEXT_FADE_IN_START));
    }
    if (page < COUPLE_CENTERED_PAGE) return 1; // fully visible, holding while couple arrives
    if (page < TEXT_FADE_OUT_END) {
        const t = ease((page - COUPLE_CENTERED_PAGE) / (TEXT_FADE_OUT_END - COUPLE_CENTERED_PAGE));
        return 1 - t;
    }
    return 0;
}

export default function WeddingNames({
    font,
    scriptFont,
    overline,
    groom,
    bride,
    date,
    location,
    position = [0, 0, 0],
    color = INK_COLOR,
    accentColor = ACCENT_COLOR,
}) {
    const canvasWidth = useThree((state) => state.size.width);
    const isMobile = canvasWidth < MOBILE_BREAKPOINT_PX;
    const scale = isMobile ? MOBILE_SCALE : 1;
    const maxWidth = isMobile ? MOBILE_MAX_WIDTH : MAX_WIDTH;

    const ampersandFont = scriptFont || font;

    const overlineSize = OVERLINE_SIZE * scale;
    const nameSize = NAME_SIZE * scale;
    const ampersandSize = AMPERSAND_SIZE * scale;
    const dateSize = DATE_SIZE * scale;
    const locationSize = LOCATION_SIZE * scale;

    const groomX = -(AMPERSAND_GAP + 0.6) * scale;
    const brideX = (AMPERSAND_GAP + 0.6) * scale;

    let y = 0;
    const overlineY = y;
    y -= OVERLINE_GAP_BELOW * scale;

    const nameRowY = y;
    y -= isMobile ? STACKED_NAME_LINE_GAP * scale * 3 : NAME_ROW_GAP_BELOW * scale;

    const dateY = y;
    y -= DATE_TO_LOCATION_GAP * scale;

    const locationY = y;

    // ===== Cinematic fade in/out — position is set ONCE via the group's
    // `position` prop below and is NEVER touched again. Only opacity animates. =====
    const scroll = useScroll();
    const groupRef = useRef();
    const smoothedPage = useRef(0);

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;
        smoothedPage.current = THREE.MathUtils.damp(
            smoothedPage.current,
            rawPage,
            TEXT_REVEAL_DAMPING,
            delta
        );

        const opacity = getTextOpacity(smoothedPage.current);

        if (groupRef.current) {
            groupRef.current.visible = opacity > 0.01;
            groupRef.current.traverse((obj) => {
                if (obj.fillOpacity !== undefined) obj.fillOpacity = opacity;
            });
        }
    });

    return (
        // position is fixed here and never animated — only fillOpacity (set via
        // traverse above) changes, so this is a pure fade, zero movement.
        <group ref={groupRef} position={position}>
            {overline && (
                <Text
                    font={font}
                    fontSize={overlineSize}
                    letterSpacing={OVERLINE_LETTER_SPACING}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={maxWidth}
                    position={[0, overlineY, 0]}
                >
                    {overline}
                </Text>
            )}

            {isMobile ? (
                <>
                    <Text
                        font={font}
                        fontSize={nameSize}
                        color={color}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[0, nameRowY, 0]}
                    >
                        {groom}
                    </Text>
                    <Text
                        font={ampersandFont}
                        fontSize={ampersandSize}
                        color={accentColor}
                        anchorX="center"
                        anchorY="middle"
                        position={[0, nameRowY - STACKED_NAME_LINE_GAP * scale, 0]}
                    >
                        &
                    </Text>
                    <Text
                        font={font}
                        fontSize={nameSize}
                        color={color}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[0, nameRowY - STACKED_NAME_LINE_GAP * scale * 2, 0]}
                    >
                        {bride}
                    </Text>
                </>
            ) : (
                <>
                    <Text
                        font={font}
                        fontSize={nameSize}
                        color={color}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[groomX, nameRowY, 0]}
                    >
                        {groom}
                    </Text>
                    <Text
                        font={ampersandFont}
                        fontSize={ampersandSize}
                        color={accentColor}
                        anchorX="center"
                        anchorY="middle"
                        position={[0, nameRowY, 0]}
                    >
                        &
                    </Text>
                    <Text
                        font={font}
                        fontSize={nameSize}
                        color={color}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[brideX, nameRowY, 0]}
                    >
                        {bride}
                    </Text>
                </>
            )}

            {date && (
                <Text
                    font={font}
                    fontSize={dateSize}
                    letterSpacing={DATE_LETTER_SPACING}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={maxWidth}
                    position={[0, dateY, 0]}
                >
                    {date}
                </Text>
            )}

            {location && (
                <Text
                    font={font}
                    fontSize={locationSize}
                    letterSpacing={LOCATION_LETTER_SPACING}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={maxWidth}
                    position={[0, locationY, 0]}
                >
                    {location}
                </Text>
            )}
        </group>
    );
}