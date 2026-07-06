import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Navy pastel pill used on the Commerce detail screen to surface the
 * sub-category (e.g. "Panadería y repostería").
 */
function SubcategoryPill({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="subcategory-pill"
      className={cn(
        "inline-flex w-fit items-center rounded-[7px] bg-primary-pastel px-[11px] py-[5px] text-[11.5px] font-semibold text-primary",
        className,
      )}
      {...props}
    />
  );
}

export { SubcategoryPill };
