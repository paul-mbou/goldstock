import { MessageCircle, Printer } from 'lucide-react';
import { useState } from 'react';
import { formatFcfa, formatFullDate, formatShortDate, invoiceDate, payLabel, type Sale } from '../../data/dashboard';
import { formatPhone, normalizeEmail, normalizePhone } from '../../lib/auth';
import { issueInvoice, useSession } from '../../lib/demo';
import {
  amountInWords,
  displayPhone,
  invoiceCompany,
  invoiceFigures,
  invoiceMessage,
  invoiceNumber,
  whatsappLink,
} from '../../lib/invoice';
import { PhoneField, TextField } from '../auth/fields';
import { Modal } from './ui';

/** Customer details, preview, print and WhatsApp for one sale's invoice. */
export function InvoiceDialog({ sale: initial, onClose }: { sale: Sale; onClose: () => void }) {
  const { demo } = useSession();
  const sale = demo.sales.find((item) => item.id === initial.id) ?? initial;
  const [customer, setCustomer] = useState(sale.customer);
  const [phone, setPhone] = useState(formatPhone(sale.customerPhone));
  const [email, setEmail] = useState(sale.customerEmail);
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});
  const draft: Sale = {
    ...sale,
    customer: customer.trim(),
    customerPhone: normalizePhone(phone) ?? '',
    customerEmail: normalizeEmail(email) ?? '',
  };

  /** Validates the customer's contact and records the invoice; false when something must be fixed first. */
  const issue = () => {
    const next: typeof errors = {};
    if (phone.trim() && !draft.customerPhone) next.phone = 'Numéro à 9 chiffres, par exemple 6 77 12 34 56.';
    if (email.trim() && !draft.customerEmail) next.email = 'Adresse email invalide, par exemple nom@gmail.com.';
    if (!phone.trim() && !email.trim()) next.phone = 'Indiquez le numéro ou l’email du client.';
    setErrors(next);
    if (next.phone || next.email) {
      document.getElementById(next.phone ? 'invoice-phone' : 'invoice-email')?.focus();
      return false;
    }
    issueInvoice(sale.id, draft);
    return true;
  };

  const print = () => {
    if (issue()) window.print();
  };

  const send = () => {
    if (!issue()) return;
    window.open(whatsappLink(invoiceMessage(demo, draft), draft.customerPhone), '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Facture ${invoiceNumber(sale)}`}
      description={`Vente ${sale.id} du ${formatFullDate(sale.at).toLowerCase()}`}
      footer={
        <>
          <button type="button" className="btn-quiet mr-auto hidden h-11 px-4 sm:inline-flex" onClick={onClose}>
            Fermer
          </button>
          <button type="button" className="btn-quiet h-11 px-4" onClick={print}>
            <Printer className="size-[1.125rem]" aria-hidden="true" />
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Imprimer ou PDF</span>
          </button>
          <button type="button" className="btn-gold h-11 px-5" onClick={send}>
            <MessageCircle className="size-[1.125rem]" aria-hidden="true" />
            <span className="sm:hidden">WhatsApp</span>
            <span className="hidden sm:inline">Envoyer sur WhatsApp</span>
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              id="invoice-customer"
              label="Client"
              placeholder="Client de passage"
              autoComplete="off"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
            />
          </div>
          <PhoneField
            id="invoice-phone"
            label="Téléphone (WhatsApp)"
            value={phone}
            onChange={(event) => {
              setPhone(formatPhone(event.target.value));
              setErrors({ ...errors, phone: undefined });
            }}
            error={errors.phone}
            hint="La facture partira vers ce numéro."
          />
          <TextField
            id="invoice-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="nom@gmail.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors({ ...errors, email: undefined, phone: phone.trim() ? errors.phone : undefined });
            }}
            error={errors.email}
            hint="Le numéro, l’email ou les deux."
          />
        </div>
        <div className="rounded-2xl bg-sunken p-1.5 sm:p-4">
          <Invoice sale={draft} />
        </div>
      </div>
    </Modal>
  );
}

