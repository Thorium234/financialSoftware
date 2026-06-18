import { useListStudents } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EnrollStudentDialog } from "@/components/enroll-student-dialog";

const CLASS_OPTIONS = ["Form 1", "Form 2", "Form 3", "Form 4"];

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  active: "default",
  suspended: "destructive",
  cleared: "secondary",
};

export default function Students() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const { data: students, isLoading, error } = useListStudents({
    search: search || undefined,
    class: classFilter !== "all" ? classFilter : undefined,
  });

  const activeCount = students?.filter(s => s.status === "active").length ?? 0;
  const total = students?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${total} students${classFilter !== "all" ? ` in ${classFilter}` : ""} · ${activeCount} active`}
          </p>
        </div>
        <EnrollStudentDialog />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or admission no..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {CLASS_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load students.</AlertDescription>
              </Alert>
            </div>
          ) : isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No students found{classFilter !== "all" ? ` in ${classFilter}` : ""}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>NEMIS</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/50 cursor-pointer transition-colors group">
                    <TableCell>
                      <Link href={`/students/${student.id}`} className="font-medium block group-hover:text-primary transition-colors">
                        {student.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/students/${student.id}`} className="font-mono text-sm block">
                        {student.admissionNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {student.class} <span className="text-muted-foreground">{student.stream}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {student.maishaNumber ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{student.guardianName ?? "—"}</div>
                        <div className="text-muted-foreground text-xs">{student.guardianPhone ?? ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[student.status] ?? "secondary"} className="capitalize">
                        {student.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
