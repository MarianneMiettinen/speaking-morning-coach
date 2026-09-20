export type IconName = 'home' | 'trophy' | 'coach' | 'settings' | 'back' | 'script' | 'close' | 'sun';

const PATHS: Record<IconName, React.ReactNode> = {
  // Simple, hand-drawn-adjacent line shapes so they sit with the illustrated
  // coaches rather than looking like a corporate toolbar.
  home: <path d="M4 11.5 12 4.5l8 7M6.5 10v9h11v-9M10 19v-5h4v5" />,
  trophy: (
    <>
      <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0v-5Z" />
      <path d="M7.5 6H5a2.5 2.5 0 0 0 2.5 2.5M16.5 6H19a2.5 2.5 0 0 1-2.5 2.5" />
      <path d="M12 14v3.5M9 19.5h6" />
    </>
  ),
  coach: (
    <>
      <path d="M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l1.7-1.3-1.8-3.1-2 .8a7 7 0 0 0-2-1.2l-.3-2.1h-3.6l-.3 2.1a7 7 0 0 0-2 1.2l-2-.8-1.8 3.1 1.7 1.3a7 7 0 0 0 0 2.4l-1.7 1.3 1.8 3.1 2-.8a7 7 0 0 0 2 1.2l.3 2.1h3.6l.3-2.1a7 7 0 0 0 2-1.2l2 .8 1.8-3.1-1.7-1.3c.06-.4.1-.8.1-1.2Z" />
    </>
  ),
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  script: (
    <>
      <path d="M6.5 4.5h11v15h-11z" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sun: (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
