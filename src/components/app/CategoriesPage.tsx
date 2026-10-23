import { Archive, ArchiveRestore, ChevronRight, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { ATTR_TYPES, type AttrType, type Category, type CategoryIcon, type Tone } from '../../data/dashboard';
import { logActivity, setDemo, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import {
  Badge,
  Card,
  CategoryTile,
  FormField,
  Modal,
  PageHeader,
  Switch,
  categoryIcons,
  inputClass,
  toneStyles,
  useToasts,
} from './ui';

export default function CategoriesPage() {
  return (
    <Screen id="categories">
      <Categories />
    </Screen>
  );
}

const withOptions: AttrType[] = ['list', 'multi', 'color'];
const canVary: AttrType[] = ['list', 'color'];

function updateCategory(id: string, patch: (category: Category) => Category) {
  setDemo((demo) => ({
    ...demo,
    categories: demo.categories.map((category) => (category.id === id ? patch(category) : category)),
  }));
}

function Categories() {
  const { demo, role, member } = useSession();
  const [selectedId, setSelectedId] = useState(demo.categories[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const { notify, region } = useToasts();
  const selected = demo.categories.find((category) => category.id === selectedId) ?? demo.categories[0];
  const productCount = (id: string) => demo.products.filter((product) => product.cat === id).length;
  const editable = role.editCatalog;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories"
        description="Chaque catégorie définit les champs proposés à la création d’un produit."
        actions={
          editable && (
            <button type="button" className="btn-gold h-11 px-4" onClick={() => setCreating(true)}>
              <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
              Nouvelle catégorie
            </button>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Catégories" className="app-card p-2">
          <ul className="space-y-1">
            {demo.categories.map((category) => {
              const active = category.id === selected?.id;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setSelectedId(category.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                      active
                        ? 'bg-gold-50 ring-1 ring-gold-300 dark:bg-gold-400/10 dark:ring-gold-400/30'
                        : 'hover:bg-sunken'
                    } ${category.archived ? 'opacity-55' : ''}`}
                  >
                    <CategoryTile category={category} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{category.name}</span>
                      <span className="block text-xs text-ink-mute">
                        {category.archived
                          ? 'Archivée'
                          : `${productCount(category.id)} produits · ${category.attrs.length} caractéristiques`}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-ink-mute" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {selected && (
          <div className="space-y-6">
            <CategoryHeader
              key={selected.id}
              category={selected}
              editable={editable}
              onRename={(name) => {
                updateCategory(selected.id, (category) => ({ ...category, name }));
                notify(`Catégorie renommée en « ${name} ».`);
              }}
              onArchive={() => {
                updateCategory(selected.id, (category) => ({ ...category, archived: !category.archived }));
                logActivity(
                  member.name,
                  `a ${selected.archived ? 'restauré' : 'archivé'} la catégorie ${selected.name}`,
                  'edit',
                );
                notify(
                  selected.archived ? `${selected.name} est de nouveau disponible.` : `${selected.name} est archivée.`,
                );
              }}
            />
            <Attributes category={selected} editable={editable} onNotify={notify} />
          </div>
        )}
      </div>

      <NewCategoryDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(category) => {
          setDemo((demo) => ({ ...demo, categories: [...demo.categories, category] }));
          logActivity(member.name, `a créé la catégorie ${category.name}`, 'edit');
          setSelectedId(category.id);
          setCreating(false);
          notify(`Catégorie « ${category.name} » créée. Ajoutez-lui ses caractéristiques.`);
        }}
      />
      {region}
    </div>
  );
}

function CategoryHeader({
  category,
  editable,
  onRename,
  onArchive,
}: {
  category: Category;
  editable: boolean;
  onRename: (name: string) => void;
  onArchive: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [sub, setSub] = useState('');

  const addSub = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = sub.trim();
    if (!value || category.subs.includes(value)) return;
    updateCategory(category.id, (item) => ({ ...item, subs: [...item.subs, value] }));
    setSub('');
  };

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <CategoryTile category={category} size="lg" />
        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim().length < 2) return;
              onRename(name.trim());
              setRenaming(false);
            }}
          >
            <input
              aria-label="Nom de la catégorie"
              className={inputClass()}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-gold h-11 px-4">
              OK
            </button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">{category.name}</h2>
            <p className="text-sm text-ink-mute">
              Préfixe des références : <span className="font-mono font-semibold text-ink-soft">{category.code}</span>
            </p>
          </div>
        )}
        {editable && !renaming && (
          <div className="flex gap-2">
            <button type="button" className="btn-quiet h-10 px-3.5 text-sm" onClick={() => setRenaming(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              Renommer
            </button>
            <button type="button" className="btn-quiet h-10 px-3.5 text-sm" onClick={onArchive}>
              {category.archived ? (
                <ArchiveRestore className="size-4" aria-hidden="true" />
              ) : (
                <Archive className="size-4" aria-hidden="true" />
              )}
              {category.archived ? 'Restaurer' : 'Archiver'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-ink">Sous-catégories</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {category.subs.map((item) => (
            <li
              key={item}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-sunken pr-1 pl-3 text-sm font-semibold text-ink-soft"
            >
              {item}
              {editable && (
                <button
                  type="button"
                  aria-label={`Retirer ${item}`}
                  onClick={() =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      subs: current.subs.filter((value) => value !== item),
                    }))
                  }
                  className="grid size-6 place-items-center rounded-full text-ink-mute transition hover:bg-panel hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
          {!category.subs.length && <li className="text-sm text-ink-mute">Aucune sous-catégorie.</li>}
        </ul>
        {editable && (
          <form onSubmit={addSub} className="mt-3 flex max-w-md gap-2">
            <input
              aria-label="Nouvelle sous-catégorie"
              className={inputClass()}
              placeholder="Ex. Tablettes, Sacs, Parfums…"
              value={sub}
              onChange={(event) => setSub(event.target.value)}
            />
            <button type="submit" className="btn-navy h-11 px-4 dark:bg-white/10 dark:hover:bg-white/15">
              Ajouter
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}

function Attributes({
  category,
  editable,
  onNotify,
}: {
  category: Category;
  editable: boolean;
  onNotify: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AttrType>('list');
  const [options, setOptions] = useState('');
  const [variant, setVariant] = useState(false);
  const [required, setRequired] = useState(false);
  const [error, setError] = useState('');
  const typeLabel = (id: AttrType) => ATTR_TYPES.find((item) => item.id === id)!.label;

  const add = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = options
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (name.trim().length < 2) return setError('Donnez un nom à la caractéristique.');
    if (withOptions.includes(type) && values.length < 2)
      return setError('Indiquez au moins deux valeurs, séparées par des virgules.');
    updateCategory(category.id, (current) => ({
      ...current,
      attrs: [
        ...current.attrs,
        {
          id: `${current.id}_${Date.now().toString(36)}`,
          name: name.trim(),
          type,
          options: withOptions.includes(type) ? values : [],
          variant: canVary.includes(type) && variant,
          required,
        },
      ],
    }));
    onNotify(`« ${name.trim()} » ajoutée à ${category.name}.`);
    setName('');
    setOptions('');
    setVariant(false);
    setRequired(false);
    setError('');
  };

  return (
    <>
      <Card
        title="Caractéristiques"
        description="Les caractéristiques « variante » créent une ligne de stock et une référence par combinaison (pointure × couleur…)."
        bodyClassName="px-3 pb-3 sm:px-4 sm:pb-4"
      >
        <ul className="space-y-2">
          {category.attrs.map((attribute) => (
            <li
              key={attribute.id}
              className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {attribute.name}
                  <span className="ml-1.5 text-xs font-normal text-ink-mute">
                    {attribute.required ? 'Obligatoire' : 'Facultatif'}
                  </span>
                </p>
                <p className="truncate text-sm text-ink-mute">
                  {attribute.options.length ? attribute.options.join(' · ') : attribute.hint || 'Saisie libre'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{typeLabel(attribute.type)}</Badge>
                {attribute.variant ? (
                  <Badge tone="warning">
                    <Layers className="size-3" aria-hidden="true" />
                    Crée des variantes
                  </Badge>
                ) : (
                  <Badge tone="navy">Descriptive</Badge>
                )}
                {editable && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${attribute.name}`}
                    onClick={() => {
                      updateCategory(category.id, (current) => ({
                        ...current,
                        attrs: current.attrs.filter((item) => item.id !== attribute.id),
                      }));
                      onNotify(`« ${attribute.name} » retirée. Les produits existants gardent leur valeur.`);
                    }}
                    className="ml-auto grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-red-50 hover:text-red-600 sm:ml-0 dark:hover:bg-red-400/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
          {!category.attrs.length && (
            <li className="px-2 py-4 text-sm text-ink-mute">Aucune caractéristique pour l’instant.</li>
          )}
        </ul>
      </Card>

      {editable && (
        <Card title={`Ajouter une caractéristique à « ${category.name} »`}>
          <form noValidate onSubmit={add} className="space-y-5">
            <FormField id="attr-name" label="Nom" error={error}>
              <input
                id="attr-name"
                className={inputClass(Boolean(error))}
                placeholder="Ex. Garantie, Matière, Capacité de batterie"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Type de champ</legend>
              <div className="flex flex-wrap gap-2">
                {ATTR_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={type === item.id}
                    onClick={() => setType(item.id)}
                    className="h-9 rounded-full border border-line px-3.5 text-sm font-semibold text-ink-soft transition hover:border-navy-200 aria-pressed:border-navy-900 aria-pressed:bg-navy-900 aria-pressed:text-white dark:hover:border-white/20 dark:aria-pressed:border-gold-400 dark:aria-pressed:bg-gold-400 dark:aria-pressed:text-navy-950"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {withOptions.includes(type) && (
              <FormField id="attr-options" label="Valeurs possibles" hint="Séparées par des virgules.">
                <input
                  id="attr-options"
                  className={inputClass()}
                  placeholder="Ex. 6 mois, 12 mois, 24 mois"
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </FormField>
            )}
            {canVary.includes(type) && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-ink">Utilisation</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      [false, 'Descriptive', 'Information affichée sur la fiche (marque, matière…).'],
                      [true, 'Crée des variantes', 'Chaque valeur a son stock, sa référence et son prix.'],
                    ] as const
                  ).map(([value, label, text]) => (
                    <label
                      key={label}
                      className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
                    >
                      <input
                        type="radio"
                        name="attr-usage"
                        checked={variant === value}
                        onChange={() => setVariant(value)}
                        className="mt-1 accent-gold-500"
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink">{label}</span>
                        <span className="block text-sm text-ink-mute">{text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={required} onChange={setRequired} labelledBy="attr-required" />
              <span id="attr-required" className="text-sm font-semibold text-ink">
                Champ obligatoire
              </span>
            </div>
            <button type="submit" className="btn-gold h-11 px-5">
              <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
              Ajouter la caractéristique
            </button>
          </form>
        </Card>
      )}
    </>
  );
}

const iconChoices = Object.keys(categoryIcons) as CategoryIcon[];
const toneChoices = Object.keys(toneStyles) as Tone[];
const iconNames: Record<CategoryIcon, string> = {
  phone: 'téléphone',
  shoe: 'chaussure',
  shirt: 'vêtement',
  drop: 'goutte',
  tag: 'étiquette',
};
const toneNames: Record<Tone, string> = {
  gold: 'or',
  navy: 'bleu nuit',
  teal: 'turquoise',
  rose: 'rose',
  violet: 'violet',
};

function NewCategoryDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (category: Category) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon>('tag');
  const [tone, setTone] = useState<Tone>('violet');
  const [error, setError] = useState('');
  const code = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError('Donnez un nom à la catégorie.');
    onCreate({
      id: `c${Date.now().toString(36)}`,
      name: name.trim(),
      code: code || 'CAT',
      icon,
      tone,
      subs: [],
      attrs: [],
      archived: false,
    });
    setName('');
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle catégorie"
      description="Vous ajouterez ses caractéristiques juste après."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="new-category" className="btn-gold h-11 px-5">
            Créer la catégorie
          </button>
        </>
      }
    >
      <form id="new-category" noValidate onSubmit={submit} className="space-y-5">
        <FormField
          id="category-name"
          label="Nom"
          error={error}
          hint={code ? `Préfixe des références : ${code}` : undefined}
        >
          <input
            id="category-name"
            className={inputClass(Boolean(error))}
            placeholder="Ex. Sacs et accessoires"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Icône et couleur</legend>
          <div className="flex flex-wrap items-center gap-2">
            {iconChoices.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={icon === item}
                aria-label={`Icône ${iconNames[item]}`}
                onClick={() => setIcon(item)}
                className="rounded-xl p-0.5 ring-2 ring-transparent transition aria-pressed:ring-gold-500"
              >
                <CategoryTile category={{ icon: item, tone } as Category} />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {toneChoices.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={tone === item}
                aria-label={`Couleur ${toneNames[item]}`}
                onClick={() => setTone(item)}
                className="grid size-9 place-items-center rounded-full ring-2 ring-transparent transition aria-pressed:ring-gold-500"
              >
                <span className={`size-6 rounded-full ${toneStyles[item].dot}`} />
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
