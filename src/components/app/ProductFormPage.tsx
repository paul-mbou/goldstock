import { ArrowLeft, Layers } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import {
  SWATCHES,
  TODAY_START,
  formatFcfa,
  type AttrValue,
  type Attribute,
  type Product,
  type ProductStatus,
} from '../../data/dashboard';
import { logActivity, marginRate, saveProduct, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import { Card, CategoryTile, FormField, SelectBox, Switch, inputClass, textareaClass, useQueryParam } from './ui';

export default function ProductFormPage() {
  return (
    <Screen id="products">
      <ProductForm />
    </Screen>
  );
}

const slug = (text: string, length: number) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, length);

const toNumber = (value: string) => Number(value.replace(/\D/g, '')) || 0;

/** Every combination of the picked variant values, in attribute order. */
function combinations(attrs: Attribute[], picked: Record<string, string[]>) {
  return attrs
    .filter((item) => picked[item.id]?.length)
    .reduce<string[][]>((acc, item) => acc.flatMap((combo) => picked[item.id].map((value) => [...combo, value])), [[]])
    .filter((combo) => combo.length);
}

type Errors = Partial<Record<'name' | 'cat' | 'price' | string, string>>;

function ProductForm() {
  const { demo, business, role, member } = useSession();
  const editId = useQueryParam('id');
  const editing = editId ? demo.products.find((item) => item.id === editId) : undefined;
  const categories = demo.categories.filter((item) => !item.archived);

  const [name, setName] = useState('');
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [description, setDescription] = useState('');
  const [attrs, setAttrs] = useState<Record<string, AttrValue>>({});
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [rows, setRows] = useState<Record<string, { price: string; stock: string }>>({});
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [min, setMin] = useState('3');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [edits, setEdits] = useState<Record<string, { price: string; cost: string }>>({});
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setCat(editing.cat);
    setSub(editing.sub);
    setDescription(editing.description);
    setAttrs(editing.attrs);
    setMin(String(editing.min));
    setStatus(editing.status);
    setEdits(
      Object.fromEntries(
        editing.variants.map((variant) => [variant.id, { price: String(variant.price), cost: String(variant.cost) }]),
      ),
    );
  }, [editing?.id]);

  const category = categories.find((item) => item.id === cat) ?? demo.categories.find((item) => item.id === cat);
  const descriptive = category?.attrs.filter((item) => !item.variant) ?? [];
  const variantAttrs = category?.attrs.filter((item) => item.variant) ?? [];
  const combos = combinations(variantAttrs, picked);
  const skuBase = category ? `${category.code}-${slug(name, 4) || 'XXXX'}` : '';
  const skuOf = (combo: string[]) => [skuBase, ...combo.map((value) => slug(value, 3))].join('-');

  const chooseCategory = (id: string) => {
    setCat(id);
    setSub('');
    setAttrs({});
    setPicked({});
    setRows({});
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Donnez un nom au produit.';
    if (!cat) next.cat = 'Choisissez une catégorie.';
    for (const item of descriptive) {
      const value = attrs[item.id];
      if (item.required && (value === undefined || value === '' || (Array.isArray(value) && !value.length)))
        next[item.id] = `${item.name} est obligatoire pour cette catégorie.`;
    }
    if (!editing && !toNumber(price)) next.price = 'Indiquez le prix de vente.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`product-${Object.keys(next)[0]}`)?.focus();
      return;
    }

    const id = editing?.id ?? crypto.randomUUID();
    const baseCost = toNumber(cost);
    const variants = editing
      ? editing.variants.map((variant) => ({
          ...variant,
          price: toNumber(edits[variant.id]?.price ?? '') || variant.price,
          cost: toNumber(edits[variant.id]?.cost ?? '') || variant.cost,
        }))
      : combos.length
        ? combos.map((combo) => {
            const row = rows[combo.join(' · ')];
            return {
              id: crypto.randomUUID(),
              sku: skuOf(combo),
              label: combo.join(' · '),
              price: toNumber(row?.price ?? '') || toNumber(price),
              cost: baseCost,
              stock: toNumber(row?.stock ?? ''),
            };
          })
        : [
            {
              id: crypto.randomUUID(),
              sku: skuBase,
              label: '',
              price: toNumber(price),
              cost: baseCost,
              stock: toNumber(stock),
            },
          ];

    const saved: Product = {
      id,
      name: name.trim(),
      cat,
      sub,
      attrs,
      min: toNumber(min),
      status,
      description: description.trim(),
      variants,
      created: editing?.created ?? TODAY_START,
    };
    void saveProduct(saved, Boolean(editing)).then((result) => {
      if (result && 'ok' in result && result.ok === false) return;
      logActivity(member.name, `a ${editing ? 'modifié' : 'ajouté'} le produit ${saved.name}`, 'edit');
      window.location.href = `/app/produits?enregistre=${id}`;
    });
  };

  if (!role.editCatalog) {
    return (
      <p className="app-card p-6 text-ink-mute">Votre rôle permet de consulter le catalogue, pas de le modifier.</p>
    );
  }

  if (editId && !editing) {
    return (
      <div className="app-card p-6">
        <p className="font-bold text-ink">Produit introuvable</p>
        <a href="/app/produits" className="mt-3 inline-block text-sm font-semibold text-gold-700 dark:text-gold-300">
          Revenir au catalogue
        </a>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <div>
        <a
          href="/app/produits"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Produits
        </a>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          {editing ? editing.name : 'Nouveau produit'}
        </h1>
        <p className="mt-1 text-[0.9375rem] text-ink-mute">
          {editing
            ? 'Modifiez les informations et les prix. Les quantités se corrigent depuis la page Stock.'
            : `La catégorie choisie propose les bons champs : ${business.samples.fields}`}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card title="Informations">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField id="product-name" label="Nom du produit" error={errors.name} className="sm:col-span-2">
                <input
                  id="product-name"
                  className={inputClass(Boolean(errors.name))}
                  placeholder={business.samples.product}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>
              <div className="sm:col-span-2">
                <p id="product-cat-label" className="mb-1.5 text-sm font-semibold text-ink">
                  Catégorie
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="product-cat-label"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      id={item === categories[0] ? 'product-cat' : undefined}
                      type="button"
                      role="radio"
                      aria-checked={cat === item.id}
                      disabled={Boolean(editing)}
                      onClick={() => chooseCategory(item.id)}
                      className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 text-left text-sm font-semibold text-ink transition hover:border-navy-200 disabled:cursor-not-allowed disabled:opacity-60 aria-checked:border-gold-500 aria-checked:bg-gold-50 aria-checked:opacity-100 dark:hover:border-white/20 dark:aria-checked:bg-gold-400/10"
                    >
                      <CategoryTile category={item} size="sm" />
                      {item.name}
                    </button>
                  ))}
                </div>
                {errors.cat && (
                  <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">{errors.cat}</p>
                )}
              </div>
              {category && (
                <FormField id="product-sub" label="Sous-catégorie">
                  <SelectBox id="product-sub" value={sub} onChange={(event) => setSub(event.target.value)}>
                    <option value="">Aucune</option>
                    {category.subs.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </SelectBox>
                </FormField>
              )}
              <FormField id="product-description" label="Description (facultatif)" className="sm:col-span-2">
                <textarea
                  id="product-description"
                  rows={3}
                  className={textareaClass}
                  placeholder="Ce que le vendeur doit savoir pour bien conseiller le client."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </FormField>
            </div>
          </Card>

          {category && descriptive.length > 0 && (
            <Card title="Caractéristiques" description={`Les champs de la catégorie ${category.name}.`}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {descriptive.map((item) => (
                  <AttributeInput
                    key={item.id}
                    attribute={item}
                    value={attrs[item.id]}
                    error={errors[item.id]}
                    onChange={(value) => setAttrs((current) => ({ ...current, [item.id]: value }))}
                  />
                ))}
              </div>
            </Card>
          )}

          {category && !editing && (
            <Card
              title="Prix et stock"
              description={
                variantAttrs.length
                  ? `Cochez ce que vous avez en rayon (${variantAttrs.map((item) => item.name.toLowerCase()).join(', ')}) : chaque combinaison a son propre stock et sa référence.`
                  : undefined
              }
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <FormField id="product-price" label="Prix de vente (FCFA)" error={errors.price}>
                    <input
                      id="product-price"
                      inputMode="numeric"
                      className={inputClass(Boolean(errors.price))}
                      placeholder="Ex. 25 000"
                      value={price}
                      onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ''))}
                    />
                  </FormField>
                  {role.costs && (
                    <FormField
                      id="product-cost"
                      label="Prix d’achat (FCFA)"
                      hint={
                        toNumber(price) && toNumber(cost)
                          ? `Marge de ${marginRate(toNumber(price), toNumber(cost))} %`
                          : undefined
                      }
                    >
                      <input
                        id="product-cost"
                        inputMode="numeric"
                        className={inputClass()}
                        placeholder="Ex. 14 000"
                        value={cost}
                        onChange={(event) => setCost(event.target.value.replace(/[^\d]/g, ''))}
                      />
                    </FormField>
                  )}
                  {!combos.length && (
                    <FormField id="product-stock" label="Stock de départ">
                      <input
                        id="product-stock"
                        inputMode="numeric"
                        className={inputClass()}
                        placeholder="0"
                        value={stock}
                        onChange={(event) => setStock(event.target.value.replace(/[^\d]/g, ''))}
                      />
                    </FormField>
                  )}
                </div>

                {variantAttrs.map((item) => (
                  <fieldset key={item.id}>
                    <legend className="mb-2 text-sm font-semibold text-ink">{item.name}</legend>
                    <div className="flex flex-wrap gap-2">
                      {item.options.map((option) => {
                        const on = picked[item.id]?.includes(option) ?? false;
                        return (
                          <OptionChip
                            key={option}
                            label={option}
                            swatch={item.type === 'color' ? SWATCHES[option] : undefined}
                            pressed={on}
                            onToggle={() =>
                              setPicked((current) => ({
                                ...current,
                                [item.id]: on
                                  ? current[item.id].filter((value) => value !== option)
                                  : [...(current[item.id] ?? []), option],
                              }))
                            }
                          />
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                {combos.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-line">
                    <div className="flex items-center gap-2 border-b border-line bg-sunken/60 px-4 py-2.5 text-sm font-semibold text-ink">
                      <Layers className="size-4 text-ink-mute" aria-hidden="true" />
                      {combos.length} variante{combos.length > 1 ? 's' : ''}
                    </div>
                    <ul className="divide-y divide-line">
                      {combos.map((combo) => {
                        const key = combo.join(' · ');
                        const row = rows[key] ?? { price: '', stock: '' };
                        return (
                          <li
                            key={key}
                            className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_7rem] sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-ink">{key}</p>
                              <p className="truncate font-mono text-xs text-ink-mute">{skuOf(combo)}</p>
                            </div>
                            <input
                              aria-label={`Prix de ${key}`}
                              inputMode="numeric"
                              className={inputClass()}
                              placeholder={price ? formatFcfa(toNumber(price)) : 'Prix'}
                              value={row.price}
                              onChange={(event) =>
                                setRows((current) => ({
                                  ...current,
                                  [key]: { ...row, price: event.target.value.replace(/[^\d]/g, '') },
                                }))
                              }
                            />
                            <input
                              aria-label={`Stock de départ de ${key}`}
                              inputMode="numeric"
                              className={inputClass()}
                              placeholder="Stock"
                              value={row.stock}
                              onChange={(event) =>
                                setRows((current) => ({
                                  ...current,
                                  [key]: { ...row, stock: event.target.value.replace(/[^\d]/g, '') },
                                }))
                              }
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {editing && (
            <Card
              title="Prix"
              description="Le stock de chaque variante se corrige depuis la page Stock."
              bodyClassName=""
            >
              <ul className="divide-y divide-line border-t border-line">
                {editing.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="grid grid-cols-1 gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_5rem] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{variant.label || 'Standard'}</p>
                      <p className="truncate font-mono text-xs text-ink-mute">{variant.sku}</p>
                    </div>
                    <input
                      aria-label={`Prix de vente de ${variant.label || editing.name}`}
                      inputMode="numeric"
                      className={inputClass()}
                      value={edits[variant.id]?.price ?? ''}
                      onChange={(event) =>
                        setEdits((current) => ({
                          ...current,
                          [variant.id]: { ...current[variant.id], price: event.target.value.replace(/[^\d]/g, '') },
                        }))
                      }
                    />
                    {role.costs ? (
                      <input
                        aria-label={`Prix d’achat de ${variant.label || editing.name}`}
                        inputMode="numeric"
                        className={inputClass()}
                        value={edits[variant.id]?.cost ?? ''}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [variant.id]: { ...current[variant.id], cost: event.target.value.replace(/[^\d]/g, '') },
                          }))
                        }
                      />
                    ) : (
                      <span />
                    )}
                    <p className="text-sm text-ink-mute sm:text-right">
                      <span className="font-bold text-ink tabular-nums">{variant.stock}</span> en stock
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <Card title="Publication">
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="sr-only">Statut</legend>
                {(
                  [
                    ['active', 'Actif', 'Visible en caisse dès l’enregistrement.'],
                    ['draft', 'Brouillon', 'Enregistré, mais pas encore en vente.'],
                  ] as const
                ).map(([id, label, text]) => (
                  <label
                    key={id}
                    className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === id}
                      onChange={() => setStatus(id)}
                      className="mt-1 accent-gold-500"
                    />
                    <span>
                      <span className="block text-sm font-bold text-ink">{label}</span>
                      <span className="block text-sm text-ink-mute">{text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <FormField
                id="product-min"
                label="Seuil d’alerte"
                hint="Une alerte s’affiche quand une variante descend à ce niveau."
              >
                <input
                  id="product-min"
                  inputMode="numeric"
                  className={inputClass()}
                  value={min}
                  onChange={(event) => setMin(event.target.value.replace(/[^\d]/g, ''))}
                />
              </FormField>
              <div className="flex gap-2.5">
                <a href="/app/produits" className="btn-quiet h-11 flex-1 px-4">
                  Annuler
                </a>
                <button type="submit" className="btn-gold h-11 flex-1 px-4">
                  Enregistrer
                </button>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function OptionChip({
  label,
  swatch,
  pressed,
  onToggle,
}: {
  label: string;
  swatch?: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3.5 text-sm font-semibold text-ink-soft transition hover:border-navy-200 aria-pressed:border-gold-500 aria-pressed:bg-gold-50 aria-pressed:text-ink dark:hover:border-white/20 dark:aria-pressed:bg-gold-400/10"
    >
      {swatch && (
        <span
          className="size-3.5 rounded-full ring-1 ring-navy-900/15 dark:ring-white/20"
          style={{ background: swatch }}
        />
      )}
      {label}
    </button>
  );
}

function AttributeInput({
  attribute,
  value,
  error,
  onChange,
}: {
  attribute: Attribute;
  value: AttrValue | undefined;
  error?: string;
  onChange: (value: AttrValue) => void;
}) {
  const id = `product-${attribute.id}`;
  const label = (
    <>
      {attribute.name}
      {!attribute.required && <span className="font-normal text-ink-mute"> (facultatif)</span>}
    </>
  );

  if (attribute.type === 'yesno') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
        <span id={id} className="text-sm font-semibold text-ink">
          {attribute.name}
        </span>
        <Switch checked={value === true} onChange={onChange} labelledBy={id} />
      </div>
    );
  }

  if (attribute.type === 'multi' || attribute.type === 'color') {
    const selected = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
    const options = [...attribute.options, ...selected.filter((item) => !attribute.options.includes(item))];
    return (
      <fieldset className="sm:col-span-2">
        <legend id={id} tabIndex={-1} className="mb-1.5 text-sm font-semibold text-ink">
          {label}
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const on = selected.includes(option);
            return (
              <OptionChip
                key={option}
                label={option}
                swatch={attribute.type === 'color' ? SWATCHES[option] : undefined}
                pressed={on}
                onToggle={() => {
                  if (attribute.type === 'color') onChange(on ? '' : option);
                  else onChange(on ? selected.filter((item) => item !== option) : [...selected, option]);
                }}
              />
            );
          })}
        </div>
        {error && <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      </fieldset>
    );
  }

  const text = typeof value === 'string' ? value : '';
  const options = text && !attribute.options.includes(text) ? [...attribute.options, text] : attribute.options;
  return (
    <FormField id={id} label={label} error={error} hint={attribute.hint}>
      {attribute.type === 'list' ? (
        <SelectBox id={id} value={text} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choisir…</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectBox>
      ) : (
        <input
          id={id}
          type={attribute.type === 'date' ? 'date' : 'text'}
          inputMode={attribute.type === 'number' ? 'numeric' : undefined}
          className={inputClass(Boolean(error))}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormField>
  );
}
