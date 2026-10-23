import { CircleCheck, ClipboardCheck, Flag, HandCoins, Scale, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import {
  formatFcfa,
  formatFullDate,
  formatShortDate,
  formatTime,
  type Deposit,
  type DepositStatus,
} from '../../data/dashboard';
import { logActivity, setDemo, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import { Badge, EmptyState, Modal, PageHeader, Segmented, StatCard, StatusBadge, textareaClass, useToasts } from './ui';

type Filter = 'all' | DepositStatus;

function Gap({ value }: { value: number }) {
  if (value === 0) return <span className="text-ink-mute">—</span>;
  return (
    <span
      className={`font-bold whitespace-nowrap tabular-nums ${value < 0 ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}
    >
      {value < 0 ? '−' : '+'}
      {formatFcfa(Math.abs(value))}
    </span>
  );
}

export default function DepositsPage() {
  return (
    <Screen id="deposits">
      <Deposits />
    </Screen>
  );
}

const replaceDeposit = (deposit: Deposit) =>
  setDemo((demo) => ({
    ...demo,
    deposits: demo.deposits.map((item) => (item.id === deposit.id ? deposit : item)),
  }));

function Deposits() {
  const { demo, roleId, member } = useSession();
  const canReview = roleId === 'owner';
  const list = canReview ? demo.deposits : demo.deposits.filter((deposit) => deposit.manager === member.name);
  const [filter, setFilter] = useState<Filter>(canReview ? 'pending' : 'all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const reviewing = list.find((deposit) => deposit.id === reviewingId) ?? null;
  const setReviewing = (deposit: Deposit | null) => setReviewingId(deposit?.id ?? null);
  const { notify, region } = useToasts();

  const expected = list.reduce((sum, deposit) => sum + deposit.expected, 0);
  const deposited = list.reduce((sum, deposit) => sum + deposit.deposited, 0);
  const pending = list.filter((deposit) => deposit.status === 'pending');
  const visible = filter === 'all' ? list : list.filter((deposit) => deposit.status === filter);
  const countBy = (status: DepositStatus) => list.filter((deposit) => deposit.status === status).length;

  const decide = (deposit: Deposit, status: DepositStatus, note: string) => {
    replaceDeposit({ ...deposit, status, note: note || deposit.note });
    logActivity(
      member.name,
      `a ${status === 'verified' ? 'validé' : 'signalé un écart sur'} le versement de ${deposit.shop}`,
      'deposit',
    );
    setReviewing(null);
    notify(
      status === 'verified'
        ? `Versement de ${deposit.manager} validé.`
        : `Écart signalé à ${deposit.manager}. Il sera visible dans son historique.`,
      {
        action: {
          label: 'Annuler',
          run: () => replaceDeposit(deposit),
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={canReview ? 'Versements des gérants' : 'Mes versements'}
        description={
          canReview
            ? 'Rapprochez chaque soir l’argent remis par vos gérants des ventes en espèces de leur boutique.'
            : 'L’argent remis chaque soir pour les ventes en espèces de votre boutique, et sa vérification.'
        }
      />

      <section aria-label="Résumé des 10 derniers jours" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Ventes en espèces" value={formatFcfa(expected)} icon={HandCoins}>
          <p className="text-sm text-ink-mute">10 derniers jours</p>
        </StatCard>
        <StatCard label="Montant versé" value={formatFcfa(deposited)} icon={CircleCheck} tone="gold">
          <p className="text-sm text-ink-mute">
            {(expected ? (deposited / expected) * 100 : 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            &nbsp;% des ventes
          </p>
        </StatCard>
        <StatCard label="Écart cumulé" value={<Gap value={deposited - expected} />} icon={Scale} tone="danger">
          <p className="text-sm text-ink-mute">
            {list.filter((deposit) => deposit.deposited !== deposit.expected).length} versements concernés
          </p>
        </StatCard>
        <StatCard label="À vérifier" value={pending.length} icon={ClipboardCheck} tone="warning">
          <p className="text-sm text-ink-mute">{pending.length ? 'Versements d’hier soir' : 'Tout est à jour'}</p>
        </StatCard>
      </section>

      <section aria-label="Versements" className="app-card overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5">
          <Segmented
            selectOnMobile
            label="Statut"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'pending', label: 'À vérifier', count: countBy('pending') },
              { id: 'flagged', label: 'Écarts signalés', count: countBy('flagged') },
              { id: 'verified', label: 'Validés', count: countBy('verified') },
              { id: 'all', label: 'Tous', count: list.length },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Rien à vérifier">
            Tous les versements ont été contrôlés. Les prochains arriveront ce soir après la fermeture.
          </EmptyState>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden gap-4 bg-sunken/60 px-5 py-3 text-xs font-semibold text-ink-mute lg:grid lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,0.8fr))_12rem]"
            >
              <span>Boutique et gérant</span>
              <span>Ventes en espèces</span>
              <span>Versé</span>
              <span>Écart</span>
              <span className="text-right">Statut</span>
            </div>
            <ul className="divide-y divide-line">
              {visible.map((deposit) => {
                const gap = deposit.deposited - deposit.expected;
                return (
                  <li
                    key={deposit.id}
                    className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,0.8fr))_12rem] lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          gap < 0
                            ? 'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300'
                            : 'bg-sunken text-ink-soft'
                        }`}
                      >
                        {gap < 0 ? (
                          <TriangleAlert className="size-5" aria-hidden="true" />
                        ) : (
                          <HandCoins className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {deposit.shop} <span className="font-normal text-ink-mute">· {deposit.manager}</span>
                        </p>
                        <p className="text-sm text-ink-mute">
                          {formatShortDate(deposit.day)} · versé à {formatTime(deposit.depositedAt)} · {deposit.method}
                        </p>
                      </div>
                    </div>
                    <dl className="col-span-full grid grid-cols-3 gap-3 text-sm lg:contents">
                      <div>
                        <dt className="text-xs text-ink-mute lg:sr-only">Ventes en espèces</dt>
                        <dd className="font-semibold text-ink tabular-nums">{formatFcfa(deposit.expected)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-mute lg:sr-only">Versé</dt>
                        <dd className="font-semibold text-ink tabular-nums">{formatFcfa(deposit.deposited)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-mute lg:sr-only">Écart</dt>
                        <dd>
                          <Gap value={gap} />
                        </dd>
                      </div>
                    </dl>
                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      <StatusBadge kind="deposit" status={deposit.status} />
                      {deposit.status === 'pending' && canReview ? (
                        <button
                          type="button"
                          className="btn-gold h-9 px-4 text-sm"
                          onClick={() => setReviewing(deposit)}
                        >
                          Vérifier
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-quiet h-9 px-4 text-sm"
                          onClick={() => setReviewing(deposit)}
                        >
                          Détail
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <ReviewDialog deposit={reviewing} canReview={canReview} onClose={() => setReviewing(null)} onDecide={decide} />
      {region}
    </div>
  );
}

function ReviewDialog({
  deposit,
  canReview,
  onClose,
  onDecide,
}: {
  deposit: Deposit | null;
  canReview: boolean;
  onClose: () => void;
  onDecide: (deposit: Deposit, status: DepositStatus, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const gap = deposit ? deposit.deposited - deposit.expected : 0;
  const editable = canReview && deposit?.status === 'pending';

  return (
    <Modal
      open={deposit !== null}
      onClose={() => {
        onClose();
        setNote('');
      }}
      title={deposit ? `Versement ${deposit.shop}` : 'Versement'}
      description={deposit ? `${formatFullDate(deposit.day)} · ${deposit.manager}` : undefined}
      footer={
        deposit &&
        editable && (
          <>
            <button
              type="button"
              className="btn mr-auto h-11 px-4 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
              onClick={() => {
                onDecide(deposit, 'flagged', note);
                setNote('');
              }}
            >
              <Flag className="size-4" aria-hidden="true" />
              Signaler l’écart
            </button>
            <button
              type="button"
              className="btn-gold h-11 px-5"
              onClick={() => {
                onDecide(deposit, 'verified', note);
                setNote('');
              }}
            >
              {gap === 0 ? 'Valider le versement' : 'Valider malgré l’écart'}
            </button>
          </>
        )
      }
    >
      {deposit && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-line">
            {[
              ['Ventes en espèces du jour', formatFcfa(deposit.expected)],
              [`Remis par ${deposit.manager.split(' ')[0]} (${deposit.method})`, formatFcfa(deposit.deposited)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-sm"
              >
                <span className="text-ink-soft">{label}</span>
                <span className="font-semibold text-ink tabular-nums">{value}</span>
              </div>
            ))}
            <div
              className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
                gap < 0 ? 'bg-red-50 dark:bg-red-400/10' : 'bg-emerald-50 dark:bg-emerald-400/10'
              }`}
            >
              <span className="font-bold text-ink">Écart</span>
              {gap === 0 ? <Badge tone="success">Conforme</Badge> : <Gap value={gap} />}
            </div>
          </div>

          {gap !== 0 && editable && (
            <p className="text-sm leading-relaxed text-ink-soft">
              Il manque <strong className="text-ink">{formatFcfa(Math.abs(gap))}</strong>. Demandez une explication à{' '}
              {deposit.manager.split(' ')[0]} avant de valider, ou signalez l’écart pour le garder dans son historique.
            </p>
          )}

          {editable ? (
            <div>
              <label htmlFor="deposit-note" className="mb-2 block text-sm font-semibold text-ink">
                Note (facultatif)
              </label>
              <textarea
                id="deposit-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex. Monnaie rendue en trop, retenue sur la paie."
                className={textareaClass}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-sunken p-4 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge kind="deposit" status={deposit.status} />
              </div>
              {deposit.note && <p className="mt-3 leading-relaxed text-ink-soft">{deposit.note}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
