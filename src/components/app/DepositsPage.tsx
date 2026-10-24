import { CircleCheck, ClipboardCheck, Flag, HandCoins, Plus, Scale, TriangleAlert } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import {
  DAY,
  PAYMENTS,
  TODAY_START,
  cashSalesTotal,
  formatFcfa,
  formatFullDate,
  formatLongDay,
  formatShortDate,
  formatTime,
  payLabel,
  type Deposit,
  type DepositStatus,
  type PayId,
} from '../../data/dashboard';
import { declareDeposit, logActivity, setDemo, undeclaredDays, useSession, withdrawDeposit } from '../../lib/demo';
import { Screen } from './Screen';
import {
  Badge,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  Segmented,
  SelectBox,
  StatCard,
  StatusBadge,
  inputClass,
  textareaClass,
  useToasts,
} from './ui';

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
  const canDeclare = roleId === 'manager';
  const ownShops = member.shop === 'Toutes' ? demo.shops.map((shop) => shop.name) : [member.shop];
  const owner = demo.team.find((item) => item.role === 'owner');
  const list = canReview ? demo.deposits : demo.deposits.filter((deposit) => deposit.manager === member.name);
  const [filter, setFilter] = useState<Filter>(canReview ? 'pending' : 'all');
  const [declaring, setDeclaring] = useState(false);
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

  const declared = (deposit: Deposit) => {
    setDeclaring(false);
    setFilter('all');
    notify(
      `Versement de ${formatFcfa(deposit.deposited)} déclaré.${owner ? ` ${owner.name.split(' ')[0]} va le vérifier.` : ''}`,
      { action: { label: 'Annuler', run: () => withdrawDeposit(deposit.id) } },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={canReview ? 'Versements des gérants' : 'Mes versements'}
        description={
          canReview
            ? 'Rapprochez chaque soir l’argent remis par vos gérants des ventes en espèces de leur boutique.'
            : 'Déclarez chaque soir l’argent remis au propriétaire pour les ventes en espèces, puis suivez sa vérification.'
        }
        actions={
          canDeclare && (
            <button type="button" className="btn-gold h-11 px-4" onClick={() => setDeclaring(true)}>
              <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
              Déclarer un versement
            </button>
          )
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
          <p className="text-sm text-ink-mute">
            {!pending.length ? 'Tout est à jour' : canReview ? 'Versements à contrôler' : 'En attente du propriétaire'}
          </p>
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

        {list.length === 0 ? (
          <EmptyState icon={HandCoins} title="Aucun versement pour l’instant">
            {canReview
              ? 'Chaque soir, vos gérants déclarent ici l’argent remis. Vous comparez avec les ventes en espèces, puis vous validez ou signalez l’écart. Invitez un gérant depuis la page Équipe pour commencer.'
              : 'Après la fermeture, touchez « Déclarer un versement » et indiquez le montant remis au propriétaire.'}
          </EmptyState>
        ) : visible.length === 0 ? (
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
      {canDeclare && (
        <DeclareDialog open={declaring} shops={ownShops} onClose={() => setDeclaring(false)} onDeclared={declared} />
      )}
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
              [
                `Remis par ${deposit.manager.split(' ')[0]} (${deposit.method}${deposit.reference ? ` · Réf. ${deposit.reference}` : ''})`,
                formatFcfa(deposit.deposited),
              ],
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

          {deposit.comment && (
            <div className="rounded-2xl border border-line p-4 text-sm">
              <p className="font-semibold text-ink">Explication de {deposit.manager.split(' ')[0]}</p>
              <p className="mt-1 leading-relaxed text-ink-soft">{deposit.comment}</p>
            </div>
          )}

          {gap !== 0 && editable && (
            <p className="text-sm leading-relaxed text-ink-soft">
              {gap < 0 ? 'Il manque' : 'Il y a'} <strong className="text-ink">{formatFcfa(Math.abs(gap))}</strong>
              {gap > 0 && ' de plus que les ventes'}. Demandez une explication à {deposit.manager.split(' ')[0]} avant
              de valider, ou signalez l’écart pour le garder dans son historique.
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

function dayOption(day: number) {
  if (day === TODAY_START) return 'Aujourd’hui';
  if (day === TODAY_START - DAY) return 'Hier';
  return formatLongDay(day);
}

type DeclareErrors = Partial<Record<'amount' | 'reference' | 'comment', string>>;

function DeclareDialog({
  open,
  shops,
  onClose,
  onDeclared,
}: {
  open: boolean;
  shops: string[];
  onClose: () => void;
  onDeclared: (deposit: Deposit) => void;
}) {
  const { demo, member } = useSession();
  const [shop, setShop] = useState(shops[0]);
  const days = undeclaredDays(demo, shop);
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const day = pickedDay !== null && days.includes(pickedDay) ? pickedDay : days[0];
  const [amount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState<PayId>('cash');
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<DeclareErrors>({});

  const expected = day === undefined ? 0 : cashSalesTotal(demo.sales, shop, day);
  const cashSales =
    day === undefined
      ? 0
      : demo.sales.filter(
          (sale) =>
            sale.shop === shop && sale.pay === 'cash' && !sale.cancelled && sale.at >= day && sale.at < day + DAY,
        ).length;
  /* Pre-filled with the exact amount until the manager types another one. */
  const amountValue = amount ?? String(expected);
  const deposited = Number(amountValue) || 0;
  const gap = deposited - expected;

  const close = () => {
    setPickedDay(null);
    setAmount(null);
    setMethod('cash');
    setReference('');
    setComment('');
    setErrors({});
    onClose();
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (day === undefined) return;
    const found: DeclareErrors = {};
    if (deposited <= 0 && expected > 0) found.amount = 'Indiquez le montant remis.';
    if (method !== 'cash' && reference.trim().length < 4)
      found.reference = 'Saisissez le numéro de la transaction pour que le propriétaire la retrouve.';
    if (gap !== 0 && comment.trim().length < 5) found.comment = 'Expliquez l’écart en quelques mots.';
    setErrors(found);
    const first = (['amount', 'reference', 'comment'] as const).find((key) => found[key]);
    if (first) return document.getElementById(`declare-${first}`)?.focus();
    const created = declareDeposit(
      {
        shop,
        day,
        deposited,
        method: payLabel(method),
        reference: method === 'cash' ? '' : reference,
        comment,
      },
      member.name,
    );
    close();
    onDeclared(created);
  };

  const invalid = (key: keyof DeclareErrors) => ({
    'aria-invalid': Boolean(errors[key]) || undefined,
    'aria-describedby': errors[key] ? `declare-${key}-error` : undefined,
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Déclarer un versement"
      description="Le propriétaire est prévenu et vérifie le montant."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={close}>
            Annuler
          </button>
          <button type="submit" form="declare-deposit" className="btn-gold h-11 px-5" disabled={day === undefined}>
            Déclarer {formatFcfa(deposited)}
          </button>
        </>
      }
    >
      <form id="declare-deposit" noValidate onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <FormField id="declare-shop" label="Boutique">
          {shops.length === 1 ? (
            <input id="declare-shop" className={inputClass()} value={shop} readOnly />
          ) : (
            <SelectBox
              id="declare-shop"
              value={shop}
              onChange={(event) => {
                setShop(event.target.value);
                setAmount(null);
              }}
            >
              {shops.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </SelectBox>
          )}
        </FormField>
        <FormField id="declare-day" label="Ventes du">
          {day === undefined ? (
            <input id="declare-day" className={inputClass()} value="Tout est déjà déclaré" readOnly />
          ) : (
            <SelectBox
              id="declare-day"
              value={day}
              onChange={(event) => {
                setPickedDay(Number(event.target.value));
                setAmount(null);
              }}
            >
              {days.map((item) => (
                <option key={item} value={item}>
                  {dayOption(item)}
                </option>
              ))}
            </SelectBox>
          )}
        </FormField>

        <div className="overflow-hidden rounded-2xl border border-line sm:col-span-2">
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-sm">
            <span className="text-ink-soft">
              Ventes en espèces{day === TODAY_START ? ' jusqu’à maintenant' : ''} ({cashSales} vente
              {cashSales > 1 ? 's' : ''})
            </span>
            <span className="font-semibold text-ink tabular-nums">{formatFcfa(expected)}</span>
          </div>
          <div
            aria-live="polite"
            className={`flex items-center justify-between gap-4 px-4 py-3 ${
              gap < 0 ? 'bg-red-50 dark:bg-red-400/10' : gap > 0 ? 'bg-gold-50 dark:bg-gold-400/10' : 'bg-sunken/60'
            }`}
          >
            <span className="font-bold text-ink">Écart</span>
            {gap === 0 ? <Badge tone="success">Conforme</Badge> : <Gap value={gap} />}
          </div>
        </div>

        <FormField id="declare-amount" label="Montant remis (FCFA)" error={errors.amount}>
          <input
            id="declare-amount"
            inputMode="numeric"
            className={inputClass(Boolean(errors.amount))}
            value={amountValue}
            onChange={(event) => {
              setAmount(event.target.value.replace(/[^\d]/g, ''));
              setErrors({ ...errors, amount: undefined });
            }}
            {...invalid('amount')}
          />
        </FormField>
        <FormField id="declare-method" label="Remis par">
          <SelectBox
            id="declare-method"
            value={method}
            onChange={(event) => {
              setMethod(event.target.value as PayId);
              setErrors({ ...errors, reference: undefined });
            }}
          >
            {PAYMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.short}
              </option>
            ))}
          </SelectBox>
        </FormField>
        {method !== 'cash' && (
          <FormField
            id="declare-reference"
            label="N° de transaction"
            error={errors.reference}
            hint="Il figure dans le SMS de confirmation."
            className="sm:col-span-2"
          >
            <input
              id="declare-reference"
              className={inputClass(Boolean(errors.reference))}
              placeholder={method === 'transfer' ? 'Ex. VIR-2026-10-23-0042' : 'Ex. MP261023.1845.C12345'}
              autoComplete="off"
              maxLength={40}
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setErrors({ ...errors, reference: undefined });
              }}
              {...invalid('reference')}
            />
          </FormField>
        )}
        <FormField
          id="declare-comment"
          label={gap === 0 ? 'Commentaire (facultatif)' : 'Explication de l’écart'}
          error={errors.comment}
          hint={gap === 0 ? undefined : 'Monnaie rendue en trop, dépense payée avec la caisse…'}
          className="sm:col-span-2"
        >
          <textarea
            id="declare-comment"
            rows={2}
            maxLength={200}
            className={textareaClass}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setErrors({ ...errors, comment: undefined });
            }}
            {...invalid('comment')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
