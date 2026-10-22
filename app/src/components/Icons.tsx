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

export const IconChevron = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M5 9l7 7 7-7" />
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

export const IconHome = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4 10.6 12 4l8 6.6" />
    <path d="M6 9.6V20h12V9.6" />
    <path d="M10 20v-5.4h4V20" />
  </svg>
);

export const IconScreenShare = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3" y="4.5" width="18" height="12.5" rx="2.4" />
    <path d="M8.5 20.5h7M12 17v3.5" />
    <path d="M9 11.5 12 8l3 3.5M12 8v6.2" />
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

export const IconPencil = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

export const IconCamera = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3" y="7" width="13" height="10" rx="2.4" />
    <path d="M16 10.5 21 8v8l-5-2.5" />
  </svg>
);

export const IconCheck = ({ size, className, strokeWidth = 2 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

export const IconThread = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4 5h16v11H9l-5 4V5Z" />
  </svg>
);

export const IconPin = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M9 3.5h6l-1 5.5 3 3v1.5H7V12l3-3-1-5.5Z" />
    <path d="M12 13.5V21" />
  </svg>
);

export const IconReply = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M9.5 6.5 4.5 11.5l5 5" />
    <path d="M4.5 11.5h8.7a6.3 6.3 0 0 1 6.3 6.3v1.7" />
  </svg>
);

export const IconTrash = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4.5 6.5h15" />
    <path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
    <path d="M6.7 6.5l.8 12.2a1.9 1.9 0 0 0 1.9 1.8h5.2a1.9 1.9 0 0 0 1.9-1.8l.8-12.2" />
    <path d="M10.2 10.3v5.4M13.8 10.3v5.4" />
  </svg>
);

export const IconTimer = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="13.6" r="7.4" />
    <path d="M12 10.2v3.6l2.3 1.5" />
    <path d="M9.6 2.8h4.8" />
  </svg>
);

export const IconPlay = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.2 5.5a1 1 0 0 1 1.5-.87l9 6.5a1 1 0 0 1 0 1.74l-9 6.5a1 1 0 0 1-1.5-.87Z" />
  </svg>
);

export const IconPause = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6.6" y="5" width="3.9" height="14" rx="1.4" />
    <rect x="13.5" y="5" width="3.9" height="14" rx="1.4" />
  </svg>
);

export const IconPaperclip = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M20 11.5 12.2 19.3a4.6 4.6 0 0 1-6.5-6.5l8.2-8.2a3.1 3.1 0 0 1 4.4 4.4l-8.2 8.2a1.6 1.6 0 0 1-2.2-2.2l7.6-7.6" />
  </svg>
);

export const IconFile = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M13.5 3.5H7a2.3 2.3 0 0 0-2.3 2.3v12.4A2.3 2.3 0 0 0 7 20.5h10a2.3 2.3 0 0 0 2.3-2.3V9.3l-5.8-5.8Z" />
    <path d="M13.5 3.5v5.8h5.8" />
  </svg>
);

export const IconImage = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 4.6-4.6 3.2 3.2 3-3L20 17.2" />
  </svg>
);

export const IconVideoFile = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <rect x="2.8" y="6" width="13" height="12" rx="2.6" />
    <path d="M15.8 11.2 21.2 8v8l-5.4-3.2" />
  </svg>
);

export const IconDownload = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const IconMaximize = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const IconMinimize = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);

export const IconEyeOff = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.4.8-1.2 2-2.4 3.2M6.6 6.7C4.3 8.2 2.9 10.3 2.5 12c1 1.8 4.5 6 9.5 6 1.6 0 3-.4 4.2-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconArrowDown = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
    <path d="M12 5v14M6 13l6 6 6-6" />
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
