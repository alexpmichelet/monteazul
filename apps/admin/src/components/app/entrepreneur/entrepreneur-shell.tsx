"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  IconBuildingStore,
  IconChartBar,
  IconDotsVertical,
  IconInnerShadowTop,
  IconLifebuoy,
  IconLogout,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

// --- Navigation data ---

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Mi negocio", icon: IconBuildingStore, href: "/mi-negocio" },
  { label: "Estadísticas", icon: IconChartBar, href: "/mi-negocio/estadisticas" },
];

const HELP_ITEM: NavItem = {
  label: "Ayuda",
  icon: IconLifebuoy,
  href: "/mi-negocio/ayuda",
};

// --- Helpers ---

function getInitials(name: string): string {
  if (!name) return "MN";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// --- Sub-components ---

const NavMenuItem = ({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) => {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isRouteActive(pathname, item.href)}
        tooltip={item.label}
      >
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const NavUser = ({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) => {
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/acceso");
  }

  const initials = getInitials(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <IconLogout className="mr-2 size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const EntrepreneurSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const me = useQuery(api.table.users.currentUser);

  // Close the mobile drawer whenever the route changes — otherwise it stays
  // open on top of the new page after tapping a nav item.
  React.useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const user = me
    ? {
        name: me.name || "Mi negocio",
        email: me.email || "",
        avatar: me.image || "",
      }
    : null;

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Monteazul">
              <Link href="/mi-negocio">
                <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
                  <IconInnerShadowTop className="size-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Monteazul</span>
                  <span className="text-xs text-muted-foreground">Mi negocio</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavMenuItem key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* "Ayuda" sits at the very bottom of the sidebar, above the account. */}
        <SidebarMenu>
          <NavMenuItem item={HELP_ITEM} pathname={pathname} />
        </SidebarMenu>
        {user ? (
          <NavUser user={user} />
        ) : (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

// --- Main Shell ---

export function EntrepreneurShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <EntrepreneurSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
