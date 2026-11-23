const PATHS = {
  right: (
    <>
      <path d="M4.5 12h14" />
      <path d="m12.5 6.5 6 5.5-6 5.5" />
    </>
  ),
  left: (
    <>
      <path d="M19.5 12h-14" />
      <path d="m11.5 6.5-6 5.5 6 5.5" />
    </>
  ),
  "up-right": (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
};

export default function ArrowIcon({ direction = "right", className = "" }) {
  return (
    <svg
      className={`da-arrow-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-direction={direction}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[direction] || PATHS.right}
    </svg>
  );
}
