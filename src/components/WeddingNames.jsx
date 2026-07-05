import { useRef } from "react";
import { Text, Float } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";
import GradientText from "./GradientText";

/*
Usage:
  <WeddingNames
    font="/Inter_28pt-Bold.ttf"
    scriptFont="/Inter_28pt-Bold.ttf"
    overline="TOGETHER WITH THEIR FAMILIES"
    groom="Rama"
    bride="Janaki"
    date="12TH DECEMBER 2026"
    location="HYDERABAD, INDIA"
    position={[0, 0, 0]}
  />

Scroll-driven visibility: fully visible below FADE_START page, eases out
across [FADE_START, FADE_PAGE], fully invisible/hidden at FADE_PAGE (8) and
beyond. Responsive layout (mobile stacking + scaling) is preserved.
*/

// --- COLOR SCHEME ---------------------------------------------------
const INK_COLOR = "#000000";
const ACCENT_COLOR = "#E07A7A";

const OVERLINE_SIZE = 0.19;
const OVERLINE_LETTER_SPACING = 0.55;
const OVERLINE_GAP_BELOW = 0.75;

const NAME_SIZE = 0.82;
const AMPERSAND_SIZE = 1.05;
const NAME_ROW_GAP_BELOW = 0.55;
const STACKED_NAME_LINE_GAP = 0.58;

const DATE_SIZE = 0.21;
const DATE_LETTER_SPACING = 0.15;
const DATE_TO_LOCATION_GAP = 0.28;

const LOCATION_SIZE = 0.16;
const LOCATION_LETTER_SPACING = 0.15;

const MAX_WIDTH = 5;
const AMPERSAND_GAP = 0.9;

// Three responsive tiers instead of one mobile/desktop split.
// Small phones (<480px) get a bigger relative scale than tablets —
// narrow viewports otherwise leave text looking undersized and cramped,
// since a flat 0.7 scale hits a 375px phone just as hard as a 767px tablet.
const TABLET_BREAKPOINT_PX = 768;
const SMALL_PHONE_BREAKPOINT_PX = 480;

const TABLET_SCALE = 0.88;
const SMALL_PHONE_SCALE = 1.0;

const TABLET_MAX_WIDTH = 3.8;
const SMALL_PHONE_MAX_WIDTH = 3.1;

// --- Scroll-driven fade-out ------------------------------------------
const TOTAL_PAGES = 20; // must match TOTAL_PAGES in ScrollRig.jsx / Ceremony.jsx
const FADE_PAGE = 8; // fully invisible / hidden at this page
const FADE_WINDOW = 1.5; // pages before FADE_PAGE over which it eases out
const FADE_START = FADE_PAGE - FADE_WINDOW; // fully visible up to this page
const FADE_DAMPING = 3; // smooth, not snappy — matches feel used elsewhere

function ease(t) {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

function getFadeOpacity(page) {
    if (page <= FADE_START) return 1;
    if (page >= FADE_PAGE) return 0;
    return ease(1 - (page - FADE_START) / (FADE_PAGE - FADE_START));
}

function getResponsiveConfig(canvasWidth) {
    if (canvasWidth < SMALL_PHONE_BREAKPOINT_PX) {
        return { scale: SMALL_PHONE_SCALE, maxWidth: SMALL_PHONE_MAX_WIDTH, isMobile: true };
    }
    if (canvasWidth < TABLET_BREAKPOINT_PX) {
        return { scale: TABLET_SCALE, maxWidth: TABLET_MAX_WIDTH, isMobile: true };
    }
    return { scale: 1, maxWidth: MAX_WIDTH, isMobile: false };
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
    gradientTop = "#000000",
    gradientBottom = "#2563eb",
}) {
    const canvasWidth = useThree((state) => state.size.width);
    const { scale, maxWidth, isMobile } = getResponsiveConfig(canvasWidth);

    const groupRef = useRef();
    const scroll = useScroll();
    const opacityRef = useRef(1);

    useFrame((state, delta) => {
        const rawPage = scroll.offset * TOTAL_PAGES;
        const targetOpacity = getFadeOpacity(rawPage);
        opacityRef.current = THREE.MathUtils.damp(
            opacityRef.current,
            targetOpacity,
            FADE_DAMPING,
            delta
        );

        if (groupRef.current) {
            const opacity = opacityRef.current;
            groupRef.current.visible = opacity > 0.01;
            groupRef.current.traverse((obj) => {
                // Text / GradientText (troika-three-text under the hood) use
                // fillOpacity; regular meshes use material.opacity. Set both
                // defensively so this works regardless of internal impl.
                if (typeof obj.fillOpacity === "number" || obj.isText) {
                    obj.fillOpacity = opacity;
                    obj.material && (obj.material.transparent = true);
                }
                if (obj.isMesh && obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach((m) => {
                        m.transparent = true;
                        m.opacity = opacity;
                    });
                }
            });
        }
    });

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

    return (
        <group ref={groupRef} position={position}>
            <Float
                speed={1.2}
                rotationIntensity={0.08}
                floatIntensity={0.6}
                floatingRange={[-0.06, 0.06]}
            >
                {overline && (
                    <GradientText
                        font={font}
                        fontSize={overlineSize}
                        letterSpacing={OVERLINE_LETTER_SPACING}
                        colorTop={gradientTop}
                        colorBottom={gradientBottom}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[0, overlineY, 0]}
                        textAlign="center"
                    >
                        {overline}
                    </GradientText>
                )}

                {isMobile ? (
                    <>
                        <GradientText
                            font={font}
                            fontSize={nameSize}
                            colorTop={gradientTop}
                            colorBottom={gradientBottom}
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={maxWidth}
                            position={[0, nameRowY, 0]}
                        >
                            {groom}
                        </GradientText>
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
                        <GradientText
                            font={font}
                            fontSize={nameSize}
                            colorTop={gradientTop}
                            colorBottom={gradientBottom}
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={maxWidth}
                            position={[0, nameRowY - STACKED_NAME_LINE_GAP * scale * 2, 0]}
                        >
                            {bride}
                        </GradientText>
                    </>
                ) : (
                    <>
                        <GradientText
                            font={font}
                            fontSize={nameSize}
                            colorTop={gradientTop}
                            colorBottom={gradientBottom}
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={maxWidth}
                            position={[groomX, nameRowY, 0]}
                        >
                            {groom}
                        </GradientText>
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
                        <GradientText
                            font={font}
                            fontSize={nameSize}
                            colorTop={gradientTop}
                            colorBottom={gradientBottom}
                            anchorX="center"
                            anchorY="middle"
                            maxWidth={maxWidth}
                            position={[brideX, nameRowY, 0]}
                        >
                            {bride}
                        </GradientText>
                    </>
                )}

                {date && (
                    <GradientText
                        font={font}
                        fontSize={dateSize}
                        letterSpacing={DATE_LETTER_SPACING}
                        colorTop={gradientTop}
                        colorBottom={gradientBottom}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[0, dateY, 0]}
                    >
                        {date}
                    </GradientText>
                )}

                {location && (
                    <GradientText
                        font={font}
                        fontSize={locationSize}
                        letterSpacing={LOCATION_LETTER_SPACING}
                        colorTop={gradientTop}
                        colorBottom={gradientBottom}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={maxWidth}
                        position={[0, locationY, 0]}
                    >
                        {location}
                    </GradientText>
                )}
            </Float>
        </group>
    );
}