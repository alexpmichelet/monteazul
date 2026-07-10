"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  IconArrowLeft,
  IconUserShield,
  IconUser,
  IconTrash,
  IconBan,
  IconLockOpen,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  role: z.enum(["user", "entreprise", "admin"]),
});

interface UserDetailProps {
  userId: Id<"users">;
  /** Path to navigate back to. Defaults to "/team" */
  backPath?: string;
}

export function UserDetail({ userId, backPath = "/team" }: UserDetailProps) {
  const router = useRouter();
  const user = useQuery(api.table.admin.getUser, { userId });
  const updateUser = useMutation(api.table.admin.updateUser);
  const deleteUser = useMutation(api.table.admin.deleteUser);
  const banUser = useMutation(api.table.admin.banUser);
  const unbanUser = useMutation(api.table.admin.unbanUser);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isBanning, setIsBanning] = React.useState(false);
  const [isUnbanning, setIsUnbanning] = React.useState(false);
  const [banDialogOpen, setBanDialogOpen] = React.useState(false);
  const [banReason, setBanReason] = React.useState("");
  const [banDuration, setBanDuration] = React.useState("permanent");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bio: "",
      role: "user",
    },
  });

  // Update form values when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        bio: user.bio ?? "",
        role: user.role ?? "user",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await updateUser({
        userId,
        updates: {
          name: data.name || undefined,
          bio: data.bio || undefined,
          role: data.role,
        },
      });
      toast.success("Usuario actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el usuario."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser({ userId });
      toast.success("Usuario eliminado");
      router.push(backPath);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      );
      setIsDeleting(false);
    }
  };

  const handleBan = async () => {
    setIsBanning(true);
    try {
      const durationMap: Record<string, number | undefined> = {
        permanent: undefined,
        "1d": 60 * 60 * 24,
        "7d": 60 * 60 * 24 * 7,
        "30d": 60 * 60 * 24 * 30,
      };
      await banUser({
        userId,
        banReason: banReason || undefined,
        banExpiresIn: durationMap[banDuration],
      });
      toast.success("Usuario bloqueado");
      setBanDialogOpen(false);
      setBanReason("");
      setBanDuration("permanent");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo bloquear al usuario."
      );
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async () => {
    setIsUnbanning(true);
    try {
      await unbanUser({ userId });
      toast.success("Usuario desbloqueado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo desbloquear al usuario."
      );
    } finally {
      setIsUnbanning(false);
    }
  };

  const isBanned =
    user?.banned && (!user.banExpires || user.banExpires > Date.now());

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (user === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Usuario no encontrado</p>
        <Button variant="outline" onClick={() => router.push(backPath)}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(backPath)}
        >
          <IconArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name || "Usuario sin nombre"}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isBanned && (
            <Badge variant="destructive">
              <IconBan className="mr-1 h-3 w-3" />
              Bloqueado
            </Badge>
          )}
          <Badge
            variant={user.role === "admin" ? "default" : "outline"}
            className="capitalize"
          >
            {user.role === "admin" ? (
              <IconUserShield className="mr-1 h-3 w-3" />
            ) : (
              <IconUser className="mr-1 h-3 w-3" />
            )}
            {user.role || "user"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información del usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha de alta</span>
                <p className="font-medium">{formatDate(user._creationTime)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Correo verificado</span>
                <p className="font-medium">
                  {user.emailVerificationTime
                    ? formatDate(user.emailVerificationTime)
                    : "Sin verificar"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono</span>
                <p className="font-medium">{user.phone || "Sin especificar"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Onboarding</span>
                <p className="font-medium">
                  {user.hasCompletedOnboarding ? "Completado" : "Sin completar"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Editar usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input {...field} id="name" placeholder="Nombre del usuario" />
                  </div>
                )}
              />

              <Controller
                name="bio"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <Textarea
                      {...field}
                      id="bio"
                      placeholder="Biografía del usuario"
                      rows={3}
                    />
                  </div>
                )}
              />

              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Moderation */}
      {user.role !== "admin" && (
        <Card className={isBanned ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle>Moderación</CardTitle>
          </CardHeader>
          <CardContent>
            {isBanned ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Este usuario está bloqueado actualmente
                  </p>
                  {user.banReason && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Motivo:</span>{" "}
                      {user.banReason}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Expira:</span>{" "}
                    {user.banExpires
                      ? formatDate(user.banExpires)
                      : "Permanente"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleUnban}
                  disabled={isUnbanning}
                >
                  {isUnbanning ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <IconLockOpen className="mr-2 h-4 w-4" />
                  )}
                  Desbloquear usuario
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bloquear usuario</p>
                  <p className="text-muted-foreground text-sm">
                    Impide que este usuario inicie sesión y revoca todas sus sesiones.
                  </p>
                </div>
                <AlertDialog
                  open={banDialogOpen}
                  onOpenChange={setBanDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <IconBan className="mr-2 h-4 w-4" />
                      Bloquear usuario
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bloquear usuario</AlertDialogTitle>
                      <AlertDialogDescription>
                        El usuario no podrá iniciar sesión y todas sus sesiones activas se revocarán inmediatamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="ban-reason">
                          Motivo{" "}
                          <span className="text-muted-foreground">
                            (opcional)
                          </span>
                        </Label>
                        <Input
                          id="ban-reason"
                          placeholder="P. ej. spam, abuso, etc."
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ban-duration">Duración</Label>
                        <Select
                          value={banDuration}
                          onValueChange={setBanDuration}
                        >
                          <SelectTrigger id="ban-duration">
                            <SelectValue placeholder="Selecciona la duración" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="permanent">
                              Permanente
                            </SelectItem>
                            <SelectItem value="1d">1 día</SelectItem>
                            <SelectItem value="7d">7 días</SelectItem>
                            <SelectItem value="30d">30 días</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBan}
                        disabled={isBanning}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isBanning ? (
                          <Spinner className="mr-2 h-4 w-4" />
                        ) : null}
                        Confirmar bloqueo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Eliminar usuario</p>
              <p className="text-muted-foreground text-sm">
                Elimina definitivamente a este usuario y todos sus datos.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <IconTrash className="mr-2 h-4 w-4" />
                  Eliminar usuario
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Seguro que quieres eliminar a este usuario? Esta acción no se puede deshacer: todos sus datos, sesiones y cuentas asociadas se eliminarán definitivamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
