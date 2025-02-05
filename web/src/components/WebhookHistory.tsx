import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';

interface HistoryEntry {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  recordsProcessed?: number;
  error?: string;
}

interface HistoryRow {
  [key: string]: string | number;
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  recordsProcessed: number;
  error: string;
}

interface HistoryProps {
  entries: HistoryEntry[];
}

export function WebhookHistory({ entries }: HistoryProps) {
  const headers = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'status', header: 'Status' },
    { key: 'recordsProcessed', header: 'Records Processed' },
    { key: 'error', header: 'Error Details' }
  ];

  const rows: HistoryRow[] = entries.map((entry) => ({
    id: entry.id,
    timestamp: new Date(entry.timestamp).toLocaleString(),
    status: entry.status,
    recordsProcessed: entry.recordsProcessed || 0,
    error: entry.error || '-'
  }));

  return (
    <div className="webhook-history">
      <h3>Execution History</h3>
      <Table>
        <TableHead>
          <TableRow>
            {headers.map(header => (
              <TableHeader key={header.key}>
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              {Object.keys(row).filter(key => key !== 'id').map(key => (
                <TableCell key={key}>{row[key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 