import { toast } from "sonner";

import { WhatsAppGlyph } from "./whatsapp-button";

export { Toaster } from "@/components/ui/sonner";

/**
 * Spanish copy shown when a WhatsApp contact redirect is triggered.
 * Kept pure so it can be asserted without a live toast surface.
 */
export function whatsAppRedirectMessage(name: string): string {
  return `Redirigiendo a WhatsApp de ${name}…`;
}

/**
 * Shows the navy WhatsApp redirect toast from the prototype. In the real app
 * this is fired right before opening `wa.me` (the redirect happens even if the
 * server tracking mutation fails). Returns the toast id.
 */
export function notifyWhatsAppRedirect(name: string) {
  return toast.custom(
    () => (
      <div className="flex max-w-[88%] items-center gap-[9px] rounded-xl bg-primary px-4 py-[11px] text-[13px] font-semibold text-primary-foreground shadow-[0_10px_30px_rgba(20,30,50,0.35)]">
        <WhatsAppGlyph className="size-[17px]" />
        {whatsAppRedirectMessage(name)}
      </div>
    ),
    { duration: 2600 },
  );
}
