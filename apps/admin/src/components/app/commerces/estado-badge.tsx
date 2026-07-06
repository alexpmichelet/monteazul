import { Badge } from "@/components/ui/badge";

/** Estado lifecycle values (mirrors the backend `estado` union). */
export type Estado = "pendiente" | "publicado" | "suspendido";

export const ESTADO_LABELS: Record<Estado, string> = {
  pendiente: "Pendiente",
  publicado: "Publicado",
  suspendido: "Suspendido",
};

const ESTADO_VARIANTS: Record<Estado, "default" | "secondary" | "outline"> = {
  pendiente: "secondary",
  publicado: "default",
  suspendido: "outline",
};

/** Small coloured badge rendering a fiche's Estado, in Spanish. */
export function EstadoBadge({ estado }: { estado: Estado }) {
  return <Badge variant={ESTADO_VARIANTS[estado]}>{ESTADO_LABELS[estado]}</Badge>;
}
