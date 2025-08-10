'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { AdminClient } from '@/types/admin';

interface ClientsTableProps {
  clients: AdminClient[];
  onEdit: (client: AdminClient) => void;
  onDelete: (clientId: string) => void;
  searchQuery: string;
  statusFilter: string[];
  typeFilter: string[];
  sourceFilter: string[];
  eventFilter: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const columnHelper = createColumnHelper<AdminClient>();

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Initial Discussion':
      return 'bg-gray-100 text-gray-800';
    case 'Negotiation':
      return 'bg-yellow-100 text-yellow-800';
    case 'Won':
      return 'bg-green-100 text-green-800';
    case 'Lost':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ClientsTable({ 
  clients, 
  onEdit, 
  onDelete, 
  searchQuery, 
  statusFilter, 
  typeFilter, 
  sourceFilter, 
  eventFilter, 
  sortBy, 
  sortOrder 
}: ClientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: sortBy, desc: sortOrder === 'desc' }
  ]);

  const columns = useMemo<ColumnDef<AdminClient>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue }) => (
          <div className="font-medium">{getValue()}</div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue()}</div>
        ),
      }),
      columnHelper.accessor('eventKind', {
        header: 'Event',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue()}</div>
        ),
      }),
      columnHelper.accessor('pocName', {
        header: 'Name of POC',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue()}</div>
        ),
      }),
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('country', {
        header: 'Country',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('expectedAttendees', {
        header: '# of Expected Attendees',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('eventDate', {
        header: 'Date of Event',
        cell: ({ getValue }) => (
          <div className="text-sm">
            {getValue() ? new Date(getValue()).toLocaleDateString() : '-'}
          </div>
        ),
      }),
      columnHelper.accessor('organizerFormSent', {
        header: 'Organizer Form Sent?',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge className={getStatusColor(getValue())}>
            {getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: ({ getValue }) => (
          <div className="text-sm">{getValue() || '-'}</div>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ getValue }) => (
          <div className="text-sm max-w-xs truncate" title={getValue() || ''}>
            {getValue() || '-'}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [onEdit, onDelete]
  );

  const filteredData = useMemo(() => {
    return clients.filter((client) => {
      // Global search filter
      const searchMatch = !searchQuery || 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.pocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.description && client.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(client.status);

      // Type filter
      const typeMatch = typeFilter.length === 0 || typeFilter.includes(client.type);

      // Source filter
      const sourceMatch = sourceFilter.length === 0 || 
        (client.source && sourceFilter.includes(client.source));

      // Event filter
      const eventMatch = eventFilter.length === 0 || eventFilter.includes(client.eventKind);

      return searchMatch && statusMatch && typeMatch && sourceMatch && eventMatch;
    });
  }, [clients, searchQuery, statusFilter, typeFilter, sourceFilter, eventFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
      sorting: [
        { id: sortBy, desc: sortOrder === 'desc' }
      ],
    },
  });

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <div className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => onEdit(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
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
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex gap-x-2 items-baseline">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> of{' '}
                  <span className="font-medium">{table.getPageCount()}</span>
                </span>
                <label>
                  <span className="sr-only">Items Per Page</span>
                  <select
                    className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                  >
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        Show {pageSize}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
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
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
