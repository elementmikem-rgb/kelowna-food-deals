import type { SVGProps } from "react";

// Small stroke icon set for the admin inbox (24px grid, currentColor). Own drawings, no third-party
// assets, so there is nothing to license or load.
function Icon({ children, ...p }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const InboxIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 13l3-8h12l3 8" />
    <path d="M3 13v6h18v-6h-5a4 4 0 01-8 0H3z" />
  </Icon>
);
export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12L20 4l-6 16-3-7-7-1z" />
  </Icon>
);
export const ArchiveIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11h14V8" />
    <path d="M10 12h4" />
  </Icon>
);
export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
);
export const MailIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Icon>
);
export const MailOpenIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 10l9-6 9 6v9H3z" />
    <path d="M3 10l9 6 9-6" />
  </Icon>
);
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </Icon>
);
export const ClockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const PencilIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20l4-1 11-11-3-3L5 16z" />
    <path d="M14 6l3 3" />
  </Icon>
);
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Icon>
);
export const RefreshIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 5v5h-5" />
    <path d="M4 19v-5h5" />
    <path d="M18.5 10A7 7 0 006 7.5M5.5 14A7 7 0 0018 16.5" />
  </Icon>
);
export const PaperclipIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 11l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L9.5 16.5a1.7 1.7 0 01-2.4-2.4L14 7.3" />
  </Icon>
);
export const ArrowLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Icon>
);
export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
export const ChevronRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ChevronDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const ReplyIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h9a7 7 0 017 7" />
  </Icon>
);
export const ForwardIcon = (p: P) => (
  <Icon {...p}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12h-9a7 7 0 00-7 7" />
  </Icon>
);
export const TranslateIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 5h9" />
    <path d="M8.5 3v2" />
    <path d="M6 5c.5 3 2.5 5.5 5.5 7" />
    <path d="M11 5c-.5 3-2.5 5.5-6 7.5" />
    <path d="M12 20l4-9 4 9" />
    <path d="M13.5 17h5" />
  </Icon>
);
export const BlockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M6 6l12 12" />
  </Icon>
);
export const KeyboardIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const MoreIcon = (p: P) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="19" r="1.7" />
  </Icon>
);
