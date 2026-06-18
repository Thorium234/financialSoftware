import { useListStudents } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Filter, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EnrollStudentDialog } from "@/components/enroll-student-dialog";

export default function Students() {
  const [search, setSearch] = useState("");
  const { data: students, isLoading, error } = useListStudents({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records, NEMIS details, and outstanding balances.</p>
        </div>
        <EnrollStudentDialog />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or admission no..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Filter by Class
              </Button>
            </div>
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
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No students found matching your search.</p>
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
                    <TableCell>
                      {student.class} {student.stream}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {student.maishaNumber || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{student.guardianName || "-"}</div>
                        <div className="text-muted-foreground text-xs">{student.guardianPhone || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'default' : student.status === 'suspended' ? 'destructive' : 'secondary'}>
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
