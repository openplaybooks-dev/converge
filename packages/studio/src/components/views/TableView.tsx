'use client';

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  id: string;
  [key: string]: unknown;
}

export interface TableViewProps {
  columns: TableColumn[];
  rows: TableRow[];
  onRowClick?: (row: TableRow) => void;
}

// Generic data table wrapping Converge Studio's existing table primitive
export function TableView({ columns, rows, onRowClick }: TableViewProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}