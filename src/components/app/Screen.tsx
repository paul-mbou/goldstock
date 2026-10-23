import { LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';
import { ROLES, type ScreenId } from '../../data/dashboard';
import { useSession } from '../../lib/demo';

/** Renders the page only when the simulated role may open it. */
export function Screen({ id, children }: { id: ScreenId; children: ReactNode }) {
  const { can, roleId } = useSession();
  if (can(id)) return children;
  return (
    <div className="app-card mx-auto mt-6 max-w-lg px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sunken text-ink-mute">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-lg font-bold text-ink">Accès réservé</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-mute">
        Le rôle {ROLES[roleId].label} ne donne pas accès à cette page. Demandez au propriétaire de la boutique si vous
        en avez besoin.
      </p>
      <a href="/app" className="btn-gold mt-6 h-11 px-5">
        Revenir au tableau de bord
      </a>
    </div>
  );
}
