import React from 'react';

/*
  Attend+ Icon Set
  ------------------------------------------------------------------
  A small set of hand-drawn, stroke-based "linear" icons (Feather /
  Lucide style) used throughout the app instead of emoji. Every icon
  accepts the standard `size` and `className` / `style` props so it
  behaves like any other inline element and can be colored with
  `currentColor` via CSS.
*/

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Icon = ({ size = 20, children, className = '', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`icon ${className}`}
    {...base}
    {...rest}
  >
    {children}
  </svg>
);

export const IconHome = (p) => (
  <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Icon>
);

export const IconBell = (p) => (
  <Icon {...p}><path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>
);

export const IconBellOff = (p) => (
  <Icon {...p}><path d="M4 4l16 16" /><path d="M6.7 6.7C6.25 7.4 6 8.15 6 9c0 4.5-1.5 6-1.5 6h11" /><path d="M18 15h1.5S18 13.5 18 9a6 6 0 0 0-3.4-5.4" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>
);

export const IconQr = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" />
    <rect x="3" y="14" width="7" height="7" rx="1.2" />
    <path d="M14 14h3v3h-3z" /><path d="M20 14v.01" /><path d="M14 20v.01" /><path d="M20 20v.01" /><path d="M17 17v.01" />
  </Icon>
);

export const IconCamera = (p) => (
  <Icon {...p}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="12.5" r="3.4" /></Icon>
);

export const IconCalendar = (p) => (
  <Icon {...p}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Icon>
);

export const IconChart = (p) => (
  <Icon {...p}><path d="M4 20V10" /><path d="M11 20V4" /><path d="M18 20v-7" /><path d="M3 20h18" /></Icon>
);

export const IconSettings = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .35 1.9l.05.05a2.06 2.06 0 1 1-2.9 2.9l-.05-.05a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1 1.55V19.6a2.06 2.06 0 1 1-4.13 0v-.08a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.9.35l-.05.05a2.06 2.06 0 1 1-2.9-2.9l.05-.05a1.7 1.7 0 0 0 .35-1.9 1.7 1.7 0 0 0-1.55-1H4.4a2.06 2.06 0 1 1 0-4.13h.08a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.35-1.9l-.05-.05a2.06 2.06 0 1 1 2.9-2.9l.05.05a1.7 1.7 0 0 0 1.9.35H10.5a1.7 1.7 0 0 0 1-1.55V4.4a2.06 2.06 0 1 1 4.13 0v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.9-.35l.05-.05a2.06 2.06 0 1 1 2.9 2.9l-.05.05a1.7 1.7 0 0 0-.35 1.9v.1a1.7 1.7 0 0 0 1.55 1h.08a2.06 2.06 0 1 1 0 4.13h-.08a1.7 1.7 0 0 0-1.55 1Z" /></Icon>
);

export const IconUser = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>
);

export const IconLogout = (p) => (
  <Icon {...p}><path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>
);

export const IconCheck = (p) => (
  <Icon {...p}><path d="M4 12.5 9 17.5 20 6.5" /></Icon>
);

export const IconCheckCircle = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.2 12.3 11 15l4.8-5.6" /></Icon>
);

export const IconAlertCircle = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v5" /><path d="M12 16v.01" /></Icon>
);

export const IconClock = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>
);

export const IconUsers = (p) => (
  <Icon {...p}><circle cx="9" cy="8" r="3" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.2 3.2 0 0 1 0 6.4" /><path d="M18.5 13.3a6.2 6.2 0 0 1 3 5.7" /></Icon>
);

export const IconSend = (p) => (
  <Icon {...p}><path d="M4 11 20 4l-6.5 16-3-7Z" /><path d="M13.5 13 20 4" /></Icon>
);

export const IconPlay = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M10 8.5 15.5 12 10 15.5Z" /></Icon>
);

export const IconStop = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><rect x="9" y="9" width="6" height="6" rx="1" /></Icon>
);

export const IconClose = (p) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);

export const IconEye = (p) => (
  <Icon {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></Icon>
);

export const IconEyeOff = (p) => (
  <Icon {...p}><path d="M4 4l16 16" /><path d="M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3 3.7M6.5 7.5A15 15 0 0 0 2.5 12S6 18.5 12 18.5a10 10 0 0 0 3.4-.6" /><path d="M9.9 10a2.7 2.7 0 0 0 3.9 3.9" /></Icon>
);

export const IconRefresh = (p) => (
  <Icon {...p}><path d="M4 12a8 8 0 0 1 14-5.2L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5.2L4 15" /><path d="M4 20v-5h5" /></Icon>
);

export const IconArrowLeft = (p) => (
  <Icon {...p}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></Icon>
);

export const IconArrowRight = (p) => (
  <Icon {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Icon>
);

export const IconMoon = (p) => (
  <Icon {...p}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" /></Icon>
);

export const IconSun = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
);

export const IconShield = (p) => (
  <Icon {...p}><path d="M12 3l7 3v5.5c0 4.5-3 7.7-7 9.5-4-1.8-7-5-7-9.5V6Z" /><path d="M9 12l2 2 4-4.2" /></Icon>
);

export const IconMail = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6.5 8 6 8-6" /></Icon>
);

export const IconIdCard = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M6 16c.5-1.5 1.7-2.3 2.5-2.3S11 14.5 11 16" /><path d="M14 9.5h5M14 13h5M14 16h3" /></Icon>
);

export const IconBuilding = (p) => (
  <Icon {...p}><rect x="4" y="3" width="10" height="18" rx="1" /><path d="M14 8h6v13h-6" /><path d="M7 7h1M7 11h1M7 15h1M11 7h1M11 11h1M11 15h1" /></Icon>
);

export const IconLayers = (p) => (
  <Icon {...p}><path d="M12 3.5 21 8l-9 4.5L3 8Z" /><path d="M3 12l9 4.5 9-4.5" /><path d="M3 16l9 4.5 9-4.5" /></Icon>
);

export const IconTrendingUp = (p) => (
  <Icon {...p}><path d="M3 17 9.5 10.5 14 15l7-9" /><path d="M17 6h4v4" /></Icon>
);

export const IconChevronRight = (p) => (
  <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>
);

export const IconLock = (p) => (
  <Icon {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></Icon>
);

export const IconTrash = (p) => (
  <Icon {...p}><path d="M4.5 6.5h15" /><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" /><path d="M6.5 6.5 7.2 19a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-12.5" /></Icon>
);

export const IconPhone = (p) => (
  <Icon {...p}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></Icon>
);

export const IconDownload = (p) => (
  <Icon {...p}><path d="M12 3v12" /><path d="m7 10.5 5 4.5 5-4.5" /><path d="M5 19.5h14" /></Icon>
);

export const IconGlobe = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.2 2.3 3.4 5.2 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.2-3.4-8.5S9.8 5.8 12 3.5Z" /></Icon>
);

export default {
  IconHome, IconBell, IconBellOff, IconQr, IconCamera, IconCalendar, IconChart,
  IconSettings, IconUser, IconLogout, IconCheck, IconCheckCircle, IconAlertCircle,
  IconClock, IconUsers, IconSend, IconPlay, IconStop, IconClose, IconEye, IconEyeOff,
  IconRefresh, IconArrowLeft, IconArrowRight, IconMoon, IconSun, IconShield, IconMail,
  IconIdCard, IconBuilding, IconLayers, IconTrendingUp, IconChevronRight, IconLock,
  IconTrash, IconPhone, IconDownload, IconGlobe,
};
