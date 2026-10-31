import { Banknote, BanknoteArrowDown, ChartPie, Plus, SearchX, Trash2, TrendingUp } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import {
  DAY,
  EXPENSE_CATEGORIES,
  PAYMENTS,
  TODAY_START,
  expenseCategory,
  formatDayMonth,
  formatDayOfMonth,
  formatFcfa,
  formatFullDate,
  formatNumber,
  formatWhen,
  payLabel,
  type Expense,
  type ExpenseCategory,
  type PayId,
} from '../../data/dashboard';
import {
  between,
  deleteExpense,
  recordExpense,
  restoreExpense,
  summarize,
  useSession,
  visibleExpenses,
  visibleSales,
} from '../../lib/demo';
import { Screen } from './Screen';
import { normalize } from './Topbar';
import {
  BarList,
  Card,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  SelectBox,
  StatCard,
  inputClass,
  textareaClass,
  useToasts,
} from './ui';

export default function ExpensesPage() {
  return (
    <Screen id="expenses">
      <Expenses />
    </Screen>
  );
}

type Range = 'month' | '30d' | 'all';

const MONTH_START = TODAY_START - (Number(formatDayOfMonth(TODAY_START)) - 1) * DAY;
const rangeStart: Record<Range, number> = { month: MONTH_START, '30d': TODAY_START - 29 * DAY, all: 0 };
const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'Africa/Douala' }).format(TODAY_START);

const sum = (expenses: Expense[]) => expenses.reduce((total, expense) => total + expense.amount, 0);

function dayLabel(day: number) {
  if (day >= TODAY_START) return 'Aujourd’hui';
  if (day >= TODAY_START - DAY) return 'Hier';
  return formatDayMonth(day);
}

