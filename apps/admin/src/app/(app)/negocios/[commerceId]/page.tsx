"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { IconArrowLeft } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CommerceEditForm } from "@/components/app/commerces/commerce-edit-form";

export default function NegocioDetailPage() {
  const params = useParams<{ commerceId: string }>();
  const commerce = useQuery(api.table.adminCommerces.getCommerceForAdmin, {
    commerceId: params.commerceId as Id<"commerces">,
  });

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/negocios">
            <IconArrowLeft className="mr-1 size-4" />
            Volver a negocios
          </Link>
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        {commerce === undefined ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : commerce === null ? (
          <p className="text-muted-foreground text-sm">
            No se encontró el negocio.
          </p>
        ) : (
          <CommerceEditForm commerce={commerce} />
        )}
      </div>
    </div>
  );
}
