import {
  BanknoteArrowDown,
  Boxes,
  Check,
  HandCoins,
  LockKeyhole,
  Minus,
  MoreHorizontal,
  Pencil,
  Receipt,
  SearchX,
  Truck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  PLAN_LIMITS,
  ROLES,
  ROLE_IDS,
  TODAY_START,
  formatAgo,
  permissionMatrix,
  type ActivityIcon,
  type Member,
  type RoleId,
  type Shop,
} from '../../data/dashboard';
import { formatPhone, isAuthLive, normalizeEmail, normalizePhone } from '../../lib/auth';
import { inviteMember, logActivity, patchMember, useSession } from '../../lib/demo';
import { PhoneField, TextField } from '../auth/fields';
import { Screen } from './Screen';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SearchInput,
  SelectBox,
  StatusBadge,
  useDismiss,
  useQueryParam,
  useToasts,
} from './ui';

export default function TeamPage() {
  return (
    <Screen id="team">
      <Team />
    </Screen>
  );
}

const assignable: Exclude<RoleId, 'owner'>[] = ['manager', 'seller', 'stock'];

const activityIcons: Record<ActivityIcon, LucideIcon> = {
  sale: Receipt,
  reception: Truck,
  stock: Boxes,
  edit: Pencil,
  team: Users,
  deposit: HandCoins,
  cash: Wallet,
  expense: BanknoteArrowDown,
};

