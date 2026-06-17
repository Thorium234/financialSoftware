import { useListCapitationDisbursements, useGetCapitationSummary, useListStudents } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, BookOpen, CheckCircle2, XCircle } from "lucide-react";

export default function Capitation() {
  const { data: disbursements, isLoading, error } = useListCapitationDisbursements();
  const { data: summary, isLoading: isLoadingSummary } = useGetCapitationSummary();
  const { data: students } = useListStudents();

  const studentsWithMaisha = students?.filter(s => s.maishaNumber) ?? [];
  const studentsWithout = students?.filter(s => !s.maishaNumber) ?? [];
  const total = students?.length ?? 0;
  const withMaishaPct = total > 0 ? Math.round((studentsWithMaisha.length / total) * 100) : 0;
  const disbursementCount = summary?.disbursements?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Capitation Tracking</h1>
        <div className="text-sm text-muted-foreground mt-1">MoE/TSC government capitation disbursements and NEMIS Maisha Numbers</div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load capitation data.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalDisbursed ?? 0)}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{disbursementCount} disbursements</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Per-Student Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.perStudentRate ?? 0)}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">Current rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">NEMIS Maisha Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsWithMaisha.length} / {total}</div>
            <div className="space-y-1 mt-2">
              <Progress value={withMaishaPct} className="h-1.5" />
              <div className="text-xs text-muted-foreground">{withMaishaPct}% of students have Maisha Numbers</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disbursement History</CardTitle>
          <CardDescription>MoE capitation grants received</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MoE Reference</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Per Student</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                : disbursements?.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No capitation disbursements recorded.
                      </TableCell>
                    </TableRow>
                  )
                : disbursements?.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.moeReference}</TableCell>
                      <TableCell className="text-sm">{d.academicYear}</TableCell>
                      <TableCell><Badge variant="outline">Term {d.term}</Badge></TableCell>
                      <TableCell className="text-sm">{formatDate(d.disbursementDate.toString())}</TableCell>
                      <TableCell className="text-right text-sm">{d.studentCount}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(d.perStudentRate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(d.amount)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            NEMIS Maisha Number Status
          </CardTitle>
          <CardDescription>Students must have valid Maisha Numbers to qualify for government capitation</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Maisha Number</TableHead>
                <TableHead>Capitation Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students === undefined
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                : [...studentsWithMaisha, ...studentsWithout].map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{s.fullName}</div>
                        <div className="text-xs text-muted-foreground">{s.admissionNumber}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{s.class}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">
                        {s.maishaNumber ?? <span className="text-muted-foreground italic">Not set</span>}
                      </TableCell>
                      <TableCell>
                        {s.maishaNumber ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="h-4 w-4" /> Eligible
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive text-sm">
                            <XCircle className="h-4 w-4" /> Missing NEMIS ID
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
