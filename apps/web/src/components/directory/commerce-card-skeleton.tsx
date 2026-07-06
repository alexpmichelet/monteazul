import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for a Commerce card, matching the 204px horizontal-row
 * card of the directory list: photo block, name, sub-category, opening status
 * and the WhatsApp action.
 */
function CommerceCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="commerce-card-skeleton"
      data-testid="commerce-card-skeleton"
      className={cn("w-[204px] shrink-0", className)}
      {...props}
    >
      <Skeleton className="h-[132px] w-full rounded-card" />
      <div className="px-0.5 pt-2.5">
        <Skeleton className="h-[15px] w-3/4 rounded-md" />
        <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
        <Skeleton className="mt-2.5 h-3 w-2/3 rounded-md" />
        <Skeleton className="mt-2.5 h-9 w-full rounded-button" />
      </div>
    </div>
  );
}

export { CommerceCardSkeleton };
