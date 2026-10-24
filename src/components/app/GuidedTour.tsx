import { ArrowLeft, ArrowRight, Compass, Menu, Package, X } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { screenHref } from '../../data/dashboard';
import { TOUR_STEPS } from '../../data/tour';
import { useSession } from '../../lib/demo';
import { isTourSeen, markTourSeen, onTourStart } from '../../lib/tour';
import { LogoMark } from '../brand/Logo';
import { screenIcons } from './AppNav';

/** Step waiting to be resumed after "Voir la page", kept until the visitor resumes or dismisses it. */
const RESUME_KEY = 'gs-tour-resume';
const CARD_WIDTH = 368;
const CARD_HEIGHT = 340;
const GAP = 14;
const SPOT_PADDING = 6;

type Box = { top: number; left: number; width: number; height: number };

/** The visible element of a `data-tour` name: the sidebar entry on desktop, the bottom bar on phones. */
function findTarget(name: string) {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return element;
  }
  return null;
}

function readResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeResume(index: number | null) {
  try {
    if (index === null) sessionStorage.removeItem(RESUME_KEY);
    else sessionStorage.setItem(RESUME_KEY, String(index));
  } catch {
    /* Private mode: the tour simply ends on this page. */
  }
}

/** Next to the spotlight when there is room, otherwise docked to the top or bottom of the screen. */
function cardPosition(spot: Box | null): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 640) {
    if (!spot) return { left: 12, right: 12, bottom: 12 };
    return spot.top > vh / 2 ? { left: 12, right: 12, top: 12 } : { left: 12, right: 12, bottom: 12 };
  }
  if (!spot) return { left: (vw - CARD_WIDTH) / 2, top: Math.max(16, (vh - CARD_HEIGHT) / 2) };
  if (spot.left + spot.width + GAP + CARD_WIDTH <= vw - 16)
    return { left: spot.left + spot.width + GAP, top: Math.min(Math.max(16, spot.top - 24), vh - 16 - CARD_HEIGHT) };
  const left = Math.min(Math.max(16, spot.left + spot.width - CARD_WIDTH), vw - 16 - CARD_WIDTH);
  return spot.top + spot.height + GAP + CARD_HEIGHT <= vh
    ? { left, top: spot.top + spot.height + GAP }
    : { left, bottom: vh - spot.top + GAP };
}

