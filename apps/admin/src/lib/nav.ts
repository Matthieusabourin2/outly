import {
  BarChart3,
  Bot,
  CalendarDays,
  CalendarRange,
  FileDown,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Settings,
  Store,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';

export type NavItem = { slug: string; title: string; icon: LucideIcon; slice: number; description: string };

/** SPEC §9 sidebar, in order. Slice 1 filters these by outly_staff role. */
export const NAV: NavItem[] = [
  { slug: '', title: 'Dashboard', icon: LayoutDashboard, slice: 8, description: 'Totals, trends and live activity, computed from real tables.' },
  { slug: 'venues', title: 'Venues', icon: Store, slice: 2, description: 'Venue list, partner pipeline, memberships, commissions, Stripe status.' },
  { slug: 'deals', title: 'Deals & Promotions', icon: Tag, slice: 3, description: 'Moderation queue and verification of public listings.' },
  { slug: 'events', title: 'Events', icon: CalendarDays, slice: 3, description: 'Events across all venues, moderation and scheduling.' },
  { slug: 'bookings', title: 'Bookings', icon: CalendarRange, slice: 4, description: 'Guest lists, table requests, check-ins and no-shows.' },
  { slug: 'users', title: 'Users', icon: Users, slice: 1, description: 'Search, profiles, bookings, reports, block and suspend.' },
  { slug: 'crm', title: 'CRM', icon: Megaphone, slice: 8, description: 'Segments and campaigns with two-person approval.' },
  { slug: 'payouts', title: 'Payouts & Transactions', icon: Wallet, slice: 7, description: 'Outly Pay transactions and Stripe payouts (test mode).' },
  { slug: 'reports', title: 'Reports & Exports', icon: FileDown, slice: 8, description: 'Role-gated CSV exports.' },
  { slug: 'ai-copilot', title: 'AI Copilot', icon: Bot, slice: 6, description: 'Analyse, segment and draft. A human always confirms.' },
  { slug: 'settings', title: 'Settings & Permissions', icon: Settings, slice: 8, description: 'Staff members, roles and the audit log.' },
];

export const DASHBOARD_ICON = BarChart3;
