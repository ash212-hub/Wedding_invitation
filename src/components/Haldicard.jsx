import { forwardRef } from "react";
import CeremonyCardBase from "./CeremonyCardBase";

// Swap this path for your actual Haldi PNG once it's ready.
const HALDI_IMAGE = "/ceremony-cards/haldi.png";

const HaldiCard = forwardRef(function HaldiCard(props, ref) {
    return <CeremonyCardBase ref={ref} imageUrl={HALDI_IMAGE} {...props} />;
});

export default HaldiCard;