export default function GuidedTour() {
  const { can, role, member, demo } = useSession();
  const steps = TOUR_STEPS.filter((step) => !step.screen || can(step.screen));
  const [open, setOpen] = useState(false);
  /** -1: welcome, `steps.length`: the end. */
  const [index, setIndex] = useState(-1);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [spot, setSpot] = useState<Box | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLElement | null>(null);
  const setPrimary = useCallback((element: HTMLElement | null) => {
    primary.current = element;
  }, []);
  const titleId = useId();
  const step = index >= 0 && index < steps.length ? steps[index] : null;

  const start = useCallback((at: number) => {
    writeResume(null);
    setResumeAt(null);
    setIndex(at);
    setOpen(true);
  }, []);

  useEffect(() => {
    const resume = readResume();
    if (resume !== null) setResumeAt(resume);
    else if (!isTourSeen()) start(-1);
    return onTourStart(() => start(-1));
  }, [start]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const measure = useCallback(() => {
    const box = step ? findTarget(step.target)?.getBoundingClientRect() : undefined;
    const next = box
      ? {
          top: box.top - SPOT_PADDING,
          left: box.left - SPOT_PADDING,
          width: box.width + SPOT_PADDING * 2,
          height: box.height + SPOT_PADDING * 2,
        }
      : null;
    setSpot(next);
    setPosition(cardPosition(next));
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    if (step) findTarget(step.target)?.scrollIntoView({ block: 'nearest' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure, step]);

  useEffect(() => {
    if (open) primary.current?.focus();
  }, [open, index]);

  const finish = () => {
    markTourSeen();
    setOpen(false);
  };
  const next = () => setIndex((value) => Math.min(value + 1, steps.length));
  const previous = () => setIndex((value) => Math.max(value - 1, -1));

  const firstName = member.name === role.label ? '' : member.name.split(' ')[0];
  const StepIcon = step?.screen ? screenIcons[step.screen] : Compass;
  const canAddProducts = can('products') && role.editCatalog;

  return (
    <>
      {resumeAt !== null && !open && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
          <div className="pointer-events-auto flex animate-dialog-in items-center gap-1 rounded-full bg-navy-900 p-1.5 pl-4 text-sm text-white shadow-2xl ring-1 ring-white/10">
            <Compass className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
            <button
              type="button"
              onClick={() => start(Math.min(resumeAt, steps.length))}
              className="rounded-full px-2.5 py-1.5 font-semibold transition hover:bg-white/10"
            >
              Reprendre la visite
              <span className="ml-1.5 font-normal text-white/60 tabular-nums">
                {Math.min(resumeAt + 1, steps.length)}/{steps.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                writeResume(null);
                setResumeAt(null);
              }}
              aria-label="Arrêter la visite guidée"
              className="grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          markTourSeen();
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (!step) return;
          if (event.key === 'ArrowRight') next();
          if (event.key === 'ArrowLeft') previous();
        }}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
      >
        {open && (
          <>
            {spot ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute rounded-xl shadow-[0_0_0_9999px_color-mix(in_oklab,var(--color-navy-950)_60%,transparent)] ring-2 ring-gold-400 transition-all duration-300 ease-out"
                style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
              />
            ) : (
              <div aria-hidden="true" className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px]" />
            )}

            {step ? (
              <section
                key={step.id}
                className="absolute animate-dialog-in rounded-2xl border border-line bg-panel p-5 shadow-2xl sm:w-[23rem]"
                style={position}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold tracking-[0.12em] text-gold-700 uppercase dark:text-gold-300">
                    Étape {index + 1} sur {steps.length}
                  </p>
                  <button
                    type="button"
                    onClick={finish}
                    aria-label="Quitter la visite guidée"
                    className="-mr-2 grid size-9 place-items-center rounded-full text-ink-mute transition hover:bg-sunken hover:text-ink"
                  >
                    <X className="size-[1.125rem]" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300">
                    <StepIcon className="size-5" aria-hidden="true" />
                  </span>
                  <h2 id={titleId} className="text-lg font-bold text-ink">
                    {step.title}
                  </h2>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{step.summary}</p>

                <p className="mt-4 text-xs font-bold tracking-[0.12em] text-ink-mute uppercase">Comment faire</p>
                <ol className="mt-2 space-y-2">
                  {step.how.map((line, number) => (
                    <li key={line} className="flex gap-2.5 text-sm leading-snug text-ink-soft">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sunken text-[0.6875rem] font-bold text-ink tabular-nums">
                        {number + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>

                {!spot && step.screen && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-sunken px-3 py-2.5 text-sm text-ink-mute">
                    <Menu className="size-4 shrink-0" aria-hidden="true" />
                    Dans le menu, en haut à gauche de l’écran.
                  </p>
                )}

                <div
                  role="progressbar"
                  aria-label="Avancement de la visite"
                  aria-valuemin={1}
                  aria-valuemax={steps.length}
                  aria-valuenow={index + 1}
                  className="mt-5 flex gap-1"
                >
                  {steps.map((item, number) => (
                    <span
                      key={item.id}
                      className={`h-1 flex-1 rounded-full ${number <= index ? 'bg-gold-500' : 'bg-sunken'}`}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  {step.screen ? (
                    <a
                      href={screenHref[step.screen]}
                      onClick={() => {
                        markTourSeen();
                        writeResume(index + 1);
                      }}
                      className="text-sm font-semibold text-gold-700 hover:underline dark:text-gold-300"
                    >
                      Voir la page
                    </a>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={previous}
                      aria-label="Étape précédente"
                      className="btn-quiet h-10 px-3"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                    </button>
                    <button ref={setPrimary} type="button" onClick={next} className="btn-gold h-10 px-4 text-sm">
                      {index === steps.length - 1 ? 'Terminer' : 'Suivant'}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>
            ) : index < 0 ? (
              <section className="absolute inset-x-3 top-1/2 mx-auto max-w-md -translate-y-1/2 animate-dialog-in rounded-3xl border border-line bg-panel p-6 text-center shadow-2xl sm:p-8">
                <LogoMark className="mx-auto size-12" />
                <h2 id={titleId} className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
                  {firstName ? `Bienvenue, ${firstName}` : 'Bienvenue sur GOLDSTOCK'}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  L’espace de <strong className="font-semibold text-ink">{demo.settings.shopName}</strong> est prêt. Il
                  part de zéro : les catégories de votre activité sont en place, à vous d’ajouter vos produits.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-mute">
                  En {steps.length} étapes courtes, voyez à quoi sert chaque rubrique et comment l’utiliser.
                </p>
                <div className="mt-7 flex flex-col gap-2.5">
                  <button ref={setPrimary} type="button" onClick={next} className="btn-gold h-12 w-full">
                    Commencer la visite
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={finish} className="btn-quiet h-12 w-full">
                    Plus tard
                  </button>
                </div>
                <p className="mt-4 text-xs text-ink-mute">
                  Vous pourrez la relancer depuis votre menu, en haut à droite.
                </p>
              </section>
            ) : (
              <section className="absolute inset-x-3 top-1/2 mx-auto max-w-md -translate-y-1/2 animate-dialog-in rounded-3xl border border-line bg-panel p-6 text-center shadow-2xl sm:p-8">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gold-50 text-gold-700 dark:bg-gold-400/10 dark:text-gold-300">
                  <Compass className="size-6" aria-hidden="true" />
                </span>
                <h2 id={titleId} className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
                  Vous connaissez l’essentiel
                </h2>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  {canAddProducts
                    ? 'Prochaine étape : ajoutez vos premiers produits avec leur prix et leur stock. La caisse pourra ensuite les vendre.'
                    : 'Vous pouvez commencer. Le tableau de bord vous montre où en est la boutique.'}
                </p>
                <div className="mt-7 flex flex-col gap-2.5">
                  {canAddProducts && (
                    <a
                      ref={setPrimary}
                      href="/app/produits/fiche"
                      onClick={markTourSeen}
                      className="btn-gold h-12 w-full"
                    >
                      <Package className="size-[1.125rem]" aria-hidden="true" />
                      Ajouter mon premier produit
                    </a>
                  )}
                  <button
                    ref={canAddProducts ? undefined : setPrimary}
                    type="button"
                    onClick={finish}
                    className={`${canAddProducts ? 'btn-quiet' : 'btn-gold'} h-12 w-full`}
                  >
                    Terminer la visite
                  </button>
                </div>
                <button
                  type="button"
                  onClick={previous}
                  className="mt-4 text-sm font-semibold text-ink-mute transition hover:text-ink"
                >
                  Revoir la dernière étape
                </button>
              </section>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
