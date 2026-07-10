"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { IconUserPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

const formSchema = z.object({
  email: z.string().email("Introduce un correo válido."),
  name: z.string().min(1, "El nombre es obligatorio.").min(2, "El nombre debe tener al menos 2 caracteres."),
});

export function InviteDialog() {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const inviteAdmin = useMutation(api.table.admin.inviteAdmin);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      await inviteAdmin({
        email: data.email,
        name: data.name,
      });

      toast.success("Invitación enviada", {
        description: `Se ha enviado un correo de invitación a ${data.email}`,
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error("No se pudo enviar la invitación", {
        description: getConvexErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconUserPlus className="mr-2 h-4 w-4" />
          Invitar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a un miembro del equipo</DialogTitle>
          <DialogDescription>
            Envía una invitación para unirse al equipo de administración. La persona recibirá un correo con un enlace para crear su cuenta.
          </DialogDescription>
        </DialogHeader>

        <form id="invite-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Nombre</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    placeholder="Ana García"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Correo</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="ana@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" form="invite-form" disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : null}
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