/** A4-style invoice with the company's legal details; stays on white paper in dark mode, like the receipt. */
export function Invoice({ sale }: { sale: Sale }) {
  const { demo } = useSession();
  const company = invoiceCompany(demo, sale);
  const { lines, subtotal, discount, total } = invoiceFigures(sale);
  const { logoUrl } = demo.settings;

  return (
    <article
      data-print
      className="mx-auto w-full overflow-hidden rounded-xl border-t-4 border-gold-400 bg-white px-4 py-6 text-[0.8125rem] leading-relaxed text-navy-900 shadow-sm sm:px-8 sm:py-8 print:shadow-none"
    >
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="size-14 shrink-0 object-contain" />}
          <div className="min-w-0">
            <p className="text-base font-extrabold text-navy-950">{company.shopName}</p>
            {company.company && <p className="font-semibold">{company.company}</p>}
            <p>{company.location}</p>
            {company.phone && <p>Tél. {company.phone}</p>}
            {company.legal && <p className="text-navy-500">{company.legal}</p>}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-2xl font-extrabold tracking-tight text-navy-950">FACTURE</p>
          <p className="font-semibold">N° {invoiceNumber(sale)}</p>
          <p>Date de facture : {formatShortDate(invoiceDate(sale))}</p>
          <p className="text-navy-500">
            Vente {sale.id} du {formatShortDate(sale.at)}
          </p>
        </div>
      </header>

      <div className="mt-6 rounded-lg bg-navy-50 px-4 py-3">
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-navy-500 uppercase">Facturé à</p>
        <p className="font-bold text-navy-950">{sale.customer || 'Client de passage'}</p>
        {sale.customerPhone && <p>Tél. {displayPhone(sale.customerPhone)}</p>}
        {sale.customerEmail && <p className="break-all">{sale.customerEmail}</p>}
      </div>

      <table className="mt-6 w-full text-left">
        <thead>
          <tr className="border-b-2 border-navy-900 text-[0.6875rem] tracking-[0.08em] text-navy-500 uppercase">
            <th scope="col" className="py-2 pr-3 font-bold">
              Désignation
            </th>
            <th scope="col" className="px-2 py-2 text-right font-bold">
              Qté
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-bold sm:table-cell print:table-cell">
              Prix unitaire
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-bold">
              Montant
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {lines.map((line) => (
            <tr key={line.vid}>
              <td className="py-2.5 pr-3">
                <p className="font-semibold text-navy-950">{line.name}</p>
                {line.label && <p className="text-navy-500">{line.label}</p>}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">{line.qty}</td>
              <td className="hidden px-2 py-2.5 text-right whitespace-nowrap tabular-nums sm:table-cell print:table-cell">
                {formatFcfa(line.price)}
              </td>
              <td className="py-2.5 pl-2 text-right font-semibold whitespace-nowrap tabular-nums">
                {formatFcfa(line.price * line.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto max-w-64 space-y-1 border-t border-navy-200 pt-3">
        {discount > 0 && (
          <>
            <div className="flex justify-between gap-4">
              <dt>Sous-total</dt>
              <dd className="tabular-nums">{formatFcfa(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Remise</dt>
              <dd className="tabular-nums">−{formatFcfa(discount)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between gap-4 text-base font-extrabold text-navy-950">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatFcfa(total)}</dd>
        </div>
      </dl>

      <p className="mt-6">
        Arrêtée la présente facture à la somme de{' '}
        <strong className="text-navy-950">{amountInWords(total)} francs CFA</strong> ({formatFcfa(total)}).
      </p>
      <p className="mt-1 text-navy-500">
        Payée le {formatShortDate(sale.at)} par {payLabel(sale.pay)}
        {sale.reference && ` · Réf. ${sale.reference}`} · Vendeur : {sale.seller}
      </p>
      {demo.settings.receiptMessage && (
        <p className="mt-6 border-t border-dashed border-navy-200 pt-4 text-center text-xs text-navy-500">
          {demo.settings.receiptMessage}
        </p>
      )}
    </article>
  );
}
