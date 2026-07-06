import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * WhatsApp brand glyph (lucide has no brand icons). Uses `currentColor`, so it
 * inherits the button's foreground colour. Path from the Claude Design
 * prototype `Directorio Monteazul.dc.html`.
 */
function WhatsAppGlyph({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-4", className)}
      {...props}
    >
      <path d="M12.05 2C6.5 2 2 6.5 2 12.05a10 10 0 0 0 1.5 5.3L2 22l4.8-1.5A10 10 0 1 0 12.05 2Zm5.4 12.4c-.3.8-1.5 1.4-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.2-.2-1.3-1.6-1.3-3.1 0-1.5.8-2.2 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5l.9 2c.1.2.1.4 0 .5-.2.3-.3.5-.5.7-.1.1-.3.3-.1.6.1.3.7 1.2 1.6 1.9 1.1.9 1.5 1 1.8 1.1.2.1.4.1.5-.1.2-.2.6-.7.8-1 .1-.2.3-.2.5-.1l1.8.9c.3.1.5.2.5.4.1.1.1.6-.1 1.2Z" />
    </svg>
  );
}

export type WhatsAppButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant"
>;

/**
 * WhatsApp contact call-to-action. Wraps the design-system Button with the
 * `whatsapp` variant and the brand glyph. Defaults to the "WhatsApp" label
 * used on the Commerce cards; pass children for the detail CTA
 * ("Escribir por WhatsApp").
 */
function WhatsAppButton({
  children = "WhatsApp",
  className,
  ...props
}: WhatsAppButtonProps) {
  return (
    <Button variant="whatsapp" className={cn("gap-2", className)} {...props}>
      <WhatsAppGlyph />
      {children}
    </Button>
  );
}

export { WhatsAppButton, WhatsAppGlyph };
