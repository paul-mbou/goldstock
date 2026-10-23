import { useRef } from 'react';
import { Play, X } from 'lucide-react';
import { WhatsAppIcon } from './brand/WhatsAppIcon';

type VideoDialogProps = {
  videoUrl?: string;
  whatsappUrl: string;
};

export default function VideoDialog({ videoUrl, whatsappUrl }: VideoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className="btn-ghost-dark h-14 px-7 text-base"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Play className="size-5 fill-current" aria-hidden="true" />
        Voir la vidéo
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="video-dialog-title"
        onClose={() => videoRef.current?.pause()}
        onClick={(event) => event.target === dialogRef.current && close()}
        className="m-auto w-[min(56rem,calc(100%-2rem))] overflow-hidden rounded-3xl bg-navy-900 p-0 text-white shadow-2xl backdrop:bg-navy-950/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <h2 id="video-dialog-title" className="text-lg font-bold">
            GOLDSTOCK en 2 minutes
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer la vidéo"
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-white/10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            preload="none"
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(244_181_44/0.18),transparent_60%)] p-8 text-center">
            <div className="max-w-md">
              <p className="text-2xl font-bold">La démo vidéo arrive très bientôt.</p>
              <p className="mt-3 text-white/70">
                En attendant, notre équipe vous fait une démonstration en direct sur WhatsApp, à l’heure qui vous
                arrange.
              </p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-6">
                <WhatsAppIcon />
                Demander une démo
              </a>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
