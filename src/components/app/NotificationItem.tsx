import { CreditCard, HandCoins, PackageX, Sparkles, Users, type LucideIcon } from 'lucide-react';
import type { NotificationKind } from '../../data/dashboard';

export const notificationStyle: Record<NotificationKind, { icon: LucideIcon; label: string; className: string }> = {
  stock: { icon: PackageX, label: 'Stock', className: 'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300' },
  deposit: {
    icon: HandCoins,
    label: 'Versements',
    className: 'bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300',
  },
  billing: {
    icon: CreditCard,
    label: 'Abonnement',
    className: 'bg-navy-50 text-navy-700 dark:bg-white/5 dark:text-navy-100',
  },
  team: {
    icon: Users,
    label: 'Équipe',
    className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  },
  system: {
    icon: Sparkles,
    label: 'Nouveautés',
    className: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
  },
};
