import {
  formatFcfa,
  formatShortDate,
  invoiceDate,
  payLabel,
  saleNet,
  type DemoState,
  type Sale,
} from '../data/dashboard';
import { formatPhone } from './auth';
import { shopAddress } from './demo';

/* ------------------------------------------------------------------ amount in words */

const units = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
];
const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function below100(n: number): string {
  if (n < 17) return units[n];
  if (n < 20) return `dix-${units[n - 10]}`;
  if (n < 70) {
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit === 0 ? '' : unit === 1 ? ' et un' : `-${units[unit]}`);
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${below100(n - 60)}`;
  return n === 80 ? 'quatre-vingts' : `quatre-vingt-${below100(n - 80)}`;
}

function below1000(n: number) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return below100(rest);
  const head = hundreds === 1 ? 'cent' : `${units[hundreds]} cent${rest ? '' : 's'}`;
  return rest ? `${head} ${below100(rest)}` : head;
}

/** 120 500 → "cent vingt mille cinq cents", the way amounts are written out on Cameroonian invoices. */
export function amountInWords(value: number) {
  const n = Math.round(Math.abs(value));
  if (n === 0) return units[0];
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  return [
    billions && `${below1000(billions)} milliard${billions > 1 ? 's' : ''}`,
    millions && `${below1000(millions)} million${millions > 1 ? 's' : ''}`,
    /* "Mille" never takes an s, and "cents" / "vingts" lose theirs in front of it. */
    thousands && (thousands === 1 ? 'mille' : `${below1000(thousands).replace(/(cent|vingt)s$/, '$1')} mille`),
    rest && below1000(rest),
  ]
    .filter(Boolean)
    .join(' ');
}

/* ------------------------------------------------------------------ invoice figures */

export const invoiceNumber = (sale: Sale) => `FAC-${sale.id.replace(/^V-/, '')}`;

/** "+237677123456" → "+237 6 77 12 34 56". */
export const displayPhone = (phone: string) => (phone ? `+237 ${formatPhone(phone)}` : '');

/** What the customer kept: returned items leave the invoice, the discount follows the remaining total. */
export function invoiceFigures(sale: Sale) {
  const lines = sale.lines.map((line) => ({ ...line, qty: line.qty - line.returned })).filter((line) => line.qty > 0);
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = saleNet(sale);
  return { lines, subtotal, discount: subtotal - total, total };
}

/** Company block shared by the printed invoice and the WhatsApp message. */
export function invoiceCompany(demo: DemoState, sale: Sale) {
  const { shopName, company, city, phone, niu, rccm } = demo.settings;
  return {
    shopName,
    company: company && company !== shopName ? company : '',
    location: [`Boutique ${sale.shop}`, shopAddress(demo, sale.shop), city].filter(Boolean).join(', '),
    phone,
    legal: [niu && `NIU ${niu}`, rccm && `RCCM ${rccm}`].filter(Boolean).join(' · '),
  };
}

/** Plain-text invoice for WhatsApp, which only carries text through a wa.me link. */
export function invoiceMessage(demo: DemoState, sale: Sale) {
  const company = invoiceCompany(demo, sale);
  const { lines, subtotal, discount, total } = invoiceFigures(sale);
  const rows: (string | false)[] = [
    `*FACTURE ${invoiceNumber(sale)}*`,
    `*${company.shopName}*${company.company ? ` · ${company.company}` : ''}`,
    company.location,
    Boolean(company.phone) && `Tél. ${company.phone}`,
    Boolean(company.legal) && company.legal,
    '',
    `Date de facture : ${formatShortDate(invoiceDate(sale))}`,
    `Vente ${sale.id} du ${formatShortDate(sale.at)}`,
    '',
    `Client : ${sale.customer || 'Client de passage'}`,
    Boolean(sale.customerPhone) && `Tél. : ${displayPhone(sale.customerPhone)}`,
    Boolean(sale.customerEmail) && `Email : ${sale.customerEmail}`,
    '',
    ...lines.map(
      (line) =>
        `${line.qty} × ${line.name}${line.label ? ` (${line.label})` : ''} : ${formatFcfa(line.price * line.qty)}`,
    ),
    '',
    discount > 0 && `Sous-total : ${formatFcfa(subtotal)}`,
    discount > 0 && `Remise : −${formatFcfa(discount)}`,
    `*Total : ${formatFcfa(total)}*`,
    `Payée par ${payLabel(sale.pay)}${sale.reference ? ` · Réf. ${sale.reference}` : ''}`,
    '',
    `Arrêtée la présente facture à la somme de ${amountInWords(total)} francs CFA.`,
    demo.settings.receiptMessage,
  ];
  return rows.filter((row) => row !== false).join('\n');
}

/** wa.me link to the customer's number, or to the contact picker when there is none. */
export const whatsappLink = (text: string, phone = '') =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