/** `<input type="date">` speaks YYYY-MM-DD; Cameroon stays on UTC+1 all year. */
const toInputDay = (ts: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Douala' }).format(ts);
const fromInputDay = (value: string) => Date.parse(`${value}T00:00:00+01:00`);

function Expenses() {
  const session = useSession();
  const { demo, roleId, member, role } = session;
  const ownShop = roleId === 'owner' || member.shop === 'Toutes' ? null : member.shop;
  const list = visibleExpenses(session);
  const [range, setRange] = useState<Range>('month');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const [shop, setShop] = useState('all');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { notify, region } = useToasts();

  const q = normalize(query.trim());
  const filtered = list.filter(
    (expense) =>
      expense.day >= rangeStart[range] &&
      (category === 'all' || expense.category === category) &&
      (shop === 'all' || expense.shop === shop) &&
      (!q || normalize(`${expense.id} ${expense.reason} ${expense.author} ${expense.note}`).includes(q)),
  );
  const opened = list.find((expense) => expense.id === openId) ?? null;

  const month = list.filter((expense) => expense.day >= MONTH_START);
  const monthTotal = sum(month);
  const byCategory = (expenses: Expense[]) =>
    EXPENSE_CATEGORIES.map((item) => ({
      ...item,
      value: sum(expenses.filter((expense) => expense.category === item.id)),
    }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  const top = byCategory(month)[0];
  const monthSales = visibleSales(session).filter((sale) => !ownShop || sale.shop === ownShop);
  const margin = summarize(between(monthSales, MONTH_START, Infinity)).margin;
  const cash = sum(month.filter((expense) => expense.pay === 'cash'));

  const remove = async (expense: Expense) => {
    const result = await deleteExpense(expense.id, member.name);
    if (!result.ok) return;
    setOpenId(null);
    notify(`Dépense « ${expense.reason} » supprimée.`, {
      action: {
        label: 'Annuler',
        run: () => {
          void restoreExpense(expense);
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description={
          ownShop
            ? `Les sorties d’argent de la boutique ${ownShop} : loyer, factures, transport…`
            : 'Notez chaque sortie d’argent pour connaître votre vrai bénéfice.'
        }
        actions={
          <button type="button" className="btn-gold h-11 px-4" onClick={() => setCreating(true)}>
            <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
            Nouvelle dépense
          </button>
        }
      />

      <section aria-label="Résumé du mois" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Dépenses du mois" value={formatFcfa(monthTotal)} icon={BanknoteArrowDown} tone="danger">
          <p className="text-sm text-ink-mute">
            {month.length} dépense{month.length > 1 ? 's' : ''} en {monthName}
          </p>
        </StatCard>
        <StatCard label="Plus gros poste" value={top ? formatFcfa(top.value) : '—'} icon={ChartPie}>
          <p className="text-sm text-ink-mute">
            {top ? `${top.label} · ${Math.round((top.value / monthTotal) * 100)} %` : 'Aucune dépense ce mois-ci'}
          </p>
        </StatCard>
        {role.margins && (
          <StatCard
            label="Bénéfice après dépenses"
            value={formatFcfa(margin - monthTotal)}
            icon={TrendingUp}
            tone="gold"
          >
            <p className="text-sm text-ink-mute">Marge brute de {formatFcfa(margin)}</p>
          </StatCard>
        )}
        <StatCard label="Payées en espèces" value={formatFcfa(cash)} icon={Banknote} tone="warning">
          <p className="text-sm text-ink-mute">Sorties d’argent liquide du mois</p>
        </StatCard>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Liste des dépenses" className="app-card overflow-hidden">
          <div className="space-y-3 border-b border-line p-4 sm:p-5">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
              <Segmented
                label="Période"
                value={range}
                onChange={setRange}
                options={[
                  { id: 'month', label: 'Ce mois-ci' },
                  { id: '30d', label: '30 jours' },
                  { id: 'all', label: 'Tout' },
                ]}
              />
              <SearchInput
                label="Rechercher une dépense"
                placeholder="Motif, personne ou note"
                value={query}
                onChange={setQuery}
                className="flex-1"
              />
            </div>
            <div className={`grid gap-3 ${ownShop ? '' : 'sm:grid-cols-2'}`}>
              <SelectBox
                aria-label="Catégorie"
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
              >
                <option value="all">Toutes les catégories</option>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </SelectBox>
              {!ownShop && (
                <SelectBox aria-label="Boutique" value={shop} onChange={(event) => setShop(event.target.value)}>
                  <option value="all">Toutes les boutiques</option>
                  {demo.shops.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </SelectBox>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={BanknoteArrowDown} title="Aucune dépense enregistrée">
              Loyer, facture ENEO, transport de marchandise : ajoutez votre première dépense avec le bouton « Nouvelle
              dépense ».
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState icon={SearchX} title="Aucune dépense ne correspond">
              Élargissez la période ou retirez un filtre.
            </EmptyState>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm lg:table">
                <thead className="bg-sunken/60 text-xs font-semibold text-ink-mute">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Motif
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Effectuée par
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Paiement
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((expense) => {
                    const meta = expenseCategory(expense.category);
                    return (
                      <tr
                        key={expense.id}
                        className="cursor-pointer transition hover:bg-sunken/60"
                        onClick={() => setOpenId(expense.id)}
                      >
                        <td className="max-w-80 px-5 py-3.5">
                          <button
                            type="button"
                            className="block max-w-full truncate text-left font-semibold text-ink hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenId(expense.id);
                            }}
                          >
                            {expense.reason}
                          </button>
                          <p className="flex items-center gap-1.5 truncate text-xs text-ink-mute">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: meta.color }}
                              aria-hidden="true"
                            />
                            {meta.label} · {dayLabel(expense.day)}
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-ink">{expense.author}</p>
                          <p className="text-xs text-ink-mute">{expense.shop}</p>
                        </td>
                        <td className="px-3 py-3.5 text-ink-soft">{payLabel(expense.pay)}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-ink tabular-nums">
                          −{formatFcfa(expense.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="divide-y divide-line lg:hidden">
                {filtered.map((expense) => (
                  <li key={expense.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(expense.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-sunken/60"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: expenseCategory(expense.category).color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{expense.reason}</p>
                        <p className="truncate text-sm text-ink-mute">
                          {dayLabel(expense.day)} · {expense.author}
                          {!ownShop && ` · ${expense.shop}`}
                        </p>
                      </div>
                      <span className="font-bold text-ink tabular-nums">−{formatFcfa(expense.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="border-t border-line px-5 py-4 text-sm text-ink-mute">
                {formatNumber(filtered.length)} dépense{filtered.length > 1 ? 's' : ''} ·{' '}
                <span className="font-bold text-ink">{formatFcfa(sum(filtered))}</span>
              </p>
            </>
          )}
        </section>

        <Card title="Par catégorie" description="Sur la période et les filtres choisis.">
          {filtered.length ? (
            <BarList
              rows={byCategory(filtered).map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
                color: item.color,
              }))}
              format={formatFcfa}
            />
          ) : (
            <p className="text-sm text-ink-mute">Rien à afficher.</p>
          )}
        </Card>
      </div>

      <ExpenseDialog
        open={creating}
        ownShop={ownShop}
        onClose={() => setCreating(false)}
        onCreated={(expense) => {
          setCreating(false);
          if (expense.day < rangeStart[range]) setRange('all');
          notify(`Dépense de ${formatFcfa(expense.amount)} enregistrée.`);
        }}
      />
      <ExpenseDetail
        expense={opened}
        canDelete={Boolean(opened) && (roleId === 'owner' || opened?.recordedBy === member.name)}
        onClose={() => setOpenId(null)}
        onDelete={remove}
      />
      {region}
    </div>
  );
}

type Errors = Partial<Record<'reason' | 'amount' | 'day', string>>;

function ExpenseDialog({
  open,
  ownShop,
  onClose,
  onCreated,
}: {
  open: boolean;
  ownShop: string | null;
  onClose: () => void;
  onCreated: (expense: Expense) => void;
}) {
  const { demo, member } = useSession();
  const today = toInputDay(TODAY_START);
  const blank = () => ({
    reason: '',
    amount: '',
    category: 'supplies' as ExpenseCategory,
    day: today,
    shop: ownShop ?? demo.shops[0].name,
    author: member.name,
    pay: 'cash' as PayId,
    note: '',
  });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});
  const people = demo.team.filter((item) => item.status !== 'suspended');
  const set =
    <K extends keyof ReturnType<typeof blank>>(key: K) =>
      (value: ReturnType<typeof blank>[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

  const close = () => {
    setForm(blank());
    setErrors({});
    onClose();
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount) || 0;
    const found: Errors = {};
    if (form.reason.trim().length < 3) found.reason = 'Dites en quelques mots à quoi a servi cet argent.';
    if (amount <= 0) found.amount = 'Indiquez le montant dépensé.';
    if (!form.day) found.day = 'Choisissez la date de la dépense.';
    else if (form.day > today) found.day = 'La date ne peut pas être dans le futur.';
    setErrors(found);
    const first = (['reason', 'amount', 'day'] as const).find((key) => found[key]);
    if (first) return document.getElementById(`expense-${first}`)?.focus();
    const created = await recordExpense(
      {
        reason: form.reason,
        amount,
        category: form.category,
        day: fromInputDay(form.day),
        shop: form.shop,
        author: form.author,
        pay: form.pay,
        note: form.note,
      },
      member.name,
    );
    if (!created) return;
    setForm(blank());
    onCreated(created);
  };

  const invalid = (key: keyof Errors) => ({
    'aria-invalid': Boolean(errors[key]) || undefined,
    'aria-describedby': errors[key] ? `expense-${key}-error` : undefined,
  });

  return (
    <Modal
      open={open}
      variant="sheet"
      onClose={close}
      title="Nouvelle dépense"
      description="Elle sera déduite de votre bénéfice du mois."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={close}>
            Annuler
          </button>
          <button type="submit" form="new-expense" className="btn-gold h-11 px-5">
            Enregistrer la dépense
          </button>
        </>
      }
    >
      <form id="new-expense" noValidate onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="expense-reason" label="Motif" error={errors.reason} className="sm:col-span-2">
          <input
            id="expense-reason"
            className={inputClass(Boolean(errors.reason))}
            placeholder="Ex. Facture ENEO d’octobre"
            autoComplete="off"
            maxLength={80}
            value={form.reason}
            onChange={(event) => set('reason')(event.target.value)}
            {...invalid('reason')}
          />
        </FormField>
        <FormField id="expense-amount" label="Montant (FCFA)" error={errors.amount}>
          <input
            id="expense-amount"
            inputMode="numeric"
            className={inputClass(Boolean(errors.amount))}
            placeholder="Ex. 25 000"
            value={form.amount}
            onChange={(event) => set('amount')(event.target.value.replace(/[^\d]/g, ''))}
            {...invalid('amount')}
          />
        </FormField>
        <FormField id="expense-day" label="Date" error={errors.day}>
          <input
            id="expense-day"
            type="date"
            max={today}
            className={inputClass(Boolean(errors.day))}
            value={form.day}
            onChange={(event) => set('day')(event.target.value)}
            {...invalid('day')}
          />
        </FormField>
        <FormField id="expense-category" label="Catégorie">
          <SelectBox
            id="expense-category"
            value={form.category}
            onChange={(event) => set('category')(event.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectBox>
        </FormField>
        <FormField id="expense-pay" label="Payée par">
          <SelectBox id="expense-pay" value={form.pay} onChange={(event) => set('pay')(event.target.value as PayId)}>
            {PAYMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.short}
              </option>
            ))}
          </SelectBox>
        </FormField>
        <FormField id="expense-author" label="Effectuée par" hint="La personne qui a sorti l’argent.">
          <SelectBox id="expense-author" value={form.author} onChange={(event) => set('author')(event.target.value)}>
            {people.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </SelectBox>
        </FormField>
        <FormField id="expense-shop" label="Boutique">
          {ownShop ? (
            <input id="expense-shop" className={inputClass()} value={ownShop} readOnly />
          ) : (
            <SelectBox id="expense-shop" value={form.shop} onChange={(event) => set('shop')(event.target.value)}>
              {demo.shops.map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
            </SelectBox>
          )}
        </FormField>
        <FormField
          id="expense-note"
          label="Note (facultatif)"
          hint="N° de facture, nom du fournisseur, raison d’un montant inhabituel…"
          className="sm:col-span-2"
        >
          <textarea
            id="expense-note"
            rows={2}
            maxLength={200}
            className={textareaClass}
            value={form.note}
            onChange={(event) => set('note')(event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}

function ExpenseDetail({
  expense,
  canDelete,
  onClose,
  onDelete,
}: {
  expense: Expense | null;
  canDelete: boolean;
  onClose: () => void;
  onDelete: (expense: Expense) => void;
}) {
  if (!expense) return null;
  const meta = expenseCategory(expense.category);
  return (
    <Modal
      open
      onClose={onClose}
      title={expense.reason}
      description={`${expense.id} · ${formatFullDate(expense.day)}`}
      footer={
        canDelete && (
          <button
            type="button"
            className="btn h-11 px-4 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
            onClick={() => onDelete(expense)}
          >
            <Trash2 className="size-[1.125rem]" aria-hidden="true" />
            Supprimer la dépense
          </button>
        )
      }
    >
      <div className="space-y-5">
        <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">−{formatFcfa(expense.amount)}</p>
        <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-sunken p-4 text-sm">
          {[
            ['Catégorie', meta.label],
            ['Boutique', expense.shop],
            ['Effectuée par', expense.author],
            ['Payée par', payLabel(expense.pay)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-ink-mute">{label}</dt>
              <dd className="mt-0.5 truncate font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {expense.note && (
          <div>
            <h3 className="text-sm font-bold text-ink">Note</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{expense.note}</p>
          </div>
        )}
        <p className="text-sm text-ink-mute">
          Saisie par {expense.recordedBy} · {formatWhen(expense.recordedAt)}
        </p>
      </div>
    </Modal>
  );
}
