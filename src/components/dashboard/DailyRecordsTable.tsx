'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyRecord {
  date: string;
  entryTimes: string[];
  exitTimes: string[];
  dailyHours: string;
}

interface DailyRecordsTableProps {
  records: DailyRecord[];
}

export function DailyRecordsTable({ records }: DailyRecordsTableProps) {
  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-lg">Detalhamento Diário</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Saídas</TableHead>
              <TableHead className="text-right">Horas Úteis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => (
                <TableRow key={record.date} className="group hover:bg-primary/5">
                  <TableCell className="font-medium">{record.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {record.entryTimes.map((time, i) => (
                        <Badge key={i} variant="secondary" className="bg-secondary/50 text-secondary-foreground">
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {record.exitTimes.map((time, i) => (
                        <Badge key={i} variant="outline" className="border-accent text-accent-foreground font-semibold">
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {record.dailyHours}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum registro encontrado para este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}