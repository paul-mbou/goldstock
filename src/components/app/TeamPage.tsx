import { Check, ChevronDown, LockKeyhole, MoreHorizontal, SearchX, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  business,
  formatAgo,
  initials,
  team as initialTeam,
  type Member,
  type RoleName,
  type Shop,
} from '../../data/dashboard';
import { roles } from '../../data/site';
import { formatPhone, normalizePhone } from '../../lib/auth';
import { PhoneField, TextField } from '../auth/fields';
import {
  Avatar,
  Badge,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  selectClass,
  useDismiss,
  useQueryParam,
  useToasts,
} from './ui';

const assignable: RoleName[] = ['Gérant', 'Vendeur', 'Magasinier'];

export default function TeamPage() {
  const [members, setMembers] = useState(initialTeam);
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState(false);
  const { notify, region } = useToasts();

  const preset = useQueryParam('q');
  useEffect(() => {
    if (preset) setQuery(preset);
  }, [preset]);

  const seats = members.filter((member) => member.status !== 'suspended').length;
  const q = query.trim().toLowerCase();
  const visible = members.filter(
    (member) => !q || `${member.name} ${member.role} ${member.shop}`.toLowerCase().includes(q),
  );
  const update = (id: string, patch: Partial<Member>) =>
    setMembers((list) => list.map((member) => (member.id === id ? { ...member, ...patch } : member)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipe"
        description="Donnez à chacun l’accès dont il a besoin, et rien de plus."
        actions={
          <button
            type="button"
            className="btn-gold h-11 px-4"
            onClick={() => setInviting(true)}
            disabled={seats >= business.plan.users}
          >
            <UserPlus className="size-[1.125rem]" aria-hidden="true" />
            Inviter un membre
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Membres" className="app-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-sm text-ink-mute">
              <span className="font-bold text-ink">{members.length} membres</span> dans {business.shops.length}{' '}
              boutiques
            </p>
            <SearchInput
              label="Rechercher un membre"
              placeholder="Nom, rôle ou boutique"
              value={query}
              onChange={setQuery}
              className="sm:w-72"
            />
          </div>

          {visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <SearchX className="mx-auto size-8 text-ink-mute" aria-hidden="true" />
              <p className="mt-3 font-bold text-ink">Aucun membre ne correspond</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onRole={(role) => {
                    update(member.id, { role });
                    notify(`${member.name} est maintenant ${role.toLowerCase()}.`);
                  }}
                  onToggle={() => {
                    const suspended = member.status !== 'suspended';
                    update(member.id, { status: suspended ? 'suspended' : 'active' });
                    notify(suspended ? `Accès de ${member.name} suspendu.` : `Accès de ${member.name} rétabli.`, {
                      action: { label: 'Annuler', run: () => update(member.id, { status: member.status }) },
                    });
                  }}
                  onResend={() => notify(`Invitation renvoyée par SMS à ${member.phone}.`)}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="seats-title" className="app-card p-5">
            <h2 id="seats-title" className="font-bold text-ink">
              Utilisateurs
            </h2>
            <p className="mt-3 text-2xl font-extrabold text-ink tabular-nums">
              {seats} <span className="text-base font-semibold text-ink-mute">/ {business.plan.users}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-linear-to-r from-gold-300 to-gold-500"
                style={{ width: `${(seats / business.plan.users) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-mute">
              Inclus dans la formule {business.plan.name}. Les membres suspendus ne sont pas comptés.
            </p>
          </section>

          <section aria-labelledby="roles-help-title" className="app-card p-5">
            <h2 id="roles-help-title" className="font-bold text-ink">
              Qui voit quoi ?
            </h2>
            <ul className="mt-4 space-y-4">
              {roles.map((role) => (
                <li key={role.name}>
                  <p className="text-sm font-bold text-ink">
                    {role.name} <span className="font-normal text-ink-mute">· {role.summary}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-mute">
                    {role.permissions
                      .filter((permission) => permission.allowed)
                      .map((permission) => permission.label)
                      .join(', ')}
                    .
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onInvite={(member) => {
          setMembers((list) => [...list, member]);
          setInviting(false);
          notify(`Invitation envoyée par SMS à ${member.phone}.`);
        }}
      />
      {region}
    </div>
  );
}

function MemberRow({
  member,
  onRole,
  onToggle,
  onResend,
}: {
  member: Member;
  onRole: (role: RoleName) => void;
  onToggle: () => void;
  onResend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const owner = member.role === 'Propriétaire';
  const item =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-soft transition hover:bg-sunken hover:text-ink';

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5 ${member.status === 'suspended' ? 'opacity-60' : ''}`}
    >
      <Avatar name={member.name} initials={initials(member.name)} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {member.name}
          {owner && <Badge tone="warning">Vous</Badge>}
        </p>
        <p className="truncate text-sm text-ink-mute">
          {member.phone} · {member.shop === 'Toutes' ? 'Toutes les boutiques' : member.shop}
        </p>
      </div>
      <div className="hidden w-36 text-sm md:block">
        <p className="font-semibold text-ink">{member.role}</p>
        <p className="text-ink-mute">{member.lastSeen ? `Actif ${formatAgo(member.lastSeen)}` : 'Jamais connecté'}</p>
      </div>
      <div className="hidden w-28 text-right text-sm lg:block">
        <p className="font-semibold text-ink tabular-nums">
          {member.role === 'Vendeur' || member.role === 'Gérant' ? member.salesToday : '—'}
        </p>
        <p className="text-ink-mute">ventes auj.</p>
      </div>
      <div className="flex items-center gap-2 sm:w-44 sm:justify-end">
        <span className="md:hidden">
          <Badge tone="navy">{member.role}</Badge>
        </span>
        <StatusBadge kind="member" status={member.status} />
        {!owner && (
          <div ref={ref} className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-label={`Actions pour ${member.name}`}
              onClick={() => setOpen((value) => !value)}
              className="grid size-9 place-items-center rounded-lg text-ink-mute transition hover:bg-sunken hover:text-ink aria-expanded:bg-sunken"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
            {open && (
              <div className="absolute top-11 right-0 z-20 w-60 animate-dialog-in rounded-2xl border border-line bg-panel p-2 shadow-2xl">
                <p className="px-3 pt-1.5 pb-1 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-mute uppercase">
                  Rôle
                </p>
                {assignable.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={item}
                    onClick={() => {
                      setOpen(false);
                      if (role !== member.role) onRole(role);
                    }}
                  >
                    <Check
                      className={`size-4 ${role === member.role ? 'text-gold-600' : 'invisible'}`}
                      aria-hidden="true"
                    />
                    {role}
                  </button>
                ))}
                <div className="my-1.5 border-t border-line" />
                {member.status === 'invited' && (
                  <button
                    type="button"
                    className={item}
                    onClick={() => {
                      setOpen(false);
                      onResend();
                    }}
                  >
                    Renvoyer l’invitation
                  </button>
                )}
                <button
                  type="button"
                  className={`${item} ${member.status === 'suspended' ? '' : 'text-red-600 hover:text-red-700 dark:text-red-400'}`}
                  onClick={() => {
                    setOpen(false);
                    onToggle();
                  }}
                >
                  {member.status === 'suspended' ? 'Rétablir l’accès' : 'Suspendre l’accès'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (member: Member) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleName>('Vendeur');
  const [shop, setShop] = useState<Shop>('Akwa');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const selected = roles.find((item) => item.name === role)!;

  const reset = () => {
    setName('');
    setPhone('');
    setRole('Vendeur');
    setErrors({});
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    const next: typeof errors = {};
    if (name.trim().split(/\s+/).length < 2) next.name = 'Indiquez le prénom et le nom.';
    if (!normalized) next.phone = 'Numéro à 9 chiffres, par exemple 6 77 12 34 56.';
    setErrors(next);
    if (!normalized || Object.keys(next).length) return;
    const local = normalized.slice(4);
    onInvite({
      id: `m${Date.now()}`,
      name: name.trim(),
      phone: `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`,
      role,
      shop,
      status: 'invited',
      lastSeen: null,
      salesToday: 0,
    });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Inviter un membre"
      description="Il reçoit un SMS pour créer son mot de passe."
      footer={
        <>
          <button type="button" className="btn-quiet h-11 px-4" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="invite-member" className="btn-gold h-11 px-5">
            Envoyer l’invitation
          </button>
        </>
      }
    >
      <form id="invite-member" noValidate onSubmit={submit} className="space-y-5">
        <TextField
          id="invite-name"
          label="Prénom et nom"
          placeholder="Ex. Estelle Fotso"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />
        <PhoneField
          id="invite-phone"
          label="Téléphone"
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          error={errors.phone}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Rôle</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {assignable.map((item) => (
              <label
                key={item}
                className="cursor-pointer rounded-xl border border-line px-3.5 py-3 transition hover:border-navy-200 has-checked:border-gold-500 has-checked:bg-gold-50 has-focus-visible:ring-4 has-focus-visible:ring-gold-400/25 dark:hover:border-white/20 dark:has-checked:bg-gold-400/10"
              >
                <input
                  type="radio"
                  name="role"
                  value={item}
                  checked={role === item}
                  onChange={() => setRole(item)}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-ink">{item}</span>
                <span className="block text-xs text-ink-mute">
                  {roles.find((entry) => entry.name === item)?.summary}
                </span>
              </label>
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5 rounded-xl bg-sunken p-3.5 text-sm sm:grid-cols-2">
            {selected.permissions.map((permission) => (
              <li
                key={permission.label}
                className={`flex items-center gap-2 ${permission.allowed ? 'text-ink-soft' : 'text-ink-mute'}`}
              >
                {permission.allowed ? (
                  <Check className="size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <LockKeyhole className="size-4 shrink-0 text-ink-mute" aria-hidden="true" />
                )}
                {permission.label}
                <span className="sr-only">{permission.allowed ? ' : autorisé' : ' : non autorisé'}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <div>
          <label htmlFor="invite-shop" className="mb-2 block text-sm font-semibold text-ink">
            Boutique
          </label>
          <div className="relative">
            <select
              id="invite-shop"
              value={shop}
              onChange={(event) => setShop(event.target.value as Shop)}
              className={`${selectClass} h-12 w-full`}
            >
              {business.shops.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-mute"
              aria-hidden="true"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
