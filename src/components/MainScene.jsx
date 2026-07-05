// import { Canvas } from "@react-three/fiber";
// import { Sky, ScrollControls } from "@react-three/drei";
// import { ScrollRig } from "./ScrollRig";
// import { Clouds } from "./Clouds";

// export default function MainScene() {
//     return (
//         <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
//             <ambientLight intensity={0.6} />
//             <directionalLight position={[5, 10, 5]} intensity={1.2} />
//             <Sky />

//             {/* pages must match TOTAL_PAGES in ScrollRig.jsx */}
//             <ScrollControls pages={20} damping={0.2}>
//                 <ScrollRig />
//             </ScrollControls>

//             <Clouds />
//         </Canvas>
//     );
// }



import { Canvas } from "@react-three/fiber";
import { Sky, ScrollControls, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ScrollRig } from "./ScrollRig";
import { Clouds } from "./Clouds";
import WeddingNames from "./WeddingNames";
const TOTAL_PAGES = 20; // must match ScrollControls pages + ScrollRig's TOTAL_PAGES

// Just logs the current page number to the console as you scroll — nothing else.
function PageLogger() {
    const scroll = useScroll();
    const lastLogged = useRef(-1);

    // useFrame(() => {
    //     const page = Math.round(scroll.offset * TOTAL_PAGES * 10) / 10; // 1 decimal place
    //     if (page !== lastLogged.current) {
    //         lastLogged.current = page;
    //         console.log("page:", page);
    //     }
    // });

    return null;
}

export default function MainScene() {
    return (
        <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1.2} />
            <Sky />

            {/* pages must match TOTAL_PAGES in ScrollRig.jsx */}
            <ScrollControls pages={20} damping={0.2}>
                <ScrollRig />
                <PageLogger />

                <WeddingNames
                    font="/Inter_28pt-Bold.ttf"
                    scriptFont="/Inter_28pt-Bold.ttf"
                    overline="TOGETHER WITH THEIR FAMILIES"
                    groom="Rama"
                    bride="Janaki"
                    date="12TH DECEMBER 2026"
                    location="HYDERABAD, INDIA"
                    position={[0, 1, 0]}   // was [0, 3, 2] — Y changed from 3 to 9
                />
            </ScrollControls>



            <Clouds />
        </Canvas>
    );
}