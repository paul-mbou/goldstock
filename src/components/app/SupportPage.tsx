import { ChevronDown, Mail, MessageCircle, Send } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { NOW, formatWhen } from '../../data/dashboard';
import { site, whatsappUrl } from '../../data/site';
import { setDemo, useSession } from '../../lib/demo';
import { Screen } from './Screen';
import { Badge, Card, FormField, PageHeader, SelectBox, inputClass, textareaClass, useToasts } from './ui';

export default function SupportPage() {
  return (
    <Screen id="support">
      <Support />
    </Screen>
  );
}

const topics = ['Caisse', 'Stock et produits', 'Abonnement', 'Équipe et accès', 'Autre'];

const faq = [
  {
    q: 'Puis-je encaisser sans connexion internet ?',
    a: 'Oui. La caisse continue de fonctionner hors ligne et les ventes se synchronisent dès que la connexion revient.',
  },
  {
    q: 'Comment créer des variantes (pointure, couleur…) ?',
    a: 'Dans Catégories, ajoutez une caractéristique de type Liste ou Couleur et choisissez « Crée des variantes ». Elle apparaîtra dans la fiche produit.',
  },
  {
    q: 'Un vendeur peut-il voir mes marges ?',
    a: 'Non. Les vendeurs ne voient ni les prix d’achat ni les marges. Le détail des droits est dans Équipe.',
  },
  {
    q: 'Que se passe-t-il si mon abonnement expire ?',
    a: 'Vos données restent conservées. Renouvelez depuis Abonnement, par Mobile Money, pour continuer à encaisser.',
  },
];

function Support() {
  const { demo, member } = useSession();
  const [topic, setTopic] = useState(topics[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});
  const { notify, region } = useToasts();

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (subject.trim().length < 4) next.subject = 'Résumez votre demande en quelques mots.';
    if (message.trim().length < 10) next.message = 'Décrivez ce qui se passe, même brièvement.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = `T-${1039 + demo.tickets.length}`;
    setDemo((current) => ({
      ...current,
      tickets: [{ id, subject: subject.trim(), category: topic, status: 'open', at: NOW }, ...current.tickets],
    }));
    setSubject('');
    setMessage('');
    notify(`Demande ${id} envoyée. Nous vous répondons sur WhatsApp au ${member.phone}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Assistance" description="Une question, un souci ? Notre équipe est disponible 7 j/7." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card title="Nouvelle demande">
          <form noValidate onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <FormField id="ticket-topic" label="Sujet">
                <SelectBox id="ticket-topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {topics.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </SelectBox>
              </FormField>
              <FormField id="ticket-subject" label="Titre" error={errors.subject}>
                <input
                  id="ticket-subject"
                  className={inputClass(Boolean(errors.subject))}
                  placeholder="Ex. L’imprimante n’imprime plus les reçus"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </FormField>
            </div>
            <FormField id="ticket-message" label="Message" error={errors.message}>
              <textarea
                id="ticket-message"
                rows={5}
                className={`${textareaClass} ${errors.message ? 'border-red-400' : ''}`}
                placeholder="Que s’est-il passé ? Sur quel écran ? Depuis quand ?"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end">
              <button type="submit" className="btn-gold h-11 px-5">
                <Send className="size-4" aria-hidden="true" />
                Envoyer
              </button>
            </div>
          </form>
        </Card>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-navy-950 p-5 text-white ring-1 ring-white/10 dark:bg-linear-to-br dark:from-navy-800 dark:to-navy-950">
            <p className="font-bold">Besoin d’une réponse rapide ?</p>
            <p className="mt-1 text-sm text-white/65">Écrivez-nous sur WhatsApp, c’est le moyen le plus rapide.</p>
            <a
              href={whatsappUrl(`Bonjour, je suis ${member.name} (${demo.settings.shopName}). J’ai besoin d’aide.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold mt-4 h-11 w-full"
            >
              <MessageCircle className="size-[1.125rem]" aria-hidden="true" />
              Ouvrir WhatsApp
            </a>
            <a
              href={`mailto:${site.email}`}
              className="mt-3 flex items-center justify-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <Mail className="size-4" aria-hidden="true" />
              {site.email}
            </a>
          </section>

          <Card title="Mes demandes" bodyClassName="px-2 pb-3 sm:px-3">
            {demo.tickets.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-mute">Aucune demande pour l’instant.</p>
            ) : (
              <ul>
                {demo.tickets.map((ticket) => (
                  <li key={ticket.id} className="rounded-xl px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{ticket.subject}</p>
                      <Badge tone={ticket.status === 'open' ? 'warning' : 'success'}>
                        {ticket.status === 'open' ? 'En cours' : 'Résolue'}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-mute">
                      {ticket.id} · {ticket.category} · {formatWhen(ticket.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <Card title="Questions fréquentes" bodyClassName="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="divide-y divide-line">
          {faq.map((item) => (
            <details key={item.q} className="group px-2 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  className="size-4 shrink-0 text-ink-mute transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </Card>
      {region}
    </div>
  );
}
