"use client";

import React from "react";
import { getItemImageUrl } from "@/data/champions";
import IconBox from "./IconBox";

interface InventoryRowProps {
  itemIds: number[];
  matchId: string;
}

export default function InventoryRow({ itemIds, matchId }: InventoryRowProps) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        Inventory
      </p>
      <div className="flex flex-wrap gap-1.5">
        {itemIds.map((itemId, index) => (
          <IconBox
            key={`${matchId}-item-${index}`}
            src={getItemImageUrl(itemId)}
            alt={itemId ? `Item ${itemId}` : "Empty item slot"}
            fallback=""
            className="h-10 w-10 rounded-lg"
            title={itemId ? `Item ${itemId}` : "Empty item slot"}
          />
        ))}
      </div>
    </div>
  );
}