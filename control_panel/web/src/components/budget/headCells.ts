import { Budget } from "../../types/budget";

export interface HeadCell {
  id: keyof Budget | "actions";
  label: string;
  numeric: boolean;
  sortable: boolean;
}

export const headCells: HeadCell[] = [
  { id: "name", label: "Name", numeric: false, sortable: true },
  { id: "watch", label: "App / LLM", numeric: false, sortable: true },
  { id: "period", label: "Period", numeric: false, sortable: true },
  { id: "budget", label: "Budget Amount", numeric: true, sortable: true },
  { id: "actions", label: "Actions", numeric: false, sortable: false },
]; 