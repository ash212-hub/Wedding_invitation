import { forwardRef } from "react";
import CeremonyCardBase from "./CeremonyCardBase";

// Swap this path for your actual Baarat PNG once it's ready.
const BAARAT_IMAGE = "/ceremony-cards/baarat.png";

const BaaratCard = forwardRef(function BaaratCard(props, ref) {
    return <CeremonyCardBase ref={ref} imageUrl={BAARAT_IMAGE} {...props} />;
});

export default BaaratCard;