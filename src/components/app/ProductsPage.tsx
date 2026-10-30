import { Archive, ArchiveRestore, Package, PackageSearch, Pencil, Plus, Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatFcfa, formatNumber, type Product, type ProductStatus } from '../../data/dashboard';
import { logActivity, priceRange, productStock, saveProductStatus, stockStatus, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import { normalize } from './Topbar';
import {
  CategoryLabel,
  CategoryTile,
  EmptyState,
  PageHeader,
  SearchInput,
  Segmented,
  SelectBox,
  StatusBadge,
  useQueryParam,
  useToasts,
} from './ui';

type StockFilter = 'all' | 'alert' | 'out';

export default function ProductsPage() {
  return (
    <Screen id="products">
      <Products />
    </Screen>
  );
}

function priceLabel(product: Product) {
  const { min, max } = priceRange(product);
  return min === max ? formatFcfa(min) : `${formatFcfa(min)} – ${formatFcfa(max)}`;
}

function Products() {
  const { demo, role, can, member } = useSession();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | ProductStatus>('active');
  const [stock, setStock] = useState<StockFilter>('all');
  const { notify, region } = useToasts();

  const presetQuery = useQueryParam('q');
  const presetStock = useQueryParam('stock');
  const saved = useQueryParam('enregistre');
  useEffect(() => {
    if (presetQuery) setQuery(presetQuery);
    if (presetStock === 'alerte') setStock('alert');
    if (presetStock === 'rupture') setStock('out');
  }, [presetQuery, presetStock]);
  useEffect(() => {
    if (!saved) return;
    const product = demo.products.find((item) => item.id === saved);
    if (product) notify(`« ${product.name} » est enregistré dans le catalogue.`);
    window.history.replaceState(null, '', window.location.pathname);
  }, [saved]);

  const categories = demo.categories.filter((item) => !item.archived);
  const q = normalize(query.trim());
  const visible = demo.products.filter((product) => {
    const total = productStock(product);
    const state = stockStatus(total, product.min);
    return (
      (category === 'all' || product.cat === category) &&
      (status === 'all' || product.status === status) &&
      (stock === 'all' ||
        (stock === 'out' && state === 'out') ||
        (stock === 'alert' && product.variants.some((variant) => variant.stock <= product.min))) &&
      (!q || normalize(`${product.name} ${product.sub} ${product.variants.map((v) => v.sku).join(' ')}`).includes(q))
    );
  });

  const setStatusOf = (product: Product, next: ProductStatus) => {
    void saveProductStatus(product, next);
  };

  const archive = (product: Product) => {
    const next = product.status === 'archived' ? 'active' : 'archived';
    setStatusOf(product, next);
    logActivity(member.name, `a ${next === 'archived' ? 'archivé' : 'restauré'} ${product.name}`, 'edit');
    notify(
      next === 'archived'
        ? `« ${product.name} » archivé. Il n’apparaît plus en caisse.`
        : `« ${product.name} » restauré.`,
      {
        action: { label: 'Annuler', run: () => setStatusOf(product, product.status) },
      },
    );
  };

  const references = demo.products.reduce((sum, product) => sum + product.variants.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description={`${demo.products.length} produits · ${references} références en vente ou en stock`}
        actions={
          <>
            {can('categories') && (
              <a href="/app/categories" className="btn-quiet h-11 px-4">
                <Tags className="size-[1.125rem]" aria-hidden="true" />
                Catégories
              </a>
            )}
            {role.editCatalog && (
              <a href="/app/produits/fiche" className="btn-gold h-11 px-4">
                <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
                Nouveau produit
              </a>
            )}
          </>
        }
      />

      <section aria-label="Catalogue" className="app-card overflow-hidden">
        <div className="space-y-3 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Segmented
              selectOnMobile
              label="Catégorie"
              value={category}
              onChange={setCategory}
              options={[
                { id: 'all', label: 'Toutes' },
                ...categories.map((item) => ({ id: item.id, label: item.name })),
              ]}
            />
            <SearchInput
              label="Rechercher un produit"
              placeholder="Nom, sous-catégorie ou SKU"
              value={query}
              onChange={setQuery}
              className="flex-1 xl:max-w-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
            <SelectBox
              aria-label="Statut"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="xl:w-52"
            >
              <option value="active">Produits actifs</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archivés</option>
              <option value="all">Tous les statuts</option>
            </SelectBox>
            <SelectBox
              aria-label="Stock"
              value={stock}
              onChange={(event) => setStock(event.target.value as StockFilter)}
              className="xl:w-56"
            >
              <option value="all">Tout le stock</option>
              <option value="alert">À réapprovisionner</option>
              <option value="out">En rupture</option>
            </SelectBox>
          </div>
        </div>

        {demo.products.length === 0 ? (
          <EmptyState icon={Package} title="Votre catalogue est vide">
            <p>
              Ajoutez vos articles avec leur prix de vente, leur prix d’achat et leur stock. Ils seront aussitôt
              disponibles en caisse.
            </p>
            {role.editCatalog && (
              <a href="/app/produits/fiche" className="btn-gold mt-5 h-11 px-4">
                <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
                Ajouter mon premier produit
              </a>
            )}
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon={PackageSearch} title="Aucun produit ne correspond">
            Changez de catégorie ou retirez un filtre.
          </EmptyState>
        ) : (
          <>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="bg-sunken/60 text-xs font-semibold text-ink-mute">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Produit
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Référence
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Catégorie
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Prix de vente
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Stock
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Statut
                  </th>
                  {role.editCatalog && (
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((product) => {
                  const total = productStock(product);
                  const category = demo.categories.find((item) => item.id === product.cat);
                  return (
                    <tr key={product.id} className={product.status === 'archived' ? 'opacity-60' : ''}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <CategoryTile category={category} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{product.name}</p>
                            <p className="truncate text-xs text-ink-mute">{product.sub}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                        {product.variants.length > 1
                          ? `${product.variants.length} variantes`
                          : product.variants[0]?.sku}
                      </td>
                      <td className="px-3 py-3">
                        <CategoryLabel category={category} />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
                        {priceLabel(product)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2.5">
                          <span className="w-7 text-right font-bold text-ink tabular-nums">{formatNumber(total)}</span>
                          <StatusBadge kind="stock" status={stockStatus(total, product.min)} />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge kind="product" status={product.status} />
                      </td>
                      {role.editCatalog && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <a
                              href={`/app/produits/fiche?id=${product.id}`}
                              className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-sunken hover:text-ink"
                              aria-label={`Modifier ${product.name}`}
                              title="Modifier"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              onClick={() => archive(product)}
                              className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-sunken hover:text-ink"
                              aria-label={`${product.status === 'archived' ? 'Restaurer' : 'Archiver'} ${product.name}`}
                              title={product.status === 'archived' ? 'Restaurer' : 'Archiver'}
                            >
                              {product.status === 'archived' ? (
                                <ArchiveRestore className="size-4" aria-hidden="true" />
                              ) : (
                                <Archive className="size-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-line lg:hidden">
              {visible.map((product) => {
                const total = productStock(product);
                const category = demo.categories.find((item) => item.id === product.cat);
                const content = (
                  <>
                    <CategoryTile category={category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{product.name}</p>
                      <p className="truncate text-sm text-ink-mute">
                        {priceLabel(product)}
                        {product.variants.length > 1 && ` · ${product.variants.length} variantes`}
                      </p>
                    </div>
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-bold text-ink tabular-nums">{total}</span>
                      <StatusBadge kind="stock" status={stockStatus(total, product.min)} />
                    </span>
                  </>
                );
                return (
                  <li key={product.id}>
                    {role.editCatalog ? (
                      <a
                        href={`/app/produits/fiche?id=${product.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-sunken/60"
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3.5">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      {region}
    </div>
  );
}
