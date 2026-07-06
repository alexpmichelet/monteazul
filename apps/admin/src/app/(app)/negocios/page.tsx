"use client";

import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { CommerceTable } from "@/components/app/commerces/commerce-table";

export default function NegociosPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Negocios</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona todas las fichas: filtra por estado y categoría, edita,
            aprueba, suspende, reactiva o elimina.
          </p>
        </div>
        <Button asChild>
          <Link href="/negocios/nueva">
            <IconPlus className="mr-1 size-4" />
            Crear cuenta de empresa
          </Link>
        </Button>
      </div>
      <div className="px-4 lg:px-6">
        <CommerceTable />
      </div>
    </div>
  );
}
