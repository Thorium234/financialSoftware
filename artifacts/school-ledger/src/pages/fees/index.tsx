import { useState } from "react";
import { useListFeeStructures, useListDefaulters } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, GraduationCap, Phone } from "lucide-react";
import { Link } from "wouter";
import { CURRENT_YEAR, CURRENT_TERM } from "@/lib/term";

const classOrder = ["Form 1", "Form 2", "Form 3", "Form 4"];

export default function Fees() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [term, setTerm] = useState(String(CURRENT_TERM));

  const { data: feeStructures, isLoading, error } = useListFeeStructures({
    academicYear: year,
    term: Number(term),
  });

  const { data: defaulters, isLoading: isLoadingDefaulters } = useListDefaulters();

  const sorted = feeStructures
    ? [...feeStructures].sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fee Structures</h1>
        <div className="text-sm text-muted-foreground mt-1">Term fee schedules and defaulter tracking</div>
      </div>

      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures">Fee Schedules</TabsTrigger>
          <TabsTrigger value="defaulters">Fee Defaulters</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to load fee structures.</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
                    <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                  </Card>
                ))
              : sorted.length === 0
              ? (
                  <div className="col-span-2 text-center py-16 text-muted-foreground">
                    No fee structure set for {year} Term {term}.
                  </div>
                )
              : sorted.map(fs => {
                  const breakdown = Array.isArray(fs.breakdown)
                    ? fs.breakdown as Array<{ description: string; amount: number; voteCategory: string }>
                    : [];
                  return (
                    <Card key={fs.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">{fs.class}</CardTitle>
                          </div>
                          <div className="text-xl font-bold">{formatCurrency(Number(fs.totalAmount))}</div>
                        </div>
                        <CardDescription>{year} · Term {fs.term}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.description}</span>
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                          {breakdown.length === 0 && (
                            <div className="text-xs text-muted-foreground">No breakdown available</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </TabsContent>

        <TabsContent value="defaulters" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDefaulters
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    : defaulters?.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-green-600 font-medium">
                            All students are up to date for this term.
                          </TableCell>
                        </TableRow>
                      )
                    : defaulters?.map(d => {
                        const pct = d.feeExpected > 0
                          ? Math.round((d.totalPaid / d.feeExpected) * 100)
                          : 0;
                        return (
                          <TableRow key={d.studentId}>
                            <TableCell>
                              <Link href={`/students/${d.studentId}`} className="font-medium hover:underline text-primary">
                                {d.fullName}
                              </Link>
                              <div className="text-xs text-muted-foreground">{d.admissionNumber}</div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{d.class}</Badge></TableCell>
                            <TableCell>
                              {d.guardianPhone ? (
                                <a href={`tel:${d.guardianPhone}`} className="flex items-center gap-1 text-xs text-primary">
                                  <Phone className="h-3 w-3" />{d.guardianPhone}
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(d.feeExpected)}</TableCell>
                            <TableCell className="text-right text-sm text-green-600">{formatCurrency(d.totalPaid)}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">{formatCurrency(d.balance)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={pct} className="h-1.5" />
                                <div className="text-xs text-muted-foreground text-right">{pct}%</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
