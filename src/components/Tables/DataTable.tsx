import React, { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  isLoading?: boolean
  emptyMessage?: string
  pageSize?: number
  showPagination?: boolean
  globalFilter?: string
}

/**
 * Generic DataTable component powered by TanStack Table v8.
 * Provides sorting, filtering, and pagination out of the box.
 */
function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No records found.',
  pageSize = 10,
  showPagination = true,
  globalFilter = ''
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } }
  })

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        className={`flex items-center gap-1 text-left w-full group ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : 'cursor-default'
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="ml-auto text-text-muted">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="w-3 h-3 text-primary" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="w-3 h-3 text-primary" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-text-muted"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-3xl">📭</div>
                    <div className="text-sm">{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
          <div>
            Showing{' '}
            <span className="font-medium text-text-primary">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-text-primary">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of{' '}
            <span className="font-medium text-text-primary">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            results
          </div>

          <div className="flex items-center gap-2">
            <button
              id="table-prev-page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
              const page = i + 1
              const current = table.getState().pagination.pageIndex + 1
              return (
                <button
                  key={i}
                  onClick={() => table.setPageIndex(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    current === page
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            })}

            <button
              id="table-next-page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
