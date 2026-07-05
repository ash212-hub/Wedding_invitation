import { forwardRef } from "react";
import CeremonyCardBase from "./CeremonyCardBase";

// Swap this path for your actual Mehndi PNG once it's ready.
const MEHNDI_IMAGE = "/ceremony-cards/mehndi.png";

const MehndiCard = forwardRef(function MehndiCard(props, ref) {
    return <CeremonyCardBase ref={ref} imageUrl={MEHNDI_IMAGE} {...props} />;
});

export default MehndiCard;