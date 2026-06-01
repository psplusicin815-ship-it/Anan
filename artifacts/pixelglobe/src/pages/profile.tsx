import { useGetUserProfile } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const [, params] = useRoute("/profile/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: profile, isLoading, error } = useGetUserProfile(id, {
    query: { enabled: !!id }
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !profile ? (
          <div className="text-center py-12 text-destructive">
            <h2 className="text-xl font-bold">Profile not found</h2>
            <p className="text-muted-foreground mt-2">This operative does not exist in the database.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <Card className="border-primary/20 bg-card/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <div className="text-9xl font-black">#{profile.id}</div>
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight text-primary">{profile.username}</h1>
                    <div className="flex items-center gap-3">
                      {profile.factionName ? (
                        <Badge variant="outline" className="border-secondary text-secondary bg-secondary/10 px-3 py-1 text-sm">
                          {profile.factionName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground px-3 py-1 text-sm">
                          Unaffiliated
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Enlisted {formatDistanceToNow(new Date(profile.joinedAt))} ago
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-background/50 border border-border rounded-lg p-4 min-w-[150px] text-center">
                    <div className="text-sm text-muted-foreground mb-1 font-mono uppercase">Total Contribution</div>
                    <div className="text-3xl font-bold text-foreground font-mono">{profile.pixelCount.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Recent Activity Feed</CardTitle>
              </CardHeader>
              <CardContent>
                {!profile.recentPixels || profile.recentPixels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed border-border">
                    No recent activity.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Target Coordinates</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.recentPixels.map((pixel, i) => (
                        <TableRow key={i} className="border-border/30">
                          <TableCell className="font-mono text-muted-foreground">
                            [{pixel.x}, {pixel.y}]
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-sm border border-border shadow-sm" style={{ backgroundColor: pixel.color }} />
                              <span className="text-xs uppercase font-mono opacity-60">{pixel.color}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(pixel.placedAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
