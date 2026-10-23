import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  Receipt,
  SearchX,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  NOW,
  business,
  formatFcfa,
  formatWhen,
  paymentMethods,
  products,
  saleTotal,
  sales as initialSales,
  type PaymentMethod,
  type Sale,
  type SaleLine,
  type SaleStatus,
  type Shop,
} from '../../data/dashboard';
import { FormAlert, TextField } from '../auth/fields';
import {
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  StatCard,
  StatusBadge,
  selectClass,
  useQueryParam,
  useToasts,
} from './ui';

const PAGE_SIZE = 10;
type StatusFilter = 'all' | SaleStatus;
type ShopFilter = 'all' | Shop;

const matchesQuery = (sale: Sale, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [sale.id, sale.customer, sale.seller, ...sale.lines.map((line) => line.name)].some((field) =>
    field.toLowerCase().includes(q),
  );
};

export default function SalesPage() {
  const [list, setList] = useState(initialSales);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [shop, setShop] = useState<ShopFilter>('all');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { notify, region } = useToasts();

  const presetQuery = useQueryParam('q');
  const presetNew = useQueryParam('nouvelle');
  useEffect(() => {
    if (presetQuery) setQuery(presetQuery);
  }, [presetQuery]);
  useEffect(() => {
    if (presetNew) setCreating(true);
  }, [presetNew]);

  const searched = useMemo(
    () => list.filter((sale) => (shop === 'all' || sale.shop === shop) && matchesQuery(sale, query)),
    [list, shop, query],
  );
  const filtered = status === 'all' ? searched : searched.filter((sale) => sale.status === status);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selected = list.find((sale) => sale.id === selectedId) ?? null;

  const counted = filtered.filter((sale) => sale.status !== 'cancelled');
  const paid = filtered.filter((sale) => sale.status === 'paid').reduce((sum, sale) => sum + sale.total, 0);
  const pending = filtered.filter((sale) => sale.status === 'pending');
  const pendingTotal = pending.reduce((sum, sale) => sum + sale.total, 0);
  const basket = counted.length ? Math.round(counted.reduce((sum, sale) => sum + sale.total, 0) / counted.length) : 0;

  const countBy = (value: SaleStatus) => searched.filter((sale) => sale.status === value).length;
  const statusOptions = [
    { id: 'all' as const, label: 'Toutes', count: searched.length },
    { id: 'paid' as const, label: 'Payées', count: countBy('paid') },
    { id: 'pending' as const, label: 'En attente', count: countBy('pending') },
    { id: 'cancelled' as const, label: 'Annulées', count: countBy('cancelled') },
  ];

  const updateStatus = (id: string, next: SaleStatus) =>
    setList((items) => items.map((sale) => (sale.id === id ? { ...sale, status: next } : sale)));

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setShop('all');
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        description="Toutes les ventes de vos boutiques, encaissées ou en attente de paiement."
        actions={
          <button type="button" className="btn-gold h-11 px-4" onClick={() => setCreating(true)}>
            <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
            Nouvelle vente
          </button>
        }
      />

      <section aria-label="Résumé de la sélection" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Encaissé" value={formatFcfa(paid)} icon={Banknote} tone="gold" />
        <StatCard label="En attente de paiement" value={formatFcfa(pendingTotal)} icon={Clock} tone="warning">
          <p className="text-sm text-ink-mute">
            {pending.length} vente{pending.length > 1 ? 's' : ''} à relancer
          </p>
        </StatCard>
        <StatCard label="Ventes" value={counted.length} icon={Receipt} />
        <StatCard label="Panier moyen" value={formatFcfa(basket)} icon={ShoppingBasket} />
      </section>

      <section aria-label="Liste des ventes" className="app-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 xl:flex-row xl:items-center">
          <Segmented
            selectOnMobile
            label="Statut"
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row xl:ml-auto">
            <div className="relative">
              <select
                aria-label="Boutique"
                value={shop}
                onChange={(event) => {
                  setShop(event.target.value as ShopFilter);
                  setPage(0);
                }}
                className={`${selectClass} w-full sm:w-56`}
              >
                <option value="all">Toutes les boutiques</option>
                {business.shops.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
                aria-hidden="true"
              />
            </div>
            <SearchInput
              label="Rechercher une vente"
              placeholder="N°, client, vendeur ou produit"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
              className="sm:w-80"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-4 text-center">
            <SearchX className="mx-auto mt-10 size-8 text-ink-mute" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">Aucune vente ne correspond</p>
            <p className="mt-1 text-sm text-ink-mute">
              Modifiez la recherche ou les filtres pour élargir la sélection.
            </p>
            <button type="button" className="btn-quiet mt-5 mb-10 h-10 px-4 text-sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {visible.map((sale) => (
                <li key={sale.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(sale.id)}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-sunken/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">
                        {sale.customer} <span className="font-normal text-ink-mute">· {sale.id}</span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-mute">
                        {formatWhen(sale.date)} · {sale.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink tabular-nums">{formatFcfa(sale.total)}</p>
                      <div className="mt-1">
                        <StatusBadge kind="sale" status={sale.status} />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-sunken/60 text-left text-xs text-ink-mute">
                  <tr>
                    <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                      Vente
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Articles
                    </th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                      Vendeur
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Paiement
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Montant
                    </th>
                    <th scope="col" className="py-3 pr-5 pl-3 font-semibold">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedId(sale.id)}
                      className="cursor-pointer transition hover:bg-sunken/60"
                    >
                      <td className="py-3.5 pr-3 pl-5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(sale.id);
                          }}
                          className="font-semibold text-ink hover:underline"
                          aria-label={`Voir le détail de la vente ${sale.id}`}
                        >
                          {sale.id}
                        </button>
                        <span className="block text-xs text-ink-mute">{formatWhen(sale.date)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-ink-soft">{sale.customer}</td>
                      <td className="max-w-56 px-3 py-3.5 text-ink-soft">
                        <span className="block truncate">{sale.lines[0].name}</span>
                        {sale.lines.length > 1 && (
                          <span className="text-xs text-ink-mute">
                            + {sale.lines.length - 1} autre{sale.lines.length > 2 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3.5 xl:table-cell">
                        <span className="block text-ink-soft">{sale.seller}</span>
                        <span className="text-xs text-ink-mute">{sale.shop}</span>
                      </td>
                      <td className="px-3 py-3.5 text-ink-soft">{sale.method}</td>
                      <td className="px-3 py-3.5 text-right font-bold whitespace-nowrap text-ink tabular-nums">
                        {formatFcfa(sale.total)}
                      </td>
                      <td className="py-3.5 pr-5 pl-3">
                        <StatusBadge kind="sale" status={sale.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
              <p className="text-ink-mute tabular-nums">
                {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} sur{' '}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-quiet h-9 px-3 text-sm disabled:pointer-events-none disabled:opacity-40"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Précédent
                </button>
                <button
                  type="button"
                  className="btn-quiet h-9 px-3 text-sm disabled:pointer-events-none disabled:opacity-40"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Suivant
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <SaleDetail
        sale={selected}
        onClose={() => setSelectedId(null)}
        onMarkPaid={(sale) => {
          updateStatus(sale.id, 'paid');
          notify(`Vente ${sale.id} marquée comme payée.`);
        }}
        onCancel={(sale) => {
          const previous = sale.status;
          updateStatus(sale.id, 'cancelled');
          setSelectedId(null);
          notify(`Vente ${sale.id} annulée.`, {
            action: { label: 'Rétablir', run: () => updateStatus(sale.id, previous) },
          });
        }}
      />

      <NewSaleDialog
        open={creating}
        onClose={() => setCreating(false)}
        nextId={`V-${String(Math.max(...list.map((sale) => Number(sale.id.slice(2)))) + 1).padStart(6, '0')}`}
        onCreate={(sale) => {
          setList((items) => [sale, ...items]);
          resetFilters();
          setCreating(false);
          notify(`Vente ${sale.id} enregistrée · ${formatFcfa(sale.total)}.`);
        }}
      />

      {region}
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

function SaleDetail({
  sale,
  onClose,
  onMarkPaid,
  onCancel,
}: {
  sale: Sale | null;
  onClose: () => void;
  onMarkPaid: (sale: Sale) => void;
  onCancel: (sale: Sale) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [sale?.id]);

  return (
    <Modal
      open={sale !== null}
      onClose={onClose}
      variant="sheet"
      title={sale ? `Vente ${sale.id}` : 'Vente'}
      description={sale ? formatWhen(sale.date) : undefined}
      footer={
        sale &&
        sale.status !== 'cancelled' &&
        (confirming ? (
          <>
            <p className="mr-auto self-center text-sm font-semibold text-ink">Annuler cette vente ?</p>
            <button type="button" className="btn-quiet h-10 px-4 text-sm" onClick={() => setConfirming(false)}>
              Non, garder
            </button>
            <button
              type="button"
              className="btn h-10 bg-red-600 px-4 text-sm text-white hover:bg-red-700"
              onClick={() => onCancel(sale)}
            >
              Oui, annuler la vente
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn mr-auto h-10 px-3 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Annuler la vente
            </button>
            {sale.status === 'pending' && (
              <button type="button" className="btn-gold h-10 px-4 text-sm" onClick={() => onMarkPaid(sale)}>
                Marquer comme payée
              </button>
            )}
          </>
        ))
      }
    >
      {sale && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge kind="sale" status={sale.status} />
            <p className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">{formatFcfa(sale.total)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-sunken p-4 text-sm">
            {[
              ['Client', sale.customer],
              ['Paiement', sale.method],
              ['Vendeur', sale.seller],
              ['Boutique', sale.shop],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-ink-mute">{label}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="text-sm font-bold text-ink">Articles</h3>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {sale.lines.map((line) => (
                <li key={line.productId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{line.name}</p>
                    <p className="text-ink-mute tabular-nums">
                      {line.quantity} × {formatFcfa(line.unitPrice)}
                    </p>
                  </div>
                  <p className="font-semibold text-ink tabular-nums">{formatFcfa(line.quantity * line.unitPrice)}</p>
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-3 text-sm font-bold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatFcfa(sale.total)}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ new sale */

function NewSaleDialog({
  open,
  onClose,
  nextId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  nextId: string;
  onCreate: (sale: Sale) => void;
}) {
  const available = products.filter((product) => product.stock > 0);
  const [shop, setShop] = useState<Shop>('Akwa');
  const [productId, setProductId] = useState(available[0].id);
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [customer, setCustomer] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Espèces');
  const [error, setError] = useState('');

  const product = available.find((item) => item.id === productId)!;
  const total = saleTotal(lines);

  const reset = () => {
    setLines([]);
    setCustomer('');
    setQuantity(1);
    setMethod('Espèces');
    setError('');
  };

  const addLine = () => {
    setError('');
    setLines((items) => {
      const existing = items.find((line) => line.productId === product.id);
      if (existing)
        return items.map((line) => (line === existing ? { ...line, quantity: line.quantity + quantity } : line));
      return [...items, { productId: product.id, name: product.name, quantity, unitPrice: product.price }];
    });
    setQuantity(1);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Nouvelle vente"
      description={`${nextId} · encaissée par ${business.owner.name}`}
      footer={
        <>
          <p className="mr-auto self-center text-sm text-ink-mute">
            Total <span className="ml-1 text-lg font-extrabold text-ink tabular-nums">{formatFcfa(total)}</span>
          </p>
          <button
            type="button"
            className="btn-gold h-11 px-5"
            onClick={() => {
              if (lines.length === 0) {
                setError('Ajoutez au moins un article avant d’encaisser.');
                return;
              }
              const seller = business.owner.name;
              onCreate({
                id: nextId,
                date: NOW,
                customer: customer.trim() || 'Client de passage',
                lines,
                total,
                method,
                status: 'paid',
                seller,
                shop,
              });
              reset();
            }}
          >
            Encaisser
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Boutique</p>
          <Segmented
            label="Boutique"
            options={business.shops.map((name) => ({ id: name, label: name }))}
            value={shop}
            onChange={setShop}
          />
        </div>

        <div>
          <label htmlFor="sale-product" className="mb-2 block text-sm font-semibold text-ink">
            Article
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <select
                id="sale-product"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className={`${selectClass} h-12 w-full`}
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatFcfa(item.price)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
                aria-hidden="true"
              />
            </div>
            <div className="flex gap-2.5">
              <div
                className="flex h-12 items-center rounded-xl border border-line bg-panel"
                role="group"
                aria-label="Quantité"
              >
                <button
                  type="button"
                  aria-label="Retirer un"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid size-11 place-items-center rounded-l-xl text-ink-soft hover:bg-sunken"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span className="w-8 text-center font-bold text-ink tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Ajouter un"
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  className="grid size-11 place-items-center rounded-r-xl text-ink-soft hover:bg-sunken"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                className="btn-navy h-12 flex-1 px-4 sm:flex-none dark:bg-white/10 dark:hover:bg-white/15"
                onClick={addLine}
              >
                Ajouter
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-mute">{product.stock} en stock</p>
        </div>

        {lines.length > 0 && (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{line.name}</p>
                  <p className="text-ink-mute tabular-nums">
                    {line.quantity} × {formatFcfa(line.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold text-ink tabular-nums">{formatFcfa(line.quantity * line.unitPrice)}</p>
                <button
                  type="button"
                  aria-label={`Retirer ${line.name}`}
                  onClick={() => setLines((items) => items.filter((item) => item !== line))}
                  className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <FormAlert>{error}</FormAlert>}

        <TextField
          id="sale-customer"
          label="Client (facultatif)"
          placeholder="Ex. Brenda Nkeng"
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Moyen de paiement</p>
          <Segmented
            label="Moyen de paiement"
            options={paymentMethods.map((name) => ({ id: name, label: name }))}
            value={method}
            onChange={setMethod}
          />
        </div>
      </div>
    </Modal>
  );
}
