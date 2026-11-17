import type { FlowStepKind } from '../../video/scenes/chaosToSystem.ts';
import type { NoticeIcon } from '../../video/scenes/product.ts';

// Stroke icons drawn for this project (24px grid, round joins). Original artwork.
type IconProps = { size: number; color?: string; strokeWidth?: number };

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size, color = 'currentColor', strokeWidth = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const UserPlusIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="3.8" />
    <path d="M2.5 20.5c0-3.9 3.1-6.8 7-6.8s7 2.9 7 6.8" />
    <path d="M19 7.5v6M16 10.5h6" />
  </Svg>
);

export const MailIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M3.8 7l8.2 6 8.2-6" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3.2 2" />
  </Svg>
);

export const ReturnIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.4 4.4L19 7.4" />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const ChatIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
  </Svg>
);

/** "Done for you": a four-point spark (the system acted). */
export const SparkIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z" />
    <path d="M18.5 15.5c.25 1.6 1 2.35 2.5 2.5-1.5.25-2.25 1-2.5 2.5-.25-1.5-1-2.25-2.5-2.5 1.5-.15 2.25-.9 2.5-2.5z" />
  </Svg>
);

export const DocIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h5" />
  </Svg>
);

export const NOTICE_ICON: Record<NoticeIcon, React.FC<IconProps>> = {
  mail: MailIcon,
  calendar: CalendarIcon,
  chat: ChatIcon,
  spark: SparkIcon,
  check: CheckIcon,
  doc: DocIcon,
};

export const STEP_ICON: Record<FlowStepKind, React.FC<IconProps>> = {
  trigger: UserPlusIcon,
  email: MailIcon,
  wait: ClockIcon,
  goal: ReturnIcon,
};
