import IconCircleButton from "./IconCircleButton";

interface DLogoButtonProps {
  onClick: () => void;
  active?: boolean;
  pulse?: boolean;
}

/**
 * Renders the "d." brand mark in a small circular button.
 * Used to re-open the d. narration panel after it auto-collapses.
 */
const DLogoButton = ({ onClick, active, pulse }: DLogoButtonProps) => (
  <IconCircleButton
    onClick={onClick}
    active={active}
    pulse={pulse}
    title="Replay d.'s message"
    ariaLabel="Open AI facilitator message"
  >
    <span
      className="font-display leading-none text-[14px]"
      style={{ fontFamily: "'Instrument Serif', serif" }}
    >
      d.
    </span>
  </IconCircleButton>
);

export default DLogoButton;
