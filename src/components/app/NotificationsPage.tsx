import { BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatAgo, type NotificationKind } from '../../data/dashboard';
import { markNotificationsRead, useSession, visibleNotifications } from '../../lib/demo';
import { notificationStyle } from './NotificationItem';
import { Screen } from './Screen';
import { EmptyState, PageHeader, Segmented } from './ui';

export default function NotificationsPage() {
  return (
    <Screen id="notifications">
      <Notifications />
    </Screen>
  );
}

type Filter = 'all' | 'unread' | NotificationKind;

function Notifications() {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>('all');
  const list = visibleNotifications(session);
  const unread = list.filter((item) => !item.read);
  const kinds = [...new Set(list.map((item) => item.kind))];
  const visible = list
    .filter((item) => (filter === 'all' ? true : filter === 'unread' ? !item.read : item.kind === filter))
    .sort((a, b) => b.at - a.at);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unread.length ? `${unread.length} non lue${unread.length > 1 ? 's' : ''}` : 'Vous êtes à jour.'}
        actions={
          unread.length > 0 && (
            <button
              type="button"
              className="btn-quiet h-11 px-4"
              onClick={() => void markNotificationsRead(unread.map((item) => item.id))}
            >
              <CheckCheck className="size-[1.125rem]" aria-hidden="true" />
              Tout marquer comme lu
            </button>
          )
        }
      />

      <section className="app-card overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5">
          <Segmented
            selectOnMobile
            label="Filtrer"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'Toutes', count: list.length },
              { id: 'unread', label: 'Non lues', count: unread.length },
              ...kinds.map((kind) => ({ id: kind, label: notificationStyle[kind].label })),
            ]}
          />
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={BellOff} title="Aucune notification">
            Rien de nouveau dans cette rubrique.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((item) => {
              const style = notificationStyle[item.kind];
              const Icon = style.icon;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={() => void markNotificationsRead([item.id])}
                    className={`flex items-start gap-4 px-4 py-4 transition hover:bg-sunken/60 sm:px-5 ${item.read ? '' : 'bg-gold-50/40 dark:bg-gold-400/[0.04]'}`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.className}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-ink ${item.read ? 'font-medium' : 'font-bold'}`}>
                        {item.title}
                        {!item.read && <span className="sr-only"> (non lue)</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-mute">{item.body}</p>
                      <p className="mt-1 text-xs text-ink-mute">
                        {style.label} · {formatAgo(item.at)}
                      </p>
                    </div>
                    {!item.read && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                    )}
                    <ChevronRight className="mt-2 size-4 shrink-0 text-ink-mute" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
