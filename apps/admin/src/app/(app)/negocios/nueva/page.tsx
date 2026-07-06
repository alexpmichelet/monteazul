"use client";

import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { CreateEntrepriseForm } from "@/components/app/commerces/create-entreprise-form";

export default function NuevaCuentaEmpresaPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Button asChild size="sm" variant="ghost" className="mb-2 -ml-2">
          <Link href="/negocios">
            <IconArrowLeft className="mr-1 size-4" />
            Volver a Negocios
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Crear cuenta de empresa</h1>
        <p className="text-muted-foreground text-sm">
          Canal de alta de comerciantes reclutados por WhatsApp: crea la cuenta y
          su ficha, y transmite la contraseña generada manualmente.
        </p>
      </div>
      <div className="px-4 lg:px-6">
        <CreateEntrepriseForm />
      </div>
    </div>
  );
}
