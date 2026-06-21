import { useParams, Link } from "wouter";
import { useGetStudent, useGetStudentStatement } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { CURRENT_TERM_LABEL } from "@/lib/term";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ArrowLeft,
  User,
  Phone,
  GraduationCap,
  Fingerprint,
  CheckCircle2,
  XCircle,
  Smartphone,
  Banknote,
  Building2,
} from "lucide-react";

const methodIcon = (method: string) => {
  if (method === "mpesa") return <Smartphone className="h-3.5 w-3.5" />;
  if (method === "bank") return <Building2 className="h-3.5 w-3.5" />;
  return <Banknote className="h-3.5 w-3.5" />;
};

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  pending: "secondary",
  failed: "destructive",
  reversed: "outline",
};

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: detail, isLoading, error } = useGetStudent(id);
  const { data: statement, isLoading: isLoadingStatement } = useGetStudentStatement(id);

  const student = detail?.student;
  const totalPaid = detail?.totalPaid ?? 0;
  const feeExpected = detail?.feeExpected ?? 0;
  const currentBalance = detail?.currentBalance ?? 0;
  const recentPayments = detail?.recentPayments ?? [];

  const pct = feeExpected > 0 ? Math.round((totalPaid / feeExpected) * 100) : 0;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Student not found</AlertTitle>
        <AlertDescription>Could not load details for this student.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/students">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Students
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{student?.fullName}</h1>
          )}
          <div className="text-sm text-muted-foreground mt-1">
            {isLoading ? <Skeleton className="h-4 w-40" /> : student?.admissionNumber}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <Badge variant={student?.status === "active" ? "default" : "secondary"} className="capitalize">
            {student?.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Academic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium">{student?.class}</span>
                </div>
                {student?.stream && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stream</span>
                    <span className="font-medium">{student?.stream}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission No.</span>
                  <span className="font-mono text-xs">{student?.admissionNumber}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> Guardian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="font-medium">{student?.guardianName ?? "—"}</div>
                {student?.guardianPhone && (
                  <a href={`tel:${student.guardianPhone}`} className="flex items-center gap-1.5 text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    {student.guardianPhone}
                  </a>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fingerprint className="h-4 w-4" /> NEMIS / Maisha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : student?.maishaNumber ? (
              <>
                <div className="font-mono text-sm">{student.maishaNumber}</div>
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Eligible for capitation
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <XCircle className="h-3.5 w-3.5" /> Maisha Number not set
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">Fee Statement — {CURRENT_TERM_LABEL}</CardTitle>
              <CardDescription>Current term payment progress</CardDescription>
            </div>
            {!isLoading && (
              <Badge variant={currentBalance <= 0 ? "default" : totalPaid === 0 ? "destructive" : "secondary"}>
                {currentBalance <= 0 ? "Cleared" : totalPaid === 0 ? "No Payment" : "Partial"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Expected</div>
                  <div className="text-lg font-bold">{formatCurrency(feeExpected)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Paid</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Balance</div>
                  <div className={`text-lg font-bold ${currentBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                    {currentBalance > 0 ? formatCurrency(currentBalance) : "Nil"}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={pct} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">{pct}% paid</div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <div className="text-sm font-medium mb-3">Recent Payments</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                  : recentPayments.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          No payments recorded.
                        </TableCell>
                      </TableRow>
                    )
                  : recentPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{formatDate(p.paymentDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-normal capitalize">
                            {methodIcon(p.method)}
                            {p.method === "mpesa" ? "M-Pesa" : p.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.transactionRef ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor[p.status] ?? "secondary"} className="capitalize">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {statement && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium mb-3">Full Ledger</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Debit (Fee)</TableHead>
                      <TableHead className="text-right">Credit (Paid)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingStatement
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ))
                      : statement.entries.map((e, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                            <TableCell className="text-sm">{e.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{e.academicYear} T{e.term}</TableCell>
                            <TableCell className="text-right text-sm text-destructive">
                              {e.debit > 0 ? formatCurrency(e.debit) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm text-green-600">
                              {e.credit > 0 ? formatCurrency(e.credit) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(e.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell colSpan={5} className="text-right">Closing Balance</TableCell>
                      <TableCell className={`text-right ${statement.closingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                        {formatCurrency(statement.closingBalance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
