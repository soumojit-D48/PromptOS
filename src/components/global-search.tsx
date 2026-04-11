"use client";

import { SearchPalette } from "./search-palette";

interface GlobalSearchProps {
  orgId: string;
}

export function GlobalSearch({ orgId }: GlobalSearchProps) {
  return <SearchPalette orgId={orgId} />;
}