import { Ban, FileText, Plus, Receipt as ReceiptIcon, SearchX, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DAY,
  PAYMENTS,
  TODAY_START,
  formatFcfa,
  formatFullDate,
  formatNumber,
  formatTime,
  formatWhen,
  payLabel,
  saleGross,
  saleItems,
  saleNet,
  saleState,
  type PayId,
  type Sale,
  type SaleState,
} from '../../data/dashboard';
import { returnItems, setSaleCancelled, summarize, useSession, visibleSales } from '../../lib/demo';
import { InvoiceDialog } from './Invoice';
import { Receipt } from './PosPage';
import { Screen } from './Screen';
import { normalize } from './Topbar';
import {
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  SelectBox,
  StatusBadge,
  Stepper,
  useLatest,
  useQueryParam,
  useToasts,
} from './ui';

type Range = 'today' | '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'ok' | 'returns' | 'cancelled';

const rangeStart: Record<Range, number> = {
  today: TODAY_START,
  '7d': TODAY_START - 6 * DAY,
  '30d': TODAY_START - 29 * DAY,
  all: 0,
};

const payColor = (id: PayId) => PAYMENTS.find((pay) => pay.id === id)!.color;

export default function SalesPage() {
  return (
    <Screen id="sales">
      <Sales />
    </Screen>
  );
}