function Team() {
  const { demo, role, member: me } = useSession();
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState(false);
  const { notify, region } = useToasts();
  const editable = role.manageTeam;

  const preset = useQueryParam('q');
  useEffect(() => {
    if (preset) setQuery(preset);
  }, [preset]);

  const limit = PLAN_LIMITS[demo.plan.id].users;
  const seats = demo.team.filter((member) => member.status !== 'suspended').length;
  const full = limit !== null && seats >= limit;
  const q = query.trim().toLowerCase();
  const visible = demo.team.filter(
    (member) => !q || `${member.name} ${ROLES[member.role].label} ${member.shop}`.toLowerCase().includes(q),
  );
  const salesToday = (name: string) =>
    demo.sales.filter((sale) => sale.seller === name && sale.at >= TODAY_START && !sale.cancelled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipe"
        description="Donnez à chacun l’accès dont il a besoin, et rien de plus."
        actions={
          editable && (
            <button
              type="button"
              className="btn-gold h-11 px-4 disabled:opacity-50"
              onClick={() => setInviting(true)}
              disabled={full}
              title={full ? 'Limite d’utilisateurs atteinte pour votre formule' : undefined}
            >
              <UserPlus className="size-[1.125rem]" aria-hidden="true" />
              Inviter un membre
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Membres" className="app-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-sm text-ink-mute">
              <span className="font-bold text-ink">{demo.team.length} membres</span> dans {demo.shops.length} boutique
              {demo.shops.length > 1 ? 's' : ''}
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
            <EmptyState icon={SearchX} title="Aucun membre ne correspond" />
          ) : (
            <ul className="@container divide-y divide-line">
              {visible.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isMe={member.id === me.id}
                  editable={editable && member.role !== 'owner'}
                  sales={member.role === 'seller' || member.role === 'manager' ? salesToday(member.name) : null}
                  onRole={async (next) => {
                    const result = await patchMember(member.id, { role: next });
                    if (!result.ok) return;
                    logActivity(me.name, `a nommé ${member.name} ${ROLES[next].label.toLowerCase()}`, 'team');
                    notify(`${member.name} est maintenant ${ROLES[next].label.toLowerCase()}.`);
                  }}
                  onToggle={async () => {
                    const suspended = member.status !== 'suspended';
                    const result = await patchMember(member.id, { status: suspended ? 'suspended' : 'active' });
                    if (!result.ok) return;
                    notify(suspended ? `Accès de ${member.name} suspendu.` : `Accès de ${member.name} rétabli.`, {
                      action: {
                        label: 'Annuler',
                        run: () => {
                          void patchMember(member.id, { status: member.status });
                        },
                      },
                    });
                  }}
                  onResend={() =>
                    notify(
                      member.email
                        ? `Le renvoi d’invitation pour ${member.email} arrive bientôt.`
                        : `Invitation à renvoyer à ${member.phone}.`,
                    )
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <Card title="Utilisateurs">
            <p className="text-2xl font-extrabold text-ink tabular-nums">
              {seats} <span className="text-base font-semibold text-ink-mute">/ {limit ?? 'illimité'}</span>
            </p>
            {limit !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-linear-to-r from-gold-300 to-gold-500"
                  style={{ width: `${Math.min(100, (seats / limit) * 100)}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-sm text-ink-mute">Les membres suspendus ne sont pas comptés.</p>
          </Card>

          <Card title="Activité récente" bodyClassName="px-2 pb-3 sm:px-3">
            <ul>
              {demo.activity.slice(0, 6).map((entry) => {
                const Icon = activityIcons[entry.icon];
                return (
                  <li key={entry.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-ink-soft">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink-soft">
                        <span className="font-semibold text-ink">{entry.user}</span> {entry.text}
                      </p>
                      <p className="text-xs text-ink-mute">{formatAgo(entry.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>

      <Card
        title="Qui peut faire quoi ?"
        description="Les droits de chaque rôle. Ils s’appliquent dès la prochaine connexion."
        className="overflow-hidden"
        bodyClassName=""
      >
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-sunken/60 text-xs text-ink-mute">
              <tr>
                <th scope="col" className="py-3 pr-3 pl-5 text-left font-semibold sm:pl-6">
                  <span className="sr-only">Droit</span>
                </th>
                {ROLE_IDS.map((id) => (
                  <th key={id} scope="col" className="px-3 py-3 text-center font-semibold">
                    {ROLES[id].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {permissionMatrix.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="py-3 pr-3 pl-5 text-left font-medium text-ink-soft sm:pl-6">
                    {row.label}
                  </th>
                  {ROLE_IDS.map((id) => {
                    const value = row.values[id];
                    return (
                      <td key={id} className="px-3 py-3 text-center">
                        {value === true ? (
                          <Check className="mx-auto size-4 text-emerald-500" strokeWidth={3} aria-label="Oui" />
                        ) : value === false ? (
                          <Minus className="mx-auto size-4 text-ink-mute/60" aria-label="Non" />
                        ) : (
                          <span className="text-xs font-semibold text-gold-700 dark:text-gold-300">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editable && (
        <InviteDialog
          open={inviting}
          onClose={() => setInviting(false)}
          onInvite={async (draft) => {
            const result = await inviteMember(draft, me.name);
            if (!result.ok) {
              const message =
                result.error === 'account-exists'
                  ? 'Cette adresse a déjà un compte GOLDSTOCK.'
                  : result.error === 'invalid-email'
                    ? 'Adresse email invalide.'
                    : 'L’invitation n’a pas pu être envoyée. Réessayez.';
              notify(message);
              return;
            }
            setInviting(false);
            notify(
              isAuthLive
                ? `Invitation envoyée à ${result.value.email ?? result.value.phone}.`
                : `Invitation enregistrée pour ${result.value.name} (mode test).`,
            );
          }}
        />
      )}
      {region}
    </div>
  );
}

function MemberRow({
  member,
  isMe,
  editable,
  sales,
  onRole,
  onToggle,
  onResend,
}: {
  member: Member;
  isMe: boolean;
  editable: boolean;
  sales: number | null;
  onRole: (role: RoleId) => void | Promise<void>;
  onToggle: () => void | Promise<void>;
  onResend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const roleLabel = ROLES[member.role].label;
  const item =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-soft transition hover:bg-sunken hover:text-ink';

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 @md:flex-nowrap @md:px-5 ${member.status === 'suspended' ? 'opacity-60' : ''}`}
    >
      <Avatar name={member.name} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex min-w-0 items-center gap-2 leading-snug font-semibold text-ink">
          <span className="truncate">{member.name}</span>
          {isMe && <Badge tone="warning">Vous</Badge>}
        </p>
        <p className="truncate text-sm leading-snug text-ink-mute">
          {[member.shop === 'Toutes' ? 'Toutes les boutiques' : member.shop, member.email || member.phone]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="hidden w-36 shrink-0 space-y-0.5 text-sm @2xl:block">
        <p className="leading-snug font-semibold text-ink">{roleLabel}</p>
        <p className="truncate leading-snug text-ink-mute">
          {member.lastSeen ? `Actif ${formatAgo(member.lastSeen)}` : 'Jamais connecté'}
        </p>
      </div>
      <div className="hidden w-24 shrink-0 space-y-0.5 text-right text-sm @3xl:block">
        <p className="leading-snug font-semibold text-ink tabular-nums">{sales ?? '—'}</p>
        <p className="leading-snug text-ink-mute">ventes auj.</p>
      </div>
      <div className="flex w-full items-center gap-2 pl-14 @md:w-auto @md:shrink-0 @md:justify-end @md:pl-0 @2xl:w-48">
        <span className="@2xl:hidden">
          <Badge tone="navy">{roleLabel}</Badge>
        </span>
        <StatusBadge kind="member" status={member.status} />
        {editable && (
          <div ref={ref} className="relative ml-auto @md:ml-0">
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
                    {ROLES[role].label}
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
  onInvite: (draft: {
    name: string;
    email: string;
    phone: string;
    role: Exclude<RoleId, 'owner'>;
    shop: Shop | 'Toutes';
    status: 'invited';
  }) => void | Promise<void>;
}) {
  const { demo } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Exclude<RoleId, 'owner'>>('seller');
  const [shop, setShop] = useState<Shop | 'Toutes'>(demo.shops[0].name);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const rights = permissionMatrix.map((row) => ({ label: row.label, value: row.values[role] }));

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('seller');
    setErrors({});
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const next: typeof errors = {};
    if (name.trim().split(/\s+/).length < 2) next.name = 'Indiquez le prénom et le nom.';
    if (!normalizedEmail) next.email = 'Adresse email invalide.';
    if (!normalizedPhone) next.phone = 'Numéro à 9 chiffres, par exemple 6 77 12 34 56.';
    setErrors(next);
    if (!normalizedEmail || !normalizedPhone || Object.keys(next).length) return;
    const local = normalizedPhone.slice(4);
    await onInvite({
      name: name.trim(),
      email: normalizedEmail,
      phone: `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`,
      role,
      shop,
      status: 'invited',
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
      variant="sheet"
      title="Inviter un membre"
      description={
        isAuthLive
          ? 'Il reçoit un email pour créer son mot de passe et rejoindre la boutique.'
          : 'Mode test : l’invitation reste locale (pas d’email).'
      }
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
        <TextField
          id="invite-email"
          label="Email"
          type="email"
          placeholder="estelle@exemple.com"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                <span className="block text-sm font-bold text-ink">{ROLES[item].label}</span>
                <span className="block text-xs text-ink-mute">{ROLES[item].summary}</span>
              </label>
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5 rounded-xl bg-sunken p-3.5 text-sm sm:grid-cols-2">
            {rights.map((right) => (
              <li
                key={right.label}
                className={`flex items-center gap-2 ${right.value ? 'text-ink-soft' : 'text-ink-mute'}`}
              >
                {right.value ? (
                  <Check className="size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <LockKeyhole className="size-4 shrink-0 text-ink-mute" aria-hidden="true" />
                )}
                {right.label}
                {typeof right.value === 'string' && <span className="text-xs text-ink-mute">({right.value})</span>}
                <span className="sr-only">{right.value ? ' : autorisé' : ' : non autorisé'}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <FormField id="invite-shop" label="Boutique">
          <SelectBox id="invite-shop" value={shop} onChange={(event) => setShop(event.target.value)}>
            {demo.shops.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
            <option value="Toutes">Toutes les boutiques</option>
          </SelectBox>
        </FormField>
      </form>
    </Modal>
  );
}
