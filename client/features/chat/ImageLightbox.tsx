import { X } from "lucide-react";

export function ImageLightbox({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Full-size image viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-[#11152a]/90 p-5" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close image viewer" className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"><X size={20} /></button>
      <img src={imageUrl} alt="Full-size shared image" className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}
