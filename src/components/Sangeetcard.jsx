import { forwardRef } from "react";
import CeremonyCardBase from "./CeremonyCardBase";

// Swap this path for your actual Sangeet PNG once it's ready.
const SANGEET_IMAGE = "/ceremony-cards/sangeet.png";

const SangeetCard = forwardRef(function SangeetCard(props, ref) {
    return <CeremonyCardBase ref={ref} imageUrl={SANGEET_IMAGE} {...props} />;
});

export default SangeetCard;