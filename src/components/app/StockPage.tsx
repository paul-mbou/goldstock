import {
  Boxes,
  ChevronDown,
  CircleAlert,
  Minus,
  PackageX,
  Plus,
  SearchX,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import {
  categories,
  formatFcfa,
  formatNumber,
  marginRate,
  products as initialProducts,
  stockStatus,
  type Category,
  type Product,
} from '../../data/dashboard';
import { TextField } from '../auth/fields';
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

type Filter = 'all' | 'alert' | 'out';

const reasons = ['Réception fournisseur', 'Inventaire', 'Retour client', 'Casse ou perte'] as const;

export default function StockPage() {
  const [items, setItems] = useState(initialProducts);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const { notify, region } = useToasts();

  const presetQuery = useQueryParam('q');
  const presetFilter = useQueryParam('filtre');
  useEffect(() => {
    if (presetQuery) setQuery(presetQuery);
  }, [presetQuery]);
  useEffect(() => {
    if (presetFilter === 'alerte') setFilter('alert');
    if (presetFilter === 'rupture') setFilter('out');
  }, [presetFilter]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (product) =>
        (category === 'all' || product.category === category) &&
        (!q || `${product.name} ${product.sku}`.toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  const isAlert = (product: Product) => stockStatus(product) !== 'ok';
  const visible = searched.filter((product) =>
    filter === 'all' ? true : filter === 'out' ? stockStatus(product) === 'out' : isAlert(product),
  );

  const units = items.reduce((sum, product) => sum + product.stock, 0);
  const value = items.reduce((sum, product) => sum + product.stock * product.cost, 0);
  const lowCount = items.filter((product) => stockStatus(product) === 'low').length;
  const outCount = items.filter((product) => stockStatus(product) === 'out').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits et stock"
        description="Suivez vos quantités, vos marges et réapprovisionnez avant la rupture."
        actions={
          <button type="button" className="btn-gold h-11 px-4" onClick={() => setAdding(true)}>
            <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
            Ajouter un produit
          </button>
        }
      />

      <section aria-label="Résumé du stock" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Articles en stock" value={formatNumber(units)} icon={Boxes}>
          <p className="text-sm text-ink-mute">{items.length} produits au catalogue</p>
        </StatCard>
        <StatCard label="Valeur du stock" value={formatFcfa(value)} icon={Wallet} tone="gold">
          <p className="text-sm text-ink-mute">Au prix d’achat</p>
        </StatCard>
        <StatCard label="Stock faible" value={lowCount} icon={CircleAlert} tone="warning">
          <button
            type="button"
            onClick={() => setFilter('alert')}
            className="text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300"
          >
            Voir les produits
          </button>
        </StatCard>
        <StatCard label="En rupture" value={outCount} icon={PackageX} tone="danger">
          <button
            type="button"
            onClick={() => setFilter('out')}
            className="text-sm font-semibold text-red-600 hover:underline dark:text-red-300"
          >
            Voir les produits
          </button>
        </StatCard>
      </section>

      <section aria-label="Catalogue" className="app-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 xl:flex-row xl:items-center">
          <Segmented
            selectOnMobile
            label="État du stock"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'Tous', count: searched.length },
              { id: 'alert', label: 'À réapprovisionner', count: searched.filter(isAlert).length },
              {
                id: 'out',
                label: 'En rupture',
                count: searched.filter((product) => stockStatus(product) === 'out').length,
              },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row xl:ml-auto">
            <div className="relative">
              <select
                aria-label="Catégorie"
                value={category}
                onChange={(event) => setCategory(event.target.value as 'all' | Category)}
                className={`${selectClass} w-full sm:w-52`}
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
                aria-hidden="true"
              />
            </div>
            <SearchInput
              label="Rechercher un produit"
              placeholder="Nom ou référence"
              value={query}
              onChange={setQuery}
              className="sm:w-72"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <SearchX className="mx-auto size-8 text-ink-mute" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">Aucun produit ne correspond</p>
            <p className="mt-1 text-sm text-ink-mute">
              Essayez un autre nom, une autre catégorie ou retirez le filtre.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {visible.map((product) => (
                <li key={product.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="text-sm text-ink-mute">
                        {product.sku} · {formatFcfa(product.price)} · marge {marginRate(product)}&nbsp;%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdjusting(product)}
                      className="btn-quiet h-9 shrink-0 px-3 text-sm"
                      aria-label={`Ajuster le stock de ${product.name}`}
                    >
                      Ajuster
                    </button>
                  </div>
                  <StockMeter product={product} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="bg-sunken/60 text-left text-xs text-ink-mute">
                  <tr>
                    <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                      Produit
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Catégorie
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Prix de vente
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Marge
                    </th>
                    <th scope="col" className="w-56 px-3 py-3 font-semibold">
                      Stock
                    </th>
                    <th scope="col" className="py-3 pr-5 pl-3 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((product) => (
                    <ProductRow key={product.id} product={product} onAdjust={() => setAdjusting(product)} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <AdjustDialog
        product={adjusting}
        onClose={() => setAdjusting(null)}
        onConfirm={(product, next, reason) => {
          const before = product.stock;
          setItems((list) => list.map((item) => (item.id === product.id ? { ...item, stock: next } : item)));
          setAdjusting(null);
          notify(`${product.name} : stock passé de ${before} à ${next} (${reason.toLowerCase()}).`, {
            action: {
              label: 'Annuler',
              run: () =>
                setItems((list) => list.map((item) => (item.id === product.id ? { ...item, stock: before } : item))),
            },
          });
        }}
      />

      <AddProductDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={(product) => {
          setItems((list) => [product, ...list]);
          setAdding(false);
          setFilter('all');
          setCategory('all');
          setQuery('');
          notify(`${product.name} ajouté au catalogue.`);
        }}
      />

      {region}
    </div>
  );
}

function StockMeter({ product }: { product: Product }) {
  const status = stockStatus(product);
  const ratio = Math.min(100, Math.round((product.stock / (product.minStock * 3)) * 100));
  const bar = { ok: 'bg-emerald-500', low: 'bg-gold-500', out: 'bg-red-500' }[status];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink tabular-nums">{product.stock}</span>
        <StatusBadge kind="stock" status={status} />
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.max(ratio, status === 'out' ? 0 : 4)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-mute">Seuil d’alerte : {product.minStock}</p>
    </div>
  );
}

function ProductRow({ product, onAdjust }: { product: Product; onAdjust: () => void }) {
  return (
    <tr className="transition hover:bg-sunken/60">
      <td className="py-3.5 pr-3 pl-5">
        <p className="font-semibold text-ink">{product.name}</p>
        <p className="text-xs text-ink-mute">{product.sku}</p>
      </td>
      <td className="px-3 py-3.5 text-ink-soft">{product.category}</td>
      <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
        {formatFcfa(product.price)}
      </td>
      <td className="px-3 py-3.5 text-right text-ink-soft tabular-nums">{marginRate(product)}&nbsp;%</td>
      <td className="px-3 py-3.5">
        <StockMeter product={product} />
      </td>
      <td className="py-3.5 pr-5 pl-3 text-right">
        <button
          type="button"
          onClick={onAdjust}
          className="btn-quiet h-9 px-3 text-sm"
          aria-label={`Ajuster le stock de ${product.name}`}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Ajuster
        </button>
      </td>
    </tr>
  );
}

function AdjustDialog({
  product,
  onClose,
  onConfirm,
}: {
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product, next: number, reason: string) => void;
}) {
  const [change, setChange] = useState(0);
  const [reason, setReason] = useState<(typeof reasons)[number]>(reasons[0]);
  useEffect(() => {
    setChange(0);
    setReason(reasons[0]);
  }, [product?.id]);

  if (!product) return <Modal open={false} onClose={onClose} title="Ajuster le stock" children={null} />;
  const next = Math.max(0, product.stock + change);
  const preview = stockStatus({ stock: next, minStock: product.minStock });

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajuster le stock"
      description={`${product.name} · ${product.sku}`}
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-gold h-11 px-5 disabled:opacity-50"
            disabled={change === 0}
            onClick={() => onConfirm(product, next, reason)}
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-sunken p-4">
          <div>
            <p className="text-sm text-ink-mute">Stock actuel</p>
            <p className="text-2xl font-extrabold text-ink tabular-nums">{product.stock}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-mute">Après ajustement</p>
            <p className="text-2xl font-extrabold text-ink tabular-nums" aria-live="polite">
              {next}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Quantité à ajouter ou retirer</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Retirer un article"
              onClick={() => setChange((value) => Math.max(-product.stock, value - 1))}
              className="btn-quiet size-12 p-0"
            >
              <Minus className="size-5" aria-hidden="true" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              aria-label="Variation du stock"
              value={change}
              onChange={(event) => setChange(Math.max(-product.stock, Math.round(Number(event.target.value) || 0)))}
              className="h-12 w-24 rounded-xl border border-line bg-panel text-center text-lg font-bold text-ink tabular-nums focus:border-gold-500 focus:ring-4 focus:ring-gold-400/25 focus-visible:outline-none"
            />
            <button
              type="button"
              aria-label="Ajouter un article"
              onClick={() => setChange((value) => value + 1)}
              className="btn-quiet size-12 p-0"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
            <div className="ml-auto">
              <StatusBadge kind="stock" status={preview} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="adjust-reason" className="mb-2 block text-sm font-semibold text-ink">
            Motif
          </label>
          <div className="relative">
            <select
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
              className={`${selectClass} h-12 w-full`}
            >
              {reasons.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xs text-ink-mute">Le motif apparaît dans l’historique du produit.</p>
        </div>
      </div>
    </Modal>
  );
}

type ProductForm = { name: string; category: string; price: string; cost: string; stock: string; minStock: string };
const emptyForm: ProductForm = { name: '', category: categories[0], price: '', cost: '', stock: '', minStock: '5' };

function AddProductDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (product: Product) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const set = (key: keyof ProductForm) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const amount = (value: string) => Number(value.replace(/\s/g, ''));

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Indiquez le nom du produit.';
    if (!(amount(form.price) > 0)) next.price = 'Indiquez un prix de vente.';
    if (!(amount(form.cost) >= 0) || form.cost === '') next.cost = 'Indiquez le prix d’achat.';
    else if (amount(form.cost) > amount(form.price)) next.cost = 'Le prix d’achat dépasse le prix de vente.';
    if (!(amount(form.stock) >= 0) || form.stock === '') next.stock = 'Indiquez la quantité reçue.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const prefix = form.category.slice(0, 2).toUpperCase();
    onCreate({
      id: `p${Date.now()}`,
      name: form.name.trim(),
      sku: `${prefix}-${String(700 + Math.floor(Math.random() * 299))}`,
      category: form.category as Category,
      price: amount(form.price),
      cost: amount(form.cost),
      stock: amount(form.stock),
      minStock: amount(form.minStock) || 0,
    });
    setForm(emptyForm);
    setErrors({});
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setErrors({});
      }}
      title="Ajouter un produit"
      description="Il sera disponible en caisse dès l’enregistrement."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="add-product" className="btn-gold h-11 px-5">
            Enregistrer le produit
          </button>
        </>
      }
    >
      <form id="add-product" noValidate onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            id="product-name"
            label="Nom du produit"
            placeholder="Ex. Robe wax évasée"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="product-category"
            className="mb-2 block text-sm font-semibold text-navy-800 dark:text-navy-100"
          >
            Catégorie
          </label>
          <div className="relative">
            <select
              id="product-category"
              value={form.category}
              onChange={set('category')}
              className={`${selectClass} h-12 w-full`}
            >
              {categories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
              aria-hidden="true"
            />
          </div>
        </div>
        <TextField
          id="product-price"
          label="Prix de vente (FCFA)"
          inputMode="numeric"
          placeholder="18 000"
          value={form.price}
          onChange={set('price')}
          error={errors.price}
        />
        <TextField
          id="product-cost"
          label="Prix d’achat (FCFA)"
          inputMode="numeric"
          placeholder="10 500"
          value={form.cost}
          onChange={set('cost')}
          error={errors.cost}
        />
        <TextField
          id="product-stock"
          label="Quantité reçue"
          inputMode="numeric"
          placeholder="24"
          value={form.stock}
          onChange={set('stock')}
          error={errors.stock}
        />
        <TextField
          id="product-min"
          label="Seuil d’alerte"
          inputMode="numeric"
          value={form.minStock}
          onChange={set('minStock')}
          hint="Vous êtes prévenu en dessous."
        />
      </form>
    </Modal>
  );
}
