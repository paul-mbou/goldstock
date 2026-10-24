import {
  Boxes,
  ClipboardCheck,
  PackageMinus,
  PackagePlus,
  PackageX,
  SearchX,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import {
  HOUR,
  MOVE_LABELS,
  NOW,
  formatFcfa,
  formatNumber,
  formatWhen,
  type Move,
  type MoveType,
} from '../../data/dashboard';
import {
  adjustStock,
  applyInventory,
  flatItems,
  recordMove,
  stockStatus,
  useSession,
  type Item,
  type MoveInput,
} from '../../lib/demo';
import { Screen } from './Screen';
import {
  Badge,
  CategoryLabel,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  SelectBox,
  StatCard,
  StatusBadge,
  Stepper,
  Tabs,
  inputClass,
  linkClass,
  useQueryParam,
  useSheet,
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
  const moveSheet = useSheet<Direction>();
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
          <>
            <button type="button" className="btn-quiet h-11 px-4" onClick={() => moveSheet.show('out')}>
              <PackageMinus className="size-[1.125rem]" aria-hidden="true" />
              Sortie
            </button>
            <button type="button" className="btn-gold h-11 px-4" onClick={() => moveSheet.show('in')}>
              <PackagePlus className="size-[1.125rem]" aria-hidden="true" />
              Entrée
            </button>
          </>
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
      {moveSheet.value && (
        <MoveDialog
          key={moveSheet.key}
          open={moveSheet.open}
          initialDirection={moveSheet.value}
          items={items}
          onClose={moveSheet.hide}
          onSave={(input, item) => {
            recordMove(input);
            moveSheet.hide();
            setView('moves');
            notify(
              input.direction === 'in'
                ? `Entrée enregistrée : +${input.qty} ${item.full}.`
                : `Sortie enregistrée : −${input.qty} ${item.full}.`,
            );
          }}
        />
      )}
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

      {items.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun article en stock">
          Le stock se remplit quand vous ajoutez un produit avec sa quantité, ou quand vous saisissez une réception de
          marchandise.
        </EmptyState>
      ) : visible.length === 0 ? (
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
  entry: 'success',
  exit: 'warning',
  adjust: 'navy',
  loss: 'danger',
  return: 'warning',
  inventory: 'neutral',
};

type Flow = 'all' | 'in' | 'out';

function Moves({ moves }: { moves: Move[] }) {
  const [type, setType] = useState<'all' | MoveType>('all');
  const [flow, setFlow] = useState<Flow>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const searched = moves.filter(
    (move) =>
      (type === 'all' || move.type === type) &&
      (!q || `${move.item} ${move.user} ${move.source ?? ''} ${move.destination ?? ''}`.toLowerCase().includes(q)),
  );
  const visible = searched.filter((move) => flow === 'all' || (flow === 'in' ? move.qty > 0 : move.qty < 0));

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 xl:flex-row xl:items-center">
        <Segmented
          label="Sens du mouvement"
          value={flow}
          onChange={setFlow}
          options={[
            { id: 'all', label: 'Tous', count: searched.length },
            { id: 'in', label: 'Entrées', count: searched.filter((move) => move.qty > 0).length },
            { id: 'out', label: 'Sorties', count: searched.filter((move) => move.qty < 0).length },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row xl:ml-auto">
          <SelectBox
            aria-label="Type de mouvement"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="sm:w-52"
          >
            <option value="all">Tous les types</option>
            {(Object.keys(MOVE_LABELS) as MoveType[]).map((id) => (
              <option key={id} value={id}>
                {MOVE_LABELS[id]}
              </option>
            ))}
          </SelectBox>
          <SearchInput
            label="Rechercher un mouvement"
            placeholder="Article, auteur, provenance"
            value={query}
            onChange={setQuery}
            className="sm:w-72"
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun mouvement">
          Les entrées, sorties, réceptions et corrections apparaîtront ici.
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
                {(move.source || move.destination) && (
                  <p className="text-sm text-ink-soft">
                    <span className="text-ink-mute">{move.source ? 'Provenance' : 'Destination'} :</span>{' '}
                    <span className="font-medium">{move.source ?? move.destination}</span>
                  </p>
                )}
                <p className="text-sm text-ink-mute">
                  {move.note && `${move.note} · `}par <span className="font-medium text-ink-soft">{move.user}</span>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
              placeholder="Ex. Abîmé à la livraison"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FormField>
        </div>
      )}
    </Modal>
  );
}

type Direction = 'in' | 'out';

/** `detail`: the free-text precision the kind asks for; `supplier` picks from the supplier list instead. */
type PartyKind = {
  id: string;
  label: string;
  hint: string;
  type: MoveType;
  detail: { label: string; placeholder: string; required: boolean } | 'supplier';
};

const partyKinds: Record<Direction, PartyKind[]> = {
  in: [
    { id: 'supplier', label: 'Fournisseur', hint: 'Livraison d’un fournisseur.', type: 'entry', detail: 'supplier' },
    {
      id: 'market',
      label: 'Achat direct',
      hint: 'Marché, grossiste, particulier.',
      type: 'entry',
      detail: { label: 'Lieu ou vendeur', placeholder: 'Ex. Marché Mboppi, Douala', required: true },
    },
    {
      id: 'return',
      label: 'Retour client',
      hint: 'Article rapporté en bon état.',
      type: 'return',
      detail: { label: 'Client ou n° de vente', placeholder: 'Ex. Mme Ngo, V-0412', required: false },
    },
    {
      id: 'other',
      label: 'Autre',
      hint: 'Dépôt, don, transfert…',
      type: 'entry',
      detail: { label: 'Provenance', placeholder: 'Ex. Dépôt de la boutique de Yaoundé', required: true },
    },
  ],
  out: [
    {
      id: 'loss',
      label: 'Casse ou perte',
      hint: 'Abîmé, volé ou périmé.',
      type: 'loss',
      detail: { label: 'Précision', placeholder: 'Ex. Écran fissuré', required: false },
    },
    { id: 'supplier', label: 'Retour fournisseur', hint: 'Renvoyé au fournisseur.', type: 'exit', detail: 'supplier' },
    {
      id: 'internal',
      label: 'Usage interne',
      hint: 'Démonstration, échantillon.',
      type: 'exit',
      detail: { label: 'Précision', placeholder: 'Ex. Modèle d’exposition', required: false },
    },
    {
      id: 'other',
      label: 'Autre',
      hint: 'Transfert, prêt, don…',
      type: 'exit',
      detail: { label: 'Destination', placeholder: 'Ex. Boutique de Yaoundé', required: true },
    },
  ],
};

/** Calendar day in Cameroon (UTC+1), as an `<input type="date">` value. */
const dayKey = (ts: number) => new Date(ts + HOUR).toISOString().slice(0, 10);
const TODAY = dayKey(NOW);

type MoveErrors = Partial<Record<'item' | 'qty' | 'detail' | 'day', string>>;

function MoveDialog({
  open,
  initialDirection,
  items,
  onClose,
  onSave,
}: {
  open: boolean;
  initialDirection: Direction;
  items: Item[];
  onClose: () => void;
  onSave: (input: MoveInput, item: Item) => void;
}) {
  const { demo, member, can } = useSession();
  const [direction, setDirection] = useState(initialDirection);
  const [vid, setVid] = useState('');
  const [qty, setQty] = useState(1);
  const [kindId, setKindId] = useState(partyKinds[initialDirection][0].id);
  const [supplierId, setSupplierId] = useState(demo.suppliers[0]?.id ?? '');
  const [detail, setDetail] = useState('');
  const [day, setDay] = useState(TODAY);
  const [author, setAuthor] = useState(member.name);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<MoveErrors>({});

  const entry = direction === 'in';
  const kinds = partyKinds[direction];
  const kind = kinds.find((item) => item.id === kindId) ?? kinds[0];
  const item = items.find((candidate) => candidate.variant.id === vid);
  const stock = item?.variant.stock ?? 0;
  const authors = demo.team.filter((person) => person.status === 'active').map((person) => person.name);
  if (!authors.includes(member.name)) authors.unshift(member.name);

  const clear = (field: keyof MoveErrors) => setErrors((current) => ({ ...current, [field]: undefined }));

  const chooseDirection = (next: Direction) => {
    setDirection(next);
    setKindId(partyKinds[next][0].id);
    setDetail('');
    setErrors({});
  };

  const party = () => {
    const supplier = demo.suppliers.find((candidate) => candidate.id === supplierId)?.name ?? '';
    if (kind.detail === 'supplier') return entry ? supplier : `${kind.label} · ${supplier}`;
    const text = detail.trim();
    if (kind.id === 'other') return text;
    return text ? `${kind.label} · ${text}` : kind.label;
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: MoveErrors = {};
    if (!item) found.item = 'Choisissez l’article concerné.';
    else if (!entry && stock === 0) found.item = 'Cet article est en rupture : rien à sortir.';
    else if (!entry && qty > stock) found.qty = `Il n’en reste que ${stock} en stock.`;
    if (qty < 1) found.qty = 'Indiquez une quantité d’au moins 1.';
    if (kind.detail === 'supplier' && !supplierId)
      found.detail = 'Aucun fournisseur : ajoutez-en un ou choisissez une autre provenance.';
    if (kind.detail !== 'supplier' && kind.detail.required && detail.trim().length < 2)
      found.detail = entry ? 'Indiquez la provenance.' : 'Indiquez la destination.';
    if (!day || day > TODAY) found.day = 'Choisissez une date passée ou aujourd’hui.';
    setErrors(found);
    const first = (['item', 'qty', 'detail', 'day'] as const).find((field) => found[field]);
    if (first) {
      document.getElementById(`move-${first}`)?.focus();
      return;
    }
    onSave(
      {
        vid,
        direction,
        qty,
        type: kind.type,
        party: party(),
        at: day === TODAY ? null : Date.parse(`${day}T12:00:00+01:00`),
        user: author,
        note,
      },
      item!,
    );
  };

  return (
    <Modal
      open={open}
      variant="sheet"
      onClose={onClose}
      title={entry ? 'Entrée de stock' : 'Sortie de stock'}
      description={
        entry
          ? 'Des articles arrivent : précisez d’où ils viennent.'
          : 'Des articles quittent le stock sans être vendus.'
      }
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="stock-move" className="btn-gold h-11 px-5">
            {entry ? 'Enregistrer l’entrée' : 'Enregistrer la sortie'}
          </button>
        </>
      }
    >
      <form id="stock-move" noValidate onSubmit={submit} className="space-y-5">
        <Segmented
          label="Sens du mouvement"
          value={direction}
          onChange={chooseDirection}
          options={[
            { id: 'in', label: 'Entrée' },
            { id: 'out', label: 'Sortie' },
          ]}
        />

        <FormField id="move-item" label="Article" error={errors.item}>
          <SelectBox
            id="move-item"
            value={vid}
            onChange={(event) => {
              setVid(event.target.value);
              clear('item');
              clear('qty');
            }}
          >
            <option value="">Choisir un article…</option>
            {demo.categories.map((category) => (
              <optgroup key={category.id} label={category.name}>
                {items
                  .filter((candidate) => candidate.product.cat === category.id)
                  .map((candidate) => (
                    <option key={candidate.key} value={candidate.variant.id}>
                      {candidate.full} (stock {candidate.variant.stock})
                    </option>
                  ))}
              </optgroup>
            ))}
          </SelectBox>
        </FormField>

        <div>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-sunken p-4">
            <div>
              <p className="text-sm text-ink-mute">Actuel</p>
              <p className="text-2xl font-extrabold text-ink tabular-nums">{item ? stock : '—'}</p>
            </div>
            <div id="move-qty" tabIndex={-1} className="text-center focus-visible:outline-none">
              <p className="mb-1 text-sm font-semibold text-ink">Quantité</p>
              <Stepper
                label="Quantité"
                value={qty}
                min={1}
                max={!entry && item ? Math.max(1, stock) : Infinity}
                onChange={(value) => {
                  setQty(value);
                  clear('qty');
                }}
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-mute">Après</p>
              <p className="text-2xl font-extrabold text-ink tabular-nums" aria-live="polite">
                {item ? Math.max(0, stock + (entry ? qty : -qty)) : '—'}
              </p>
            </div>
          </div>
          {errors.qty && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.qty}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">{entry ? 'Provenance' : 'Motif'}</legend>
          <div className="grid grid-cols-2 gap-2">
            {kinds.map((option) => (
              <label
                key={option.id}
                className="cursor-pointer rounded-xl border border-line p-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 has-focus-visible:ring-4 has-focus-visible:ring-gold-400/25 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
              >
                <input
                  type="radio"
                  name="move-kind"
                  className="sr-only"
                  checked={kind.id === option.id}
                  onChange={() => {
                    setKindId(option.id);
                    setDetail('');
                    clear('detail');
                  }}
                />
                <span className="block text-sm font-bold text-ink">{option.label}</span>
                <span className="block text-xs text-ink-mute">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind.detail === 'supplier' && !demo.suppliers.length ? (
          <p id="move-detail" tabIndex={-1} className="rounded-xl bg-sunken px-4 py-3 text-sm text-ink-soft">
            Aucun fournisseur enregistré.{' '}
            {can('suppliers') ? (
              <a href="/app/fournisseurs" className={linkClass}>
                Ajouter un fournisseur
              </a>
            ) : (
              'Choisissez une autre provenance.'
            )}
            {errors.detail && (
              <span role="alert" className="mt-1 block font-medium text-red-600 dark:text-red-400">
                {errors.detail}
              </span>
            )}
          </p>
        ) : kind.detail === 'supplier' ? (
          <FormField
            id="move-detail"
            label="Fournisseur"
            error={errors.detail}
            hint={
              entry &&
              can('suppliers') && (
                <>
                  Livraison avec bon et prix d’achat ?{' '}
                  <a href="/app/fournisseurs?onglet=reception" className={linkClass}>
                    Faire une réception
                  </a>
                </>
              )
            }
          >
            <SelectBox id="move-detail" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              {demo.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectBox>
          </FormField>
        ) : (
          <FormField
            id="move-detail"
            label={
              <>
                {kind.detail.label}
                {!kind.detail.required && <span className="font-normal text-ink-mute"> (facultatif)</span>}
              </>
            }
            error={errors.detail}
          >
            <input
              id="move-detail"
              className={inputClass(Boolean(errors.detail))}
              placeholder={kind.detail.placeholder}
              value={detail}
              onChange={(event) => {
                setDetail(event.target.value);
                clear('detail');
              }}
            />
          </FormField>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="move-day" label="Date" error={errors.day}>
            <input
              id="move-day"
              type="date"
              max={TODAY}
              className={inputClass(Boolean(errors.day))}
              value={day}
              onChange={(event) => {
                setDay(event.target.value);
                clear('day');
              }}
            />
          </FormField>
          <FormField id="move-author" label="Fait par">
            <SelectBox id="move-author" value={author} onChange={(event) => setAuthor(event.target.value)}>
              {authors.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </SelectBox>
          </FormField>
        </div>

        <FormField id="move-note" label="Note" hint="Facultatif. Visible dans l’historique des mouvements.">
          <input
            id="move-note"
            className={inputClass()}
            placeholder={entry ? 'Ex. Bon de livraison BL-7790' : 'Ex. Remis à Paul pour la vitrine'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
