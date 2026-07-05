import { forwardRef } from "react";
import CeremonyCardBase from "./CeremonyCardBase";

// Swap this path for your actual Thank You PNG once it's ready.
const THANK_YOU_IMAGE = "/ceremony-cards/thankyou.png";

const ThankYouCard = forwardRef(function ThankYouCard(props, ref) {
    return <CeremonyCardBase ref={ref} imageUrl={THANK_YOU_IMAGE} {...props} />;
});

export default ThankYouCard;