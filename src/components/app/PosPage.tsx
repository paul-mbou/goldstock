import {
  Banknote,
  Check,
  Landmark,
  MessageCircle,
  PackageSearch,
  Printer,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PAYMENTS,
  SHOPS,
  formatFcfa,
  formatFullDate,
  formatTime,
  payLabel,
  saleGross,
  saleNet,
  type PayId,
  type Sale,
  type Shop,
} from '../../data/dashboard';
import { flatItems, recordSale, useSession, type Item } from '../../lib/demo';
import { normalize } from './Topbar';
import { Screen } from './Screen';
import {
  CategoryTile,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  SelectBox,
  Stepper,
  inputClass,
} from './ui';

type CartLine = { vid: string; qty: number };
type DiscountMode = 'pct' | 'amount';

export default function PosPage() {
  return (
    <Screen id="pos">
      <Pos />
    </Screen>
  );
}

function Pos() {
  const { demo, member, role } = useSession();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [chosenShop, setChosenShop] = useState<Shop>('Akwa');
  const [customer, setCustomer] = useState('');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('pct');
  const [discountInput, setDiscountInput] = useState('');
  const [paying, setPaying] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const shop = member.shop === 'Toutes' ? chosenShop : member.shop;
  const items = useMemo(() => flatItems(demo), [demo]);
  const byId = useMemo(() => new Map(items.map((item) => [item.variant.id, item])), [items]);
  const categories = demo.categories.filter((item) => !item.archived);

  const q = normalize(query.trim());
  const visible = items.filter(
    (item) =>
      (category === 'all' || item.product.cat === category) &&
      (!q || normalize(`${item.full} ${item.variant.sku}`).includes(q)),
  );

  const lines = cart.flatMap((line) => {
    const item = byId.get(line.vid);
    return item ? [{ ...line, item }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.item.variant.price * line.qty, 0);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const rawDiscount = Number(discountInput.replace(/\D/g, '')) || 0;
  const discount = Math.min(
    subtotal,
    discountMode === 'pct' ? Math.round((subtotal * rawDiscount) / 100) : rawDiscount,
  );
  const discountPct = subtotal ? (discount / subtotal) * 100 : 0;
  const discountError =
    discountPct > role.maxDiscount ? `Votre rôle autorise une remise de ${role.maxDiscount} % au maximum.` : '';
  const total = subtotal - discount;
  const allowNegative = demo.settings.negativeStock;

  const add = (item: Item) => {
    setCart((current) => {
      const existing = current.find((line) => line.vid === item.variant.id);
      const qty = (existing?.qty ?? 0) + 1;
      if (!allowNegative && qty > item.variant.stock) return current;
      return existing
        ? current.map((line) => (line.vid === item.variant.id ? { ...line, qty } : line))
        : [...current, { vid: item.variant.id, qty: 1 }];
    });
  };
  const setQty = (vid: string, qty: number) =>
    setCart((current) =>
      qty <= 0
        ? current.filter((line) => line.vid !== vid)
        : current.map((line) => (line.vid === vid ? { ...line, qty } : line)),
    );

  const reset = () => {
    setCart([]);
    setCustomer('');
    setDiscountInput('');
  };

  const cartPanel = (
    <CartPanel
      lines={lines}
      count={count}
      subtotal={subtotal}
      discount={discount}
      total={total}
      customer={customer}
      onCustomer={setCustomer}
      discountMode={discountMode}
      onDiscountMode={setDiscountMode}
      discountInput={discountInput}
      onDiscountInput={setDiscountInput}
      discountError={discountError}
      maxDiscount={role.maxDiscount}
      allowNegative={allowNegative}
      onQty={setQty}
      onClear={reset}
      onPay={() => {
        setCartOpen(false);
        setPaying(true);
      }}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caisse"
        description={`${member.name} · boutique ${shop}`}
        actions={
          member.shop === 'Toutes' && (
            <SelectBox
              aria-label="Boutique"
              value={chosenShop}
              onChange={(event) => setChosenShop(event.target.value as Shop)}
              className="w-48"
            >
              {SHOPS.map((name) => (
                <option key={name} value={name}>
                  Boutique {name}
                </option>
              ))}
            </SelectBox>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="Articles" className="space-y-4">
          <SearchInput
            label="Rechercher un article"
            placeholder="Nom, variante ou référence (SKU)"
            value={query}
            onChange={setQuery}
          />
          <Segmented
            label="Catégorie"
            value={category}
            onChange={setCategory}
            options={[{ id: 'all', label: 'Tout' }, ...categories.map((item) => ({ id: item.id, label: item.name }))]}
          />

          {visible.length === 0 ? (
            <div className="app-card">
              <EmptyState icon={PackageSearch} title="Aucun article trouvé">
                Vérifiez l’orthographe ou cherchez par référence.
              </EmptyState>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {visible.map((item) => {
                const inCart = cart.find((line) => line.vid === item.variant.id)?.qty ?? 0;
                const out = item.variant.stock <= 0;
                const low = !out && item.variant.stock <= item.product.min;
                const full = !allowNegative && inCart >= item.variant.stock;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => add(item)}
                      disabled={full}
                      className={`relative flex h-full w-full flex-col rounded-2xl border bg-panel p-3 text-left transition ${
                        inCart
                          ? 'border-gold-400 ring-2 ring-gold-400/30'
                          : 'border-line hover:border-navy-200 hover:shadow-card dark:hover:border-white/20'
                      } disabled:cursor-not-allowed ${out ? 'opacity-55' : ''}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <CategoryTile category={item.category} />
                        {inCart > 0 && (
                          <span className="grid size-6 place-items-center rounded-full bg-gold-500 text-xs font-bold text-navy-950">
                            {inCart}
                            <span className="sr-only"> dans le panier</span>
                          </span>
                        )}
                      </span>
                      <span className="mt-3 line-clamp-2 text-sm font-semibold text-ink">{item.product.name}</span>
                      <span className="mt-0.5 truncate text-xs text-ink-mute">{item.variant.label || 'Standard'}</span>
                      <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <span className="text-sm font-bold text-ink tabular-nums">
                          {formatFcfa(item.variant.price)}
                        </span>
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            out
                              ? 'text-red-600 dark:text-red-300'
                              : low
                                ? 'text-gold-700 dark:text-gold-300'
                                : 'text-ink-mute'
                          }`}
                        >
                          {out ? 'Rupture' : `${item.variant.stock} dispo.`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-label="Panier" className="hidden lg:sticky lg:top-24 lg:block">
          {cartPanel}
        </aside>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-4 bottom-20 z-20 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="btn-gold h-14 w-full justify-between px-5 shadow-2xl"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingCart className="size-5" aria-hidden="true" />
              Panier · {count} article{count > 1 ? 's' : ''}
            </span>
            <span className="tabular-nums">{formatFcfa(total)}</span>
          </button>
        </div>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Panier" variant="sheet">
        {cartPanel}
      </Modal>

      <PaymentDialog
        open={paying}
        total={total}
        onClose={() => setPaying(false)}
        onConfirm={({ pay, received, reference }) => {
          const sale = recordSale({
            shop,
            seller: member.name,
            customer,
            lines: cart,
            discount,
            pay,
            received,
            reference,
          });
          setPaying(false);
          setReceipt(sale);
          reset();
        }}
      />

      <ReceiptDialog sale={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ cart */

function CartPanel({
  lines,
  count,
  subtotal,
  discount,
  total,
  customer,
  onCustomer,
  discountMode,
  onDiscountMode,
  discountInput,
  onDiscountInput,
  discountError,
  maxDiscount,
  allowNegative,
  onQty,
  onClear,
  onPay,
}: {
  lines: (CartLine & { item: Item })[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  customer: string;
  onCustomer: (value: string) => void;
  discountMode: DiscountMode;
  onDiscountMode: (value: DiscountMode) => void;
  discountInput: string;
  onDiscountInput: (value: string) => void;
  discountError: string;
  maxDiscount: number;
  allowNegative: boolean;
  onQty: (vid: string, qty: number) => void;
  onClear: () => void;
  onPay: () => void;
}) {
  const [discountOpen, setDiscountOpen] = useState(false);

  return (
    <div className="app-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="font-bold text-ink">
          Panier{' '}
          <span className="font-normal text-ink-mute">
            · {count} article{count > 1 ? 's' : ''}
          </span>
        </h2>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-mute transition hover:bg-sunken hover:text-ink"
          >
            Vider
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Panier vide">
          Touchez un article pour l’ajouter.
        </EmptyState>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
          {lines.map(({ vid, qty, item }) => (
            <li key={vid} className="flex gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{item.product.name}</p>
                <p className="truncate text-xs text-ink-mute">
                  {item.variant.label ? `${item.variant.label} · ` : ''}
                  {formatFcfa(item.variant.price)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Stepper
                    size="sm"
                    label={`Quantité de ${item.full}`}
                    value={qty}
                    min={1}
                    max={allowNegative ? 99 : item.variant.stock}
                    onChange={(value) => onQty(vid, value)}
                  />
                  <button
                    type="button"
                    onClick={() => onQty(vid, 0)}
                    aria-label={`Retirer ${item.full}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-mute transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-bold text-ink tabular-nums">{formatFcfa(item.variant.price * qty)}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4 border-t border-line px-5 py-4">
        <FormField id="pos-customer" label="Client (facultatif)">
          <input
            id="pos-customer"
            className={inputClass()}
            placeholder="Nom ou téléphone"
            value={customer}
            onChange={(event) => onCustomer(event.target.value)}
          />
        </FormField>

        {maxDiscount > 0 &&
          (discountOpen || discountInput ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="pos-discount" className="text-sm font-semibold text-ink">
                  Remise
                </label>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-lg text-ink-mute hover:bg-sunken hover:text-ink"
                  aria-label="Retirer la remise"
                  onClick={() => {
                    onDiscountInput('');
                    setDiscountOpen(false);
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  id="pos-discount"
                  inputMode="numeric"
                  className={inputClass(Boolean(discountError))}
                  placeholder={discountMode === 'pct' ? 'Ex. 5' : 'Ex. 2 000'}
                  value={discountInput}
                  onChange={(event) => onDiscountInput(event.target.value.replace(/[^\d]/g, ''))}
                  aria-describedby={discountError ? 'pos-discount-error' : undefined}
                />
                <Segmented
                  label="Type de remise"
                  value={discountMode}
                  onChange={onDiscountMode}
                  options={[
                    { id: 'pct', label: '%' },
                    { id: 'amount', label: 'FCFA' },
                  ]}
                />
              </div>
              {discountError && (
                <p id="pos-discount-error" className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  {discountError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300"
              onClick={() => setDiscountOpen(true)}
            >
              + Ajouter une remise
            </button>
          ))}

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Sous-total</dt>
            <dd className="tabular-nums">{formatFcfa(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <dt>Remise</dt>
              <dd className="tabular-nums">− {formatFcfa(discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1.5">
            <dt className="font-bold text-ink">Total</dt>
            <dd className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">{formatFcfa(total)}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="btn-gold h-12 w-full"
          disabled={!lines.length || Boolean(discountError)}
          onClick={onPay}
        >
          <Banknote className="size-5" aria-hidden="true" />
          Encaisser
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ payment */

const payIcons: Record<PayId, LucideIcon> = { cash: Banknote, mtn: Smartphone, om: Smartphone, transfer: Landmark };

function PaymentDialog({
  open,
  total,
  onClose,
  onConfirm,
}: {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payment: { pay: PayId; received: number; reference: string }) => void;
}) {
  const [pay, setPay] = useState<PayId>('cash');
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const receivedValue = Number(received.replace(/\D/g, '')) || 0;
  const change = receivedValue - total;
  const quick = Array.from(
    new Set([total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]),
  );

  const close = () => {
    setReceived('');
    setReference('');
    setError('');
    onClose();
  };

  const confirm = () => {
    if (pay === 'cash' && receivedValue && receivedValue < total) {
      setError(`Le client doit donner au moins ${formatFcfa(total)}.`);
      return;
    }
    onConfirm({ pay, received: pay === 'cash' ? receivedValue || total : 0, reference });
    setReceived('');
    setReference('');
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Encaissement"
      description="Choisissez le moyen de paiement du client."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={close}>
            Retour
          </button>
          <button type="button" className="btn-gold h-11 px-5" onClick={confirm}>
            <Check className="size-[1.125rem]" aria-hidden="true" />
            Valider {formatFcfa(total)}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-sunken px-5 py-4 text-center">
          <p className="text-sm text-ink-mute">Total à payer</p>
          <p className="mt-0.5 text-3xl font-extrabold tracking-tight text-ink tabular-nums">{formatFcfa(total)}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Moyen de paiement</legend>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENTS.map((method) => {
              const Icon = payIcons[method.id];
              return (
                <label
                  key={method.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 has-focus-visible:ring-4 has-focus-visible:ring-gold-400/25 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
                >
                  <input
                    type="radio"
                    name="pay"
                    className="sr-only"
                    checked={pay === method.id}
                    onChange={() => {
                      setPay(method.id);
                      setError('');
                    }}
                  />
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: method.color }}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-ink">{method.short}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {pay === 'cash' ? (
          <div>
            <FormField id="pay-received" label="Montant reçu" error={error}>
              <input
                id="pay-received"
                inputMode="numeric"
                className={inputClass(Boolean(error))}
                placeholder={formatFcfa(total)}
                value={received}
                onChange={(event) => {
                  setReceived(event.target.value.replace(/[^\d]/g, ''));
                  setError('');
                }}
              />
            </FormField>
            <div className="mt-2 flex flex-wrap gap-2">
              {quick.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setReceived(String(amount))}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft tabular-nums transition hover:bg-sunken hover:text-ink"
                >
                  {formatFcfa(amount)}
                </button>
              ))}
            </div>
            {receivedValue >= total && (
              <p className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-400/10">
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">Monnaie à rendre</span>
                <span className="text-lg font-extrabold text-emerald-800 tabular-nums dark:text-emerald-200">
                  {formatFcfa(change)}
                </span>
              </p>
            )}
          </div>
        ) : (
          <FormField
            id="pay-reference"
            label="Référence de la transaction (facultatif)"
            hint={pay === 'transfer' ? 'Numéro du virement.' : 'Le code reçu par SMS après le paiement.'}
          >
            <input
              id="pay-reference"
              className={inputClass()}
              placeholder={pay === 'transfer' ? 'Ex. VIR-2026-0412' : 'Ex. MP261023.1432.A1234'}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </FormField>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ receipt */

export function ReceiptDialog({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { demo } = useSession();
  if (!sale) return null;
  const total = saleNet(sale);
  const text = [
    `${demo.settings.shopName} · ${sale.shop}`,
    `Reçu ${sale.id} du ${formatFullDate(sale.at).toLowerCase()} à ${formatTime(sale.at)}`,
    ...sale.lines.map(
      (line) =>
        `${line.qty} × ${line.name}${line.label ? ` (${line.label})` : ''} : ${formatFcfa(line.price * line.qty)}`,
    ),
    sale.discount ? `Remise : −${formatFcfa(sale.discount)}` : '',
    `Total : ${formatFcfa(total)} (${payLabel(sale.pay)})`,
    demo.settings.receiptMessage,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Modal
      open
      onClose={onClose}
      title="Vente encaissée"
      description={`${sale.id} · ${formatFcfa(total)} · ${payLabel(sale.pay)}`}
      footer={
        <>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-quiet mr-auto h-11 px-4"
          >
            <MessageCircle className="size-[1.125rem]" aria-hidden="true" />
            WhatsApp
          </a>
          <button type="button" className="btn-quiet h-11 px-4" onClick={() => window.print()}>
            <Printer className="size-[1.125rem]" aria-hidden="true" />
            Imprimer
          </button>
          <button type="button" className="btn-gold h-11 px-5" onClick={onClose}>
            Nouvelle vente
          </button>
        </>
      }
    >
      <Receipt sale={sale} />
    </Modal>
  );
}

export function Receipt({ sale }: { sale: Sale }) {
  const { demo } = useSession();
  const total = saleNet(sale);
  return (
    <div
      data-print
      className="mx-auto max-w-xs rounded-xl border border-dashed border-line bg-white px-5 py-6 font-mono text-[0.8125rem] leading-relaxed text-navy-900"
    >
      <p className="text-center text-base font-bold">{demo.settings.shopName}</p>
      <p className="text-center text-xs">
        {sale.shop} · {demo.settings.addresses[sale.shop]}
      </p>
      <p className="text-center text-xs">{demo.settings.phone}</p>
      <div className="my-3 border-t border-dashed border-navy-300" />
      <p>
        Reçu {sale.id} · {formatTime(sale.at)}
      </p>
      <p>Vendeur : {sale.seller}</p>
      {sale.customer && <p>Client : {sale.customer}</p>}
      <div className="my-3 border-t border-dashed border-navy-300" />
      <ul className="space-y-1.5">
        {sale.lines.map((line) => (
          <li key={line.vid}>
            <p>
              {line.name}
              {line.label && <span className="text-navy-500"> · {line.label}</span>}
            </p>
            <p className="flex justify-between">
              <span>
                {line.qty} × {formatFcfa(line.price)}
              </span>
              <span>{formatFcfa(line.qty * line.price)}</span>
            </p>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-navy-300" />
      {sale.discount > 0 && (
        <>
          <p className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatFcfa(saleGross(sale))}</span>
          </p>
          <p className="flex justify-between">
            <span>Remise</span>
            <span>−{formatFcfa(sale.discount)}</span>
          </p>
        </>
      )}
      <p className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatFcfa(total)}</span>
      </p>
      <p className="flex justify-between">
        <span>{payLabel(sale.pay)}</span>
        <span>{formatFcfa(sale.pay === 'cash' ? sale.received || total : total)}</span>
      </p>
      {sale.pay === 'cash' && sale.received > total && (
        <p className="flex justify-between">
          <span>Monnaie rendue</span>
          <span>{formatFcfa(sale.received - total)}</span>
        </p>
      )}
      {sale.reference && <p>Réf. {sale.reference}</p>}
      <div className="my-3 border-t border-dashed border-navy-300" />
      <p className="text-center text-xs">{demo.settings.receiptMessage}</p>
    </div>
  );
}
