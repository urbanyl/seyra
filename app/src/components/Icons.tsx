type P = { size?: number; className?: string; strokeWidth?: number };

const base = (size = 22) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconChat = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M20.5 11.6c0 4.2-3.8 7.6-8.5 7.6-1 0-2-.15-2.9-.43L4 21l1.2-4.1A7.2 7.2 0 0 1 3.5 11.6C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6Z" />
    <path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01" strokeWidth="2.4" />
  </svg>
);

export const IconPhone = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M6.2 3.6h2.3l1.4 3.6-1.8 1.4a11.4 11.4 0 0 0 5.3 5.3l1.4-1.8 3.6 1.4v2.3a2.6 2.6 0 0 1-2.9 2.6C9.5 17.7 6.3 14.5 3.6 6.5a2.6 2.6 0 0 1 2.6-2.9Z" />
  </svg>
);

export const IconVideo = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3" y="6" width="12.5" height="12" rx="3.2" />
    <path d="M15.5 11.2 20.4 8v8l-4.9-3.2" />
  </svg>
);

export const IconGrid = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" />
  </svg>
);

export const IconGear = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
);

export const IconSearch = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.2 4.2" />
  </svg>
);

export const IconPlus = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);

export const IconSend = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="none" className={className}>
    <path d="M4.3 11.2 19.1 4.2c.9-.4 1.8.5 1.4 1.4l-7 14.8c-.4.9-1.7.8-2-.2l-1.6-5.2-5.2-1.6c-1-.3-1.1-1.6-.2-2Z" fill="currentColor" />
  </svg>
);

export const IconMic = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </svg>
);

export const IconMicOff = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M15 10V6a3 3 0 0 0-5.6-1.5M9 9v2a3 3 0 0 0 4.6 2.6" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 9.9 5.6M12 18v3M4 3l16 18" />
  </svg>
);

export const IconHeadset = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="3" y="13" width="3.6" height="6" rx="1.7" />
    <rect x="17.4" y="13" width="3.6" height="6" rx="1.7" />
    <path d="M19.2 19v.7a2.3 2.3 0 0 1-2.3 2.3h-2.4" />
  </svg>
);

export const IconPhoneOff = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M6.2 3.6h2.3l1.4 3.6-1.8 1.4a11.4 11.4 0 0 0 5.3 5.3l1.4-1.8 3.6 1.4v2.3a2.6 2.6 0 0 1-2.9 2.6C9.5 17.7 6.3 14.5 3.6 6.5a2.6 2.6 0 0 1 2.6-2.9Z" />
    <path d="M3 20 21 3" />
  </svg>
);

export const IconMore = ({ size, className }: P) => (
  <svg width={size || 22} height={size || 22} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="5.4" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="18.6" r="1.7" />
  </svg>
);

export const IconLock = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="4.6" y="10" width="14.8" height="10.4" rx="3" />
    <path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10" />
  </svg>
);

export const IconHash = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M9.2 4 7.6 20M16.4 4l-1.6 16M4.5 9h15M3.8 15h15" />
  </svg>
);

export const IconVolume = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M11.5 4.8 7 8.6H3.8v6.8H7l4.5 3.8V4.8Z" />
    <path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8" />
  </svg>
);

export const IconUsers = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="9" cy="8.4" r="3.3" />
    <path d="M3.2 19.4a5.9 5.9 0 0 1 11.6 0" />
    <path d="M16.2 5.5a3.3 3.3 0 0 1 0 6.2M17.4 19.4a5.6 5.6 0 0 0-1.1-3.4" />
  </svg>
);

export const IconX = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconLogout = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M14.5 5.5V4.8a2.3 2.3 0 0 0-2.3-2.3H5.8A2.3 2.3 0 0 0 3.5 4.8v14.4a2.3 2.3 0 0 0 2.3 2.3h6.4a2.3 2.3 0 0 0 2.3-2.3v-.7" />
    <path d="M10 12h10.5m-3.5-3.6L20.6 12l-3.6 3.6" />
  </svg>
);

export const IconSmile = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.5 14.2a4.3 4.3 0 0 0 7 0" />
    <path d="M9.2 9.6h.01M14.8 9.6h.01" strokeWidth="2.4" />
  </svg>
);

export const IconBack = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M14.5 5 7.5 12l7 7" />
  </svg>
);

export const IconShield = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M12 3 5 5.8v5.4c0 4.3 2.9 8.1 7 9.3 4.1-1.2 7-5 7-9.3V5.8L12 3Z" />
    <path d="m9 12 2.1 2.1L15.2 10" />
  </svg>
);

export const IconCopy = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.6" />
    <path d="M15.5 5.4V4.8A2.3 2.3 0 0 0 13.2 2.5H5.8A2.3 2.3 0 0 0 3.5 4.8v7.4a2.3 2.3 0 0 0 2.3 2.3h.6" />
  </svg>
);

export const SeyraMark = ({ size = 30, className }: { size?: number; className?: string }) => (
  <img
    src="/logo.png"
    width={size}
    height={size}
    className={`seyra-mark ${className || ''}`}
    alt="Seyra"
    draggable={false}
  />
);
