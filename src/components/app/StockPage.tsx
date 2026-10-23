import {
  Boxes,
  ClipboardCheck,
  PackagePlus,
  PackageX,
  SearchX,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { MOVE_LABELS, formatFcfa, formatNumber, formatWhen, type Move, type MoveType } from '../../data/dashboard';
import { adjustStock, applyInventory, flatItems, stockStatus, useSession, type Item } from '../../lib/demo';
import { Screen } from './Screen';
import {
  Badge,
  CategoryLabel,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SearchInput,
  SelectBox,
  Segmented,
  StatCard,
  StatusBadge,
  Stepper,
  Tabs,
  inputClass,
  useQueryParam,
  useToasts,
  type Tone,
} from './ui';

export default function StockPage() {
  return (
    <Screen id="stock">
      <Stock />
    </Screen>
  );
}

type View = 'state' | 'moves' | 'inventory';
type Filter = 'all' | 'alert' | 'out';

const matches = (item: Item, query: string, category: string) => {
  const q = query.trim().toLowerCase();
  return (
    (category === 'all' || item.product.cat === category) &&
    (!q || `${item.full} ${item.variant.sku}`.toLowerCase().includes(q))
  );
};

function Stock() {
  const session = useSession();
  const { demo, role } = session;
  const [view, setView] = useState<View>('state');
  const [adjusting, setAdjusting] = useState<Item | null>(null);
  const { notify, region } = useToasts();
  const items = flatItems(demo);

  const presetTab = useQueryParam('onglet');
  useEffect(() => {
    if (presetTab === 'inventaire') setView('inventory');
    if (presetTab === 'mouvements') setView('moves');
  }, [presetTab]);

  const units = items.reduce((sum, item) => sum + item.variant.stock, 0);
  const value = items.reduce((sum, item) => sum + item.variant.stock * item.variant.cost, 0);
  const low = items.filter((item) => stockStatus(item.variant.stock, item.product.min) === 'low').length;
  const out = items.filter((item) => stockStatus(item.variant.stock, item.product.min) === 'out').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Quantités par article, mouvements et inventaire."
        actions={
          role.screens.includes('suppliers') && (
            <a href="/app/fournisseurs?onglet=reception" className="btn-gold h-11 px-4">
              <PackagePlus className="size-[1.125rem]" aria-hidden="true" />
              Réceptionner
            </a>
          )
        }
      />

      <section aria-label="Résumé du stock" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Articles en stock" value={formatNumber(units)} icon={Boxes}>
          <p className="text-sm text-ink-mute">{items.length} références actives</p>
        </StatCard>
        {role.costs ? (
          <StatCard label="Valeur du stock" value={formatFcfa(value)} icon={Wallet} tone="gold">
            <p className="text-sm text-ink-mute">Au prix d’achat</p>
          </StatCard>
        ) : (
          <StatCard label="Produits" value={demo.products.length} icon={Wallet} tone="gold">
            <p className="text-sm text-ink-mute">Au catalogue</p>
          </StatCard>
        )}
        <StatCard label="Stock faible" value={low} icon={TriangleAlert} tone="warning">
          <p className="text-sm text-ink-mute">Sous le seuil d’alerte</p>
        </StatCard>
        <StatCard label="En rupture" value={out} icon={PackageX} tone="danger">
          <p className="text-sm text-ink-mute">À réapprovisionner</p>
        </StatCard>
      </section>

      <section className="app-card overflow-hidden">
        <div className="px-4 pt-2 sm:px-5">
          <Tabs
            label="Vue du stock"
            value={view}
            onChange={setView}
            tabs={[
              { id: 'state', label: 'État du stock' },
              { id: 'moves', label: 'Mouvements', count: demo.moves.length },
              { id: 'inventory', label: 'Inventaire' },
            ]}
          />
        </div>
        {view === 'state' && <StockState items={items} onAdjust={setAdjusting} />}
        {view === 'moves' && <Moves moves={demo.moves} />}
        {view === 'inventory' && (
          <Inventory
            items={items}
            onApply={(counts, gaps) => {
              applyInventory(counts, session.member.name);
              setView('moves');
              notify(gaps ? `Inventaire validé : ${gaps} écart(s) corrigé(s).` : 'Inventaire validé, aucun écart.');
            }}
          />
        )}
      </section>

      <AdjustDialog
        item={adjusting}
        onClose={() => setAdjusting(null)}
        onConfirm={(item, delta, type, note) => {
          adjustStock(item.variant.id, delta, type, note, session.member.name);
          setAdjusting(null);
          notify(`${item.full} : ${delta > 0 ? '+' : ''}${delta} (${MOVE_LABELS[type].toLowerCase()}).`);
        }}
      />
      {region}
    </div>
  );
}

function CategoryFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { demo } = useSession();
  return (
    <SelectBox
      aria-label="Catégorie"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="sm:w-52"
    >
      <option value="all">Toutes les catégories</option>
      {demo.categories
        .filter((category) => !category.archived)
        .map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
    </SelectBox>
  );
}

function StockState({ items, onAdjust }: { items: Item[]; onAdjust: (item: Item) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState<Filter>('all');

  const presetQuery = useQueryParam('q');
  const presetFilter = useQueryParam('filtre');
  useEffect(() => {
    if (presetQuery) setQuery(presetQuery);
  }, [presetQuery]);
  useEffect(() => {
    if (presetFilter === 'alerte') setFilter('alert');
    if (presetFilter === 'rupture') setFilter('out');
  }, [presetFilter]);

  const searched = items.filter((item) => matches(item, query, category));
  const status = (item: Item) => stockStatus(item.variant.stock, item.product.min);
  const visible = searched
    .filter((item) => (filter === 'all' ? true : filter === 'out' ? status(item) === 'out' : status(item) !== 'ok'))
    .sort((a, b) => (filter === 'all' ? 0 : a.variant.stock - b.variant.stock));

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 xl:flex-row xl:items-center">
        <Segmented
          selectOnMobile
          label="État du stock"
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'Tous', count: searched.length },
            {
              id: 'alert',
              label: 'À réapprovisionner',
              count: searched.filter((item) => status(item) !== 'ok').length,
            },
            { id: 'out', label: 'En rupture', count: searched.filter((item) => status(item) === 'out').length },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row xl:ml-auto">
          <CategoryFilter value={category} onChange={setCategory} />
          <SearchInput
            label="Rechercher un article"
            placeholder="Nom, variante ou référence"
            value={query}
            onChange={setQuery}
            className="sm:w-72"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun article ne correspond">
          Essayez un autre nom, une autre catégorie ou retirez le filtre.
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line md:hidden">
            {visible.map((item) => (
              <li key={item.key} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <ItemName item={item} />
                  <button
                    type="button"
                    onClick={() => onAdjust(item)}
                    className="btn-quiet h-9 shrink-0 px-3 text-sm"
                    aria-label={`Ajuster le stock de ${item.full}`}
                  >
                    Ajuster
                  </button>
                </div>
                <StockMeter item={item} />
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-sunken/60 text-left text-xs text-ink-mute">
                <tr>
                  <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                    Article
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Catégorie
                  </th>
                  <th scope="col" className="w-60 px-3 py-3 font-semibold">
                    Stock
                  </th>
                  <th scope="col" className="py-3 pr-5 pl-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((item) => (
                  <tr key={item.key} className="transition hover:bg-sunken/60">
                    <td className="py-3.5 pr-3 pl-5">
                      <ItemName item={item} />
                    </td>
                    <td className="px-3 py-3.5">
                      <CategoryLabel category={item.category} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StockMeter item={item} />
                    </td>
                    <td className="py-3.5 pr-5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAdjust(item)}
                        className="btn-quiet h-9 px-3 text-sm"
                        aria-label={`Ajuster le stock de ${item.full}`}
                      >
                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                        Ajuster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function ItemName({ item }: { item: Item }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{item.product.name}</p>
      <p className="text-xs text-ink-mute">
        {item.variant.label && <span className="text-ink-soft">{item.variant.label} · </span>}
        <span className="font-mono">{item.variant.sku}</span>
      </p>
    </div>
  );
}

function StockMeter({ item }: { item: Item }) {
  const { stock } = item.variant;
  const { min } = item.product;
  const status = stockStatus(stock, min);
  const ratio = Math.min(100, Math.round((stock / Math.max(1, min * 3)) * 100));
  const bar = { ok: 'bg-emerald-500', low: 'bg-gold-500', out: 'bg-red-500' }[status];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink tabular-nums">{stock}</span>
        <StatusBadge kind="stock" status={status} />
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.max(ratio, status === 'out' ? 0 : 4)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-mute">Seuil d’alerte : {min}</p>
    </div>
  );
}

const moveTone: Record<MoveType, Tone> = {
  reception: 'success',
  adjust: 'navy',
  loss: 'danger',
  return: 'warning',
  inventory: 'neutral',
};

function Moves({ moves }: { moves: Move[] }) {
  const [type, setType] = useState<'all' | MoveType>('all');
  const visible = moves.filter((move) => type === 'all' || move.type === type);

  return (
    <>
      <div className="border-b border-line p-4 sm:p-5">
        <SelectBox
          aria-label="Type de mouvement"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="sm:w-60"
        >
          <option value="all">Tous les mouvements</option>
          {(Object.keys(MOVE_LABELS) as MoveType[]).map((id) => (
            <option key={id} value={id}>
              {MOVE_LABELS[id]}
            </option>
          ))}
        </SelectBox>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun mouvement">
          Les réceptions, retours et corrections apparaîtront ici.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((move) => (
            <li key={move.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 sm:px-5">
              <span
                className={`w-12 text-right text-base font-extrabold tabular-nums ${
                  move.qty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {move.qty > 0 ? '+' : ''}
                {move.qty}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{move.item}</p>
                <p className="text-sm text-ink-mute">
                  {move.note || '—'} · {move.user}
                </p>
              </div>
              <Badge tone={moveTone[move.type]}>{MOVE_LABELS[move.type]}</Badge>
              <span className="w-full text-xs text-ink-mute sm:w-36 sm:text-right">{formatWhen(move.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Inventory({
  items,
  onApply,
}: {
  items: Item[];
  onApply: (counts: Record<string, number>, gaps: number) => void;
}) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const visible = items.filter((item) => matches(item, query, category));
  const gaps = Object.entries(counts).filter(
    ([vid, counted]) => items.find((item) => item.variant.id === vid)?.variant.stock !== counted,
  ).length;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5">
        <p className="flex-1 text-sm text-ink-mute">
          Comptez les articles en rayon et corrigez les quantités. Seuls les écarts seront enregistrés.
        </p>
        <CategoryFilter value={category} onChange={setCategory} />
        <SearchInput
          label="Rechercher un article"
          placeholder="Rechercher"
          value={query}
          onChange={setQuery}
          className="sm:w-56"
        />
      </div>
      <ul className="divide-y divide-line">
        {visible.map((item) => {
          const counted = counts[item.variant.id] ?? item.variant.stock;
          const gap = counted - item.variant.stock;
          return (
            <li key={item.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <ItemName item={item} />
              </div>
              <span className="w-24 text-right text-sm text-ink-mute">
                Théorique <span className="font-bold text-ink tabular-nums">{item.variant.stock}</span>
              </span>
              <Stepper
                size="sm"
                label={`Quantité comptée pour ${item.full}`}
                value={counted}
                onChange={(next) => setCounts((current) => ({ ...current, [item.variant.id]: next }))}
              />
              <span
                className={`w-12 text-right text-sm font-bold tabular-nums ${
                  gap === 0
                    ? 'text-ink-mute'
                    : gap > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {gap === 0 ? '—' : `${gap > 0 ? '+' : ''}${gap}`}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel/95 px-4 py-4 backdrop-blur sm:px-5">
        <p className="text-sm text-ink-soft">
          <span className="font-bold text-ink">{gaps}</span> écart(s) à enregistrer
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-quiet h-11 px-4" onClick={() => setCounts({})} disabled={!gaps}>
            Réinitialiser
          </button>
          <button
            type="button"
            className="btn-gold h-11 px-5 disabled:opacity-50"
            onClick={() => {
              onApply(counts, gaps);
              setCounts({});
            }}
          >
            <ClipboardCheck className="size-[1.125rem]" aria-hidden="true" />
            Valider l’inventaire
          </button>
        </div>
      </div>
    </>
  );
}

const adjustTypes: { id: MoveType; label: string; hint: string }[] = [
  { id: 'adjust', label: 'Correction', hint: 'Erreur de saisie ou de comptage.' },
  { id: 'loss', label: 'Casse ou perte', hint: 'Article abîmé, volé ou périmé.' },
  { id: 'return', label: 'Retour client', hint: 'Article rapporté en bon état.' },
];

function AdjustDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: Item | null;
  onClose: () => void;
  onConfirm: (item: Item, delta: number, type: MoveType, note: string) => void;
}) {
  const [delta, setDelta] = useState(0);
  const [type, setType] = useState<MoveType>('adjust');
  const [note, setNote] = useState('');
  useEffect(() => {
    setDelta(0);
    setType('adjust');
    setNote('');
  }, [item?.key]);

  const chooseType = (next: MoveType) => {
    setType(next);
    if (next === 'loss') setDelta((value) => -Math.abs(value || 1));
    if (next === 'return') setDelta((value) => Math.abs(value || 1));
  };

  const stock = item?.variant.stock ?? 0;
  const next = stock + delta;

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title="Ajuster le stock"
      description={item ? `${item.full} · ${item.variant.sku}` : undefined}
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-gold h-11 px-5 disabled:opacity-50"
            disabled={delta === 0}
            onClick={() =>
              item && onConfirm(item, delta, type, note.trim() || adjustTypes.find((entry) => entry.id === type)!.label)
            }
          >
            Enregistrer
          </button>
        </>
      }
    >
      {item && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Motif</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {adjustTypes.map((entry) => (
                <label
                  key={entry.id}
                  className="cursor-pointer rounded-xl border border-line p-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
                >
                  <input
                    type="radio"
                    name="adjust-type"
                    className="sr-only"
                    checked={type === entry.id}
                    onChange={() => chooseType(entry.id)}
                  />
                  <span className="block text-sm font-bold text-ink">{entry.label}</span>
                  <span className="block text-xs text-ink-mute">{entry.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-sunken p-4">
            <div>
              <p className="text-sm text-ink-mute">Actuel</p>
              <p className="text-2xl font-extrabold text-ink tabular-nums">{stock}</p>
            </div>
            <Stepper
              label="Variation du stock"
              value={delta}
              min={type === 'return' ? 0 : -stock}
              max={type === 'loss' ? 0 : Infinity}
              onChange={setDelta}
            />
            <div className="text-right">
              <p className="text-sm text-ink-mute">Après</p>
              <p className="text-2xl font-extrabold text-ink tabular-nums" aria-live="polite">
                {next}
              </p>
            </div>
          </div>

          <FormField id="adjust-note" label="Note" hint="Visible dans l’historique des mouvements.">
            <input
              id="adjust-note"
              className={inputClass()}
              placeholder="Ex. Écran fissuré à la livraison"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FormField>
        </div>
      )}
    </Modal>
  );
}
