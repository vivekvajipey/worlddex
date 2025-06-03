"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BenchmarkResult, GroundTruth, Tier1Result, Tier2Result } from "@/lib/types";
import { assignRarityTier, getRarityClasses } from "@/lib/utils";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Eye } from "lucide-react";

interface ResultsTableProps {
  data: BenchmarkResult[];
  groundTruth?: GroundTruth;
}

export function ResultsTable({ data, groundTruth }: ResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const columns: ColumnDef<BenchmarkResult>[] = [
    {
      id: "expander",
      header: () => null,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(row.id)}>
          {expandedRows[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      ),
    },
    {
      accessorKey: "file",
      header: "File",
      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("file")}</div>,
    },
    {
      accessorKey: "tier1.label",
      header: "T1 Label",
      cell: ({ row }) => {
        const tier1 = row.original.tier1 as Tier1Result | undefined;
        return tier1?.label || "N/A";
      },
    },
    {
      accessorKey: "tier1.category",
      header: "T1 Category",
      cell: ({ row }) => {
        const tier1 = row.original.tier1 as Tier1Result | undefined;
        return tier1?.category || "N/A";
      },
    },
    {
      accessorKey: "tier1.subcategory",
      header: "T1 Subcategory",
      cell: ({ row }) => {
        const tier1 = row.original.tier1 as Tier1Result | undefined;
        return tier1?.subcategory || "N/A";
      },
    },
    {
      accessorKey: "tier1.rarityScore",
      header: "T1 Rarity",
      cell: ({ row }) => {
        const tier1 = row.original.tier1 as Tier1Result | undefined;
        const score = tier1?.rarityScore;
        if (typeof score !== "number") return "N/A";
        const tier = assignRarityTier(score);
        return (
          <Badge className={`${getRarityClasses(score)} px-2 py-0.5 text-xs`} variant="outline">
            {score} ({tier})
          </Badge>
        );
      },
    },
    {
      accessorKey: "tier2.label",
      header: "T2 Label",
      cell: ({ row }) => {
        const tier2 = row.original.tier2 as Tier2Result | null | undefined;
        if (!tier2?.label) return <span className="text-muted-foreground">N/A</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{tier2.label}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Provider: {tier2.provider}</p>
                <p>Confidence: {(tier2.confidence * 100).toFixed(1)}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "latency",
      header: () => <div className="text-right">Latency (ms)</div>,
      cell: ({ row }) => {
        const latency = parseFloat(row.getValue("latency"));
        return <div className="text-right font-mono text-xs">{latency.toFixed(0)}</div>;
      },
    },
    {
      accessorKey: "cost",
      header: () => <div className="text-right">Cost ($)</div>,
      cell: ({ row }) => {
        const cost = row.original.cost;
        return (
          <div className="text-right font-mono text-xs">
            {typeof cost === "number" ? (
              cost.toFixed(5)
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "groundTruthMatch",
      header: () => <div className="text-center">GT Match</div>,
      cell: ({ row }) => {
        if (!groundTruth) return null;
        const truth = groundTruth[row.original.file];
        if (!truth) return <div className="flex justify-center items-center text-xs text-muted-foreground">No GT</div>;

        const t1Label = row.original.tier1?.label?.toLowerCase();
        const t2Label = row.original.tier2?.label?.toLowerCase();
        const truthLabel = truth.label.toLowerCase();

        const isMatch = (t2Label && t2Label === truthLabel) || (!t2Label && t1Label === truthLabel);

        return (
          <div className="flex justify-center items-center">
            {isMatch ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by filename..."
          value={(table.getColumn("file")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("file")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows[row.id] && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <div className="p-4 bg-muted/50">
                          <h4 className="font-semibold mb-2">Raw JSON:</h4>
                          <pre className="text-xs overflow-x-auto bg-background p-2 rounded-md border">
                            {JSON.stringify(row.original, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
