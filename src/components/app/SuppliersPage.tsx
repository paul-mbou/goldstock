import { MapPin, PackagePlus, Phone, Plus, Trash2, Truck, UserRound } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { formatFcfa, formatNumber, formatWhen, type Supplier } from '../../data/dashboard';
import { flatItems, receiveGoods, saveSupplier, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import {
  Card,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SelectBox,
  Stepper,
  Tabs,
  inputClass,
  useQueryParam,
  useToasts,
} from './ui';

export default function SuppliersPage() {
  return (
    <Screen id="suppliers">
      <Suppliers />
    </Screen>
  );
}

type View = 'list' | 'reception' | 'history';

function Suppliers() {
  const { demo, member } = useSession();
  const [view, setView] = useState<View>('list');
  const [supplierId, setSupplierId] = useState('');
  const [creating, setCreating] = useState(false);
  const { notify, region } = useToasts();

  const presetTab = useQueryParam('onglet');
  useEffect(() => {
    if (presetTab === 'reception') setView('reception');
    if (presetTab === 'historique') setView('history');
  }, [presetTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        description="Vos fournisseurs et les marchandises reçues en boutique."
        actions={
          <>
            <button type="button" className="btn-quiet h-11 px-4" onClick={() => setCreating(true)}>
              <Plus className="size-[1.125rem]" aria-hidden="true" />
              <span className="sm:hidden">Fournisseur</span>
              <span className="hidden sm:inline">Nouveau fournisseur</span>
            </button>
            <button type="button" className="btn-gold h-11 px-4" onClick={() => setView('reception')}>
              <PackagePlus className="size-[1.125rem]" aria-hidden="true" />
              Réceptionner
            </button>
          </>
        }
      />

      <Tabs
        label="Fournisseurs"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'list', label: 'Fournisseurs', count: demo.suppliers.length },
          { id: 'reception', label: 'Nouvelle réception' },
          { id: 'history', label: 'Historique', count: demo.receptions.length },
        ]}
      />

      {view === 'list' && demo.suppliers.length === 0 && (
        <div className="app-card">
          <EmptyState icon={Truck} title="Aucun fournisseur">
            <p>
              Ajoutez les grossistes et importateurs chez qui vous achetez. Vous pourrez ensuite saisir chaque livraison
              : le stock et le prix d’achat se mettent à jour tout seuls.
            </p>
            <button type="button" className="btn-gold mt-5 h-11 px-4" onClick={() => setCreating(true)}>
              <Plus className="size-[1.125rem]" aria-hidden="true" />
              Ajouter un fournisseur
            </button>
          </EmptyState>
        </div>
      )}

      {view === 'list' && demo.suppliers.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {demo.suppliers.map((supplier) => {
            const last = demo.receptions.find((reception) => reception.supplier === supplier.name);
            return (
              <li key={supplier.id} className="app-card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700 dark:bg-white/5 dark:text-navy-100">
                    <Truck className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{supplier.name}</p>
                    <p className="text-sm text-ink-mute">{supplier.category}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Contact</dt>
                    <UserRound className="size-4 text-ink-mute" aria-hidden="true" />
                    <dd>{supplier.contact}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Téléphone</dt>
                    <Phone className="size-4 text-ink-mute" aria-hidden="true" />
                    <dd>
                      <a href={`tel:${supplier.phone.replace(/\s/g, '')}`} className="hover:text-ink hover:underline">
                        {supplier.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Ville</dt>
                    <MapPin className="size-4 text-ink-mute" aria-hidden="true" />
                    <dd>{supplier.city}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                  <div>
                    <p className="text-xs text-ink-mute">Achats cumulés</p>
                    <p className="font-extrabold text-ink tabular-nums">{formatFcfa(supplier.total)}</p>
                    <p className="text-xs text-ink-mute">
                      {last ? `Dernière réception : ${formatWhen(last.at)}` : 'Aucune réception'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-quiet h-9 px-3 text-sm"
                    onClick={() => {
                      setSupplierId(supplier.id);
                      setView('reception');
                    }}
                  >
                    Réceptionner
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view === 'reception' && (
        <ReceptionForm
          initialSupplier={supplierId}
          onDone={(id, qty) => {
            setView('history');
            setSupplierId('');
            notify(`Réception ${id} enregistrée : ${qty} article(s) ajouté(s) au stock.`);
          }}
          onCancel={() => setView('list')}
          userName={member.name}
        />
      )}

      {view === 'history' && <History />}

      <NewSupplierDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (draft) => {
          const result = await saveSupplier(draft, member.name);
          if (!result.ok) return;
          setCreating(false);
          setView('list');
          notify(`${result.value.name} ajouté à vos fournisseurs.`);
        }}
      />
      {region}
    </div>
  );
}

type Line = { vid: string; qty: number; cost: number };

function ReceptionForm({
  initialSupplier,
  onDone,
  onCancel,
  userName,
}: {
  initialSupplier: string;
  onDone: (id: string, qty: number) => void;
  onCancel: () => void;
  userName: string;
}) {
  const { demo, role } = useSession();
  const items = flatItems(demo, { activeOnly: false });
  const [supplierId, setSupplierId] = useState(initialSupplier || demo.suppliers[0]?.id || '');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState('');
  const [error, setError] = useState('');

  const presetItem = useQueryParam('article');
  useEffect(() => {
    if (!presetItem) return;
    const item = items.find((entry) => entry.variant.id === presetItem);
    if (!item) return;
    setLines((current) =>
      current.some((line) => line.vid === presetItem)
        ? current
        : [
            ...current,
            { vid: presetItem, qty: Math.max(1, item.product.min * 2 - item.variant.stock), cost: item.variant.cost },
          ],
    );
    const match = demo.suppliers.find((supplier) => supplier.category === item.category?.name);
    if (match && !initialSupplier) setSupplierId(match.id);
  }, [presetItem]);

  const addLine = (vid: string) => {
    const item = items.find((entry) => entry.variant.id === vid);
    if (!item || lines.some((line) => line.vid === vid)) return;
    setLines((current) => [...current, { vid, qty: 1, cost: item.variant.cost }]);
    setPicker('');
    setError('');
  };

  const update = (vid: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.vid === vid ? { ...line, ...patch } : line)));

  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
  const qty = lines.reduce((sum, line) => sum + line.qty, 0);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lines.length) return setError('Ajoutez au moins un article reçu.');
    const id = await receiveGoods({ supplierId, reference, lines }, userName);
    if (!id) return setError('La réception n’a pas pu être enregistrée. Réessayez.');
    onDone(id, qty);
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <Card title="Articles reçus" description="Les quantités s’ajoutent au stock dès la validation.">
        <div className="space-y-4">
          <SelectBox aria-label="Ajouter un article" value={picker} onChange={(event) => addLine(event.target.value)}>
            <option value="">+ Ajouter un article…</option>
            {demo.categories.map((category) => (
              <optgroup key={category.id} label={category.name}>
                {items
                  .filter(
                    (item) => item.product.cat === category.id && !lines.some((line) => line.vid === item.variant.id),
                  )
                  .map((item) => (
                    <option key={item.key} value={item.variant.id}>
                      {item.full} (stock {item.variant.stock})
                    </option>
                  ))}
              </optgroup>
            ))}
          </SelectBox>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {lines.length === 0 ? (
            <EmptyState icon={PackagePlus} title="Aucun article pour l’instant">
              Choisissez les articles du bon de livraison dans la liste ci-dessus.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {lines.map((line) => {
                const item = items.find((entry) => entry.variant.id === line.vid)!;
                return (
                  <li key={line.vid} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-semibold text-ink">{item.product.name}</p>
                      <p className="text-xs text-ink-mute">
                        {item.variant.label || item.variant.sku} · en stock : {item.variant.stock}
                      </p>
                    </div>
                    <Stepper
                      size="sm"
                      label={`Quantité reçue de ${item.full}`}
                      min={1}
                      value={line.qty}
                      onChange={(value) => update(line.vid, { qty: value })}
                    />
                    {role.costs && (
                      <label className="flex items-center gap-2 text-xs text-ink-mute">
                        Prix d’achat
                        <input
                          inputMode="numeric"
                          className="h-9 w-28 rounded-lg border border-line bg-panel px-2.5 text-right text-sm font-semibold text-ink tabular-nums focus:border-gold-500 focus:ring-4 focus:ring-gold-400/25 focus-visible:outline-none"
                          value={line.cost ? formatNumber(line.cost) : ''}
                          onChange={(event) =>
                            update(line.vid, { cost: Number(event.target.value.replace(/\D/g, '')) || 0 })
                          }
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      aria-label={`Retirer ${item.full}`}
                      onClick={() => setLines((current) => current.filter((entry) => entry.vid !== line.vid))}
                      className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card title="Bon de réception" className="lg:sticky lg:top-24">
        <div className="space-y-4">
          <FormField id="reception-supplier" label="Fournisseur">
            <SelectBox
              id="reception-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              {demo.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectBox>
          </FormField>
          <FormField id="reception-ref" label="N° de bon ou de facture" hint="Facultatif">
            <input
              id="reception-ref"
              className={inputClass()}
              placeholder="Ex. BL-7790"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </FormField>
          <dl className="space-y-2 rounded-xl bg-sunken p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-mute">Articles</dt>
              <dd className="font-semibold text-ink tabular-nums">{qty}</dd>
            </div>
            {role.costs && (
              <div className="flex justify-between">
                <dt className="text-ink-mute">Montant</dt>
                <dd className="font-extrabold text-ink tabular-nums">{formatFcfa(total)}</dd>
              </div>
            )}
          </dl>
          <div className="flex gap-2">
            <button type="button" className="btn-quiet h-11 flex-1 px-4" onClick={onCancel}>
              Annuler
            </button>
            <button type="submit" className="btn-gold h-11 flex-1 px-4">
              Valider
            </button>
          </div>
        </div>
      </Card>
    </form>
  );
}

function History() {
  const { demo, role } = useSession();
  if (!demo.receptions.length) {
    return (
      <div className="app-card">
        <EmptyState icon={Truck} title="Aucune réception">
          Les marchandises reçues apparaîtront ici.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="app-card overflow-hidden">
      <ul className="divide-y divide-line">
        {demo.receptions.map((reception) => (
          <li key={reception.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-semibold text-ink">
                {reception.supplier}
                <span className="ml-2 font-mono text-xs font-normal text-ink-mute">{reception.id}</span>
              </p>
              <p className="text-sm text-ink-mute">
                {formatWhen(reception.at)} · {reception.user}
                {reception.reference && ` · ${reception.reference}`}
              </p>
            </div>
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink tabular-nums">{reception.qty}</span> article(s) · {reception.lines}{' '}
              ligne(s)
            </p>
            {role.costs && (
              <p className="w-32 text-right font-extrabold text-ink tabular-nums">{formatFcfa(reception.total)}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const emptySupplier = { name: '', contact: '', phone: '', city: '', category: '' };

function NewSupplierDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: Omit<Supplier, 'id' | 'total'>) => void | Promise<void>;
}) {
  const { demo } = useSession();
  const [form, setForm] = useState(emptySupplier);
  const [error, setError] = useState('');
  const set = (key: keyof typeof emptySupplier) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError('Indiquez le nom du fournisseur.');
    await onCreate({
      name: form.name.trim(),
      contact: form.contact.trim() || '—',
      phone: form.phone.trim() || '—',
      city: form.city.trim() || 'Douala',
      category: form.category || demo.categories[0]?.name || '',
    });
    setForm(emptySupplier);
    setError('');
  };

  return (
    <Modal
      open={open}
      variant="sheet"
      onClose={onClose}
      title="Nouveau fournisseur"
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="new-supplier" className="btn-gold h-11 px-5">
            Ajouter
          </button>
        </>
      }
    >
      <form id="new-supplier" noValidate onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="supplier-name" label="Nom" error={error} className="sm:col-span-2">
          <input
            id="supplier-name"
            className={inputClass(Boolean(error))}
            placeholder="Ex. Ets Kamdem Distribution"
            value={form.name}
            onChange={set('name')}
          />
        </FormField>
        <FormField id="supplier-contact" label="Contact">
          <input id="supplier-contact" className={inputClass()} value={form.contact} onChange={set('contact')} />
        </FormField>
        <FormField id="supplier-phone" label="Téléphone">
          <input
            id="supplier-phone"
            type="tel"
            className={inputClass()}
            placeholder="+237 6XX XX XX XX"
            value={form.phone}
            onChange={set('phone')}
          />
        </FormField>
        <FormField id="supplier-city" label="Ville et quartier">
          <input
            id="supplier-city"
            className={inputClass()}
            placeholder="Douala, Akwa"
            value={form.city}
            onChange={set('city')}
          />
        </FormField>
        <FormField id="supplier-category" label="Catégorie fournie">
          <SelectBox id="supplier-category" value={form.category} onChange={set('category')}>
            {demo.categories.map((category) => (
              <option key={category.id}>{category.name}</option>
            ))}
          </SelectBox>
        </FormField>
      </form>
    </Modal>
  );
}
