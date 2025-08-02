import { useState, useMemo } from "react";

export type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

function useSortableData<T extends Record<string, any>>(
  items: T[],
  initialConfig: SortConfig = { key: "", direction: "asc" }
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialConfig);

  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return { sortedItems, requestSort, sortConfig };
}

export default useSortableData; 