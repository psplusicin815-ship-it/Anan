import { useGetLeaderboard, useGetCanvasStats } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();
  const { data: stats } = useGetCanvasStats();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Global Leaderboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Pixels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalPixels?.toLocaleString() || <Skeleton className="h-9 w-24" />}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Commandos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats?.activeUsers?.toLocaleString() || <Skeleton className="h-9 w-24" />}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dominant Color</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topColors?.[0] ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm shadow-sm ring-1 ring-border" style={{ backgroundColor: stats.topColors[0].color }} />
                  <div className="text-2xl font-bold">{stats.topColors[0].count.toLocaleString()}</div>
                </div>
              ) : (
                <Skeleton className="h-9 w-24" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Top Placers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Faction</TableHead>
                    <TableHead className="text-right">Pixels Placed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard?.map((entry) => (
                    <TableRow key={entry.userId} className="border-border/50 transition-colors">
                      <TableCell className="text-center font-mono text-muted-foreground">#{entry.rank}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/profile/${entry.userId}`} className="hover:text-primary transition-colors">
                          {entry.username}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {entry.factionName ? (
                          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">{entry.factionName}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Lone Wolf</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-secondary">{entry.pixelCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!leaderboard || leaderboard.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No pixels placed yet. The canvas is pristine.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