function Sales() {
  const session = useSession();
  const { role, can, member, demo } = session;
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('7d');
  const [pay, setPay] = useState<'all' | PayId>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [shop, setShop] = useState('all');
  const [limit, setLimit] = useState(20);
  const [openId, setOpenId] = useState<string | null>(null);
  const { notify, region } = useToasts();

  const preset = useQueryParam('q');
  useEffect(() => {
    if (!preset) return;
    setQuery(preset);
    setRange('all');
    if (/^V-\d+$/i.test(preset)) setOpenId(preset.toUpperCase());
  }, [preset]);

  const q = normalize(query.trim());
  const matchesStatus = (state: SaleState) =>
    status === 'all' ||
    (status === 'ok' && state === 'ok') ||
    (status === 'returns' && (state === 'partial' || state === 'refunded')) ||
    (status === 'cancelled' && state === 'cancelled');

  const filtered = visibleSales(session).filter(
    (sale) =>
      sale.at >= rangeStart[range] &&
      (pay === 'all' || sale.pay === pay) &&
      (shop === 'all' || sale.shop === shop) &&
      matchesStatus(saleState(sale)) &&
      (!q ||
        normalize(
          `${sale.id} ${sale.customer} ${sale.seller} ${sale.lines.map((line) => line.name).join(' ')}`,
        ).includes(q)),
  );
  const totals = summarize(filtered);
  const shown = filtered.slice(0, limit);
  const opened = demo.sales.find((sale) => sale.id === openId) ?? null;

  useEffect(() => setLimit(20), [query, range, pay, status, shop]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        description={
          <>
            {formatNumber(totals.count)} vente{totals.count > 1 ? 's' : ''} · {formatFcfa(totals.revenue)} encaissés ·
            panier moyen {formatFcfa(totals.count ? totals.revenue / totals.count : 0)}
          </>
        }
        actions={
          can('pos') && (
            <a href="/app/caisse" className="btn-gold h-11 px-4 md:hidden">
              <Plus className="size-[1.125rem]" strokeWidth={2.5} aria-hidden="true" />
              Nouvelle vente
            </a>
          )
        }
      />

      <section aria-label="Historique des ventes" className="app-card overflow-hidden">
        <div className="space-y-3 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Segmented
              label="Période"
              value={range}
              onChange={setRange}
              options={[
                { id: 'today', label: 'Aujourd’hui' },
                { id: '7d', label: '7 jours' },
                { id: '30d', label: '30 jours' },
                { id: 'all', label: 'Tout' },
              ]}
            />
            <SearchInput
              label="Rechercher une vente"
              placeholder="N° de vente, client, vendeur ou article"
              value={query}
              onChange={setQuery}
              className="flex-1 xl:max-w-md"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex">
            <SelectBox
              aria-label="Moyen de paiement"
              value={pay}
              onChange={(event) => setPay(event.target.value as typeof pay)}
              className="xl:w-56"
            >
              <option value="all">Tous les paiements</option>
              {PAYMENTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.short}
                </option>
              ))}
            </SelectBox>
            <SelectBox
              aria-label="Statut"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="xl:w-52"
            >
              <option value="all">Tous les statuts</option>
              <option value="ok">Validées</option>
              <option value="returns">Retours</option>
              <option value="cancelled">Annulées</option>
            </SelectBox>
            {role.allSales && (
              <SelectBox
                aria-label="Boutique"
                value={shop}
                onChange={(event) => setShop(event.target.value)}
                className="xl:w-52"
              >
                <option value="all">Toutes les boutiques</option>
                {demo.shops.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </SelectBox>
            )}
          </div>
        </div>

        {visibleSales(session).length === 0 ? (
          <EmptyState icon={ReceiptIcon} title="Pas encore de vente">
            <p>Chaque vente encaissée en caisse s’affiche ici, avec son reçu, sa facture et ses retours éventuels.</p>
            {can('pos') && (
              <a href="/app/caisse" className="btn-gold mt-5 h-11 px-4">
                Ouvrir la caisse
              </a>
            )}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="Aucune vente ne correspond">
            Élargissez la période ou retirez un filtre.
          </EmptyState>
        ) : (
          <>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="bg-sunken/60 text-xs font-semibold text-ink-mute">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Vente
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Articles
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Vendeur
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Paiement
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((sale) => (
                  <tr
                    key={sale.id}
                    className="cursor-pointer transition hover:bg-sunken/60"
                    onClick={() => setOpenId(sale.id)}
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        className="font-semibold text-ink hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenId(sale.id);
                        }}
                      >
                        {sale.id}
                      </button>
                      <p className="text-xs text-ink-mute">{formatWhen(sale.at)}</p>
                    </td>
                    <td className="max-w-72 px-3 py-3.5">
                      <p className="truncate text-ink">
                        {sale.lines[0].name}
                        {sale.lines.length > 1 && <span className="text-ink-mute"> + {sale.lines.length - 1}</span>}
                      </p>
                      <p className="truncate text-xs text-ink-mute">{sale.customer || 'Client de passage'}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-ink">{sale.seller}</p>
                      <p className="text-xs text-ink-mute">{sale.shop}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-2 text-ink-soft">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: payColor(sale.pay) }}
                          aria-hidden="true"
                        />
                        {payLabel(sale.pay)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-ink tabular-nums">
                      {formatFcfa(saleNet(sale))}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge kind="sale" status={saleState(sale)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line lg:hidden">
              {shown.map((sale) => (
                <li key={sale.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(sale.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-sunken/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {sale.lines[0].name}
                        {sale.lines.length > 1 && (
                          <span className="font-normal text-ink-mute"> + {sale.lines.length - 1}</span>
                        )}
                      </p>
                      <p className="truncate text-sm text-ink-mute">
                        {sale.id} · {formatWhen(sale.at)} · {payLabel(sale.pay)}
                      </p>
                    </div>
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-bold text-ink tabular-nums">{formatFcfa(saleNet(sale))}</span>
                      {saleState(sale) !== 'ok' && <StatusBadge kind="sale" status={saleState(sale)} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-ink-mute">
                {shown.length} sur {formatNumber(filtered.length)} ventes
              </p>
              {shown.length < filtered.length && (
                <button type="button" className="btn-quiet h-10 px-4 text-sm" onClick={() => setLimit((n) => n + 20)}>
                  Afficher plus de ventes
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <SaleDetail
        sale={opened}
        canEdit={role.cancel}
        onClose={() => setOpenId(null)}
        onCancel={async (sale) => {
          const result = await setSaleCancelled(sale.id, true, member.name);
          if (!result.ok) return;
          notify(`Vente ${sale.id} annulée, articles remis en stock.`, {
            action: {
              label: 'Rétablir',
              run: () => {
                void setSaleCancelled(sale.id, false, member.name);
              },
            },
          });
        }}
        onReturn={async (sale, quantities) => {
          const result = await returnItems(sale.id, quantities, member.name);
          if (!result.ok) return;
          const count = Object.values(quantities).reduce((sum, value) => sum + value, 0);
          notify(`${count} article${count > 1 ? 's' : ''} retourné${count > 1 ? 's' : ''} et remis en stock.`);
        }}
      />
      {region}
    </div>
  );
}

function SaleDetail({
  sale: current,
  canEdit,
  onClose,
  onCancel,
  onReturn,
}: {
  sale: Sale | null;
  canEdit: boolean;
  onClose: () => void;
  onCancel: (sale: Sale) => void | Promise<void>;
  onReturn: (sale: Sale, quantities: Record<string, number>) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<'view' | 'return' | 'cancel' | 'receipt'>('view');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [invoicing, setInvoicing] = useState(false);
  const sale = useLatest(current);

  useEffect(() => {
    setMode('view');
    setQuantities({});
    setInvoicing(false);
  }, [current?.id]);

  if (!sale) return null;
  const state = saleState(sale);
  const invoiceable = state === 'ok' || state === 'partial';
  const returnable = sale.lines.some((line) => line.qty > line.returned);
  const toReturn = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const gross = saleGross(sale);
  const refund = sale.lines.reduce(
    (sum, line) => sum + line.price * (quantities[line.vid] ?? 0) * (gross ? 1 - sale.discount / gross : 1),
    0,
  );

  const footer =
    mode === 'return' ? (
      <>
        <button type="button" className="btn-quiet h-11 px-4" onClick={() => setMode('view')}>
          Retour
        </button>
        <button
          type="button"
          className="btn-gold h-11 px-5"
          disabled={!toReturn}
          onClick={() => {
            onReturn(sale, quantities);
            setMode('view');
            setQuantities({});
          }}
        >
          Rembourser {formatFcfa(Math.round(refund))}
        </button>
      </>
    ) : mode === 'cancel' ? (
      <>
        <button type="button" className="btn-quiet h-11 px-4" onClick={() => setMode('view')}>
          Garder la vente
        </button>
        <button
          type="button"
          className="btn h-11 bg-red-600 px-5 text-white hover:bg-red-700"
          onClick={() => {
            onCancel(sale);
            onClose();
          }}
        >
          Annuler la vente
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          className="btn-quiet mr-auto h-11 px-4"
          onClick={() => setMode(mode === 'receipt' ? 'view' : 'receipt')}
        >
          <ReceiptIcon className="size-[1.125rem]" aria-hidden="true" />
          {mode === 'receipt' ? 'Détail' : 'Reçu'}
        </button>
        {invoiceable && (
          <button type="button" className="btn-quiet h-11 px-4" onClick={() => setInvoicing(true)}>
            <FileText className="size-[1.125rem]" aria-hidden="true" />
            Facture
          </button>
        )}
        {canEdit && state !== 'cancelled' && (
          <>
            {returnable && (
              <button type="button" className="btn-quiet h-11 px-4" onClick={() => setMode('return')}>
                <Undo2 className="size-[1.125rem]" aria-hidden="true" />
                Retour
              </button>
            )}
            <button
              type="button"
              className="btn h-11 px-4 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
              onClick={() => setMode('cancel')}
            >
              <Ban className="size-[1.125rem]" aria-hidden="true" />
              Annuler
            </button>
          </>
        )}
      </>
    );

  return (
    <>
      <Modal
        open={Boolean(current)}
        variant="sheet"
        onClose={onClose}
        title={`Vente ${sale.id}`}
        description={`${formatFullDate(sale.at)} à ${formatTime(sale.at)}`}
        footer={footer}
      >
        {mode === 'receipt' && !invoicing ? (
          <Receipt sale={sale} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge kind="sale" status={state} />
              <p className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">
                {formatFcfa(saleNet(sale))}
              </p>
            </div>

            {mode === 'cancel' && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-800 dark:bg-red-400/10 dark:text-red-200">
                La vente ne comptera plus dans le chiffre d’affaires et les {saleItems(sale)} article(s) reviendront en
                stock. Vous pourrez la rétablir juste après.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-sunken p-4 text-sm">
              {[
                ['Boutique', sale.shop],
                ['Vendeur', sale.seller],
                ['Client', sale.customer || 'Client de passage'],
                ['Paiement', `${payLabel(sale.pay)}${sale.reference ? ` · ${sale.reference}` : ''}`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-ink-mute">{label}</dt>
                  <dd className="mt-0.5 truncate font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="text-sm font-bold text-ink">{mode === 'return' ? 'Articles à retourner' : 'Articles'}</h3>
              <ul className="mt-2 divide-y divide-line">
                {sale.lines.map((line) => {
                  const left = line.qty - line.returned;
                  return (
                    <li key={line.vid} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{line.name}</p>
                        <p className="truncate text-sm text-ink-mute">
                          {line.label ? `${line.label} · ` : ''}
                          {line.qty} × {formatFcfa(line.price)}
                          {line.returned > 0 && ` · ${line.returned} retourné${line.returned > 1 ? 's' : ''}`}
                        </p>
                        {line.listPrice !== undefined && (
                          <p className="truncate text-xs text-gold-700 dark:text-gold-300">
                            Prix changé à la vente · catalogue {formatFcfa(line.listPrice)}
                          </p>
                        )}
                      </div>
                      {mode === 'return' ? (
                        <Stepper
                          size="sm"
                          label={`Quantité retournée de ${line.name}`}
                          value={quantities[line.vid] ?? 0}
                          max={left}
                          onChange={(value) => setQuantities((current) => ({ ...current, [line.vid]: value }))}
                        />
                      ) : (
                        <span className="font-semibold text-ink tabular-nums">{formatFcfa(line.price * line.qty)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {mode !== 'return' && (
              <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <dt>Sous-total</dt>
                  <dd className="tabular-nums">{formatFcfa(gross)}</dd>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>Remise</dt>
                    <dd className="tabular-nums">− {formatFcfa(sale.discount)}</dd>
                  </div>
                )}
                {sale.lines.some((line) => line.returned) && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>Remboursé</dt>
                    <dd className="tabular-nums">− {formatFcfa(gross - sale.discount - saleNet(sale))}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-bold text-ink">
                  <dt>Total encaissé</dt>
                  <dd className="tabular-nums">{formatFcfa(saleNet(sale))}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </Modal>
      {invoicing && <InvoiceDialog sale={sale} onClose={() => setInvoicing(false)} />}
    </>
  );
}
