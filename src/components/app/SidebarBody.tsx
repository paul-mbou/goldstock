import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { setSidebarCollapsed, useSidebarCollapsed } from '../../lib/sidebar';
import { Logo, LogoMark } from '../brand/Logo';
import { AppNav } from './AppNav';
import { ShopCard } from './ShopCard';

export default function SidebarBody({ current }: { current: string }) {
  const collapsed = useSidebarCollapsed();
  const toggleLabel = collapsed ? 'Agrandir le menu' : 'Réduire le menu';

  return (
    <>
      <div className="relative flex items-center justify-between gap-2 rail:flex-col rail:gap-4">
        <a href="/app" className="px-2 text-white rail:px-0" aria-label="GOLDSTOCK, tableau de bord">
          <Logo className="rail:hidden" />
          <LogoMark className="hidden size-8 rail:block" />
        </a>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-white/50 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-gold-400"
        >
          <PanelLeftClose className="size-[1.125rem] rail:hidden" aria-hidden="true" />
          <PanelLeftOpen className="hidden size-[1.125rem] rail:block" aria-hidden="true" />
        </button>
      </div>
      <div className="relative mt-6">
        <ShopCard collapsible />
      </div>
      <div className="relative mt-6 flex-1">
        <AppNav current={current} collapsible />
      </div>
    </>
  );
}
