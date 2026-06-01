import { useState } from "react";
import { useListFactions, useCreateFaction, useJoinFaction, useLeaveFaction, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, UserPlus, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const createFactionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  description: z.string().max(200).optional(),
});

export default function Factions() {
  const { data: factions, isLoading } = useListFactions();
  const { data: user } = useGetMe({ query: { retry: false } });
  const createFaction = useCreateFaction();
  const joinFaction = useJoinFaction();
  const leaveFaction = useLeaveFaction();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createFactionSchema>>({
    resolver: zodResolver(createFactionSchema),
    defaultValues: {
      name: "",
      color: "#00E5FF",
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createFactionSchema>) => {
    createFaction.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Faction founded", description: "Lead your people to victory." });
        setIsDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/factions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create faction", description: err?.message, variant: "destructive" });
      }
    });
  };

  const handleJoin = (id: number) => {
    joinFaction.mutate({ data: { id } }, {
      onSuccess: () => {
        toast({ title: "Joined faction", description: "Welcome to the ranks." });
        queryClient.invalidateQueries({ queryKey: ["/api/factions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to join", description: err?.message, variant: "destructive" });
      }
    });
  };

  const handleLeave = () => {
    leaveFaction.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Left faction", description: "You are a lone wolf once again." });
        queryClient.invalidateQueries({ queryKey: ["/api/factions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to leave", description: err?.message, variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Factions</h1>
            <p className="text-muted-foreground mt-1">Join a collective to coordinate canvas strikes.</p>
          </div>
          
          {user && !user.factionId && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold tracking-wide"><Shield className="w-4 h-4 mr-2" /> Form Faction</Button>
              </DialogTrigger>
              <DialogContent className="border-primary/20 sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Found a Faction</DialogTitle>
                  <DialogDescription>Establish a new collective power on the grid.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faction Name</FormLabel>
                        <FormControl><Input placeholder="The Void" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banner Color (Hex)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} />
                            <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: field.value }} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctrine (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Our mission is..." {...field} className="resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createFaction.isPending}>
                      {createFaction.isPending ? "Establishing..." : "Establish Faction"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          {user?.factionId && (
            <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={handleLeave} disabled={leaveFaction.isPending}>
              <LogOut className="w-4 h-4 mr-2" /> Desert Faction
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {factions?.map((faction) => (
              <Card key={faction.id} className={`flex flex-col relative overflow-hidden transition-all hover:border-border/80 ${user?.factionId === faction.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/50' : 'border-border/30 bg-card/40'}`}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: faction.color }} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-xl truncate">{faction.name}</CardTitle>
                    <Badge variant="outline" className="font-mono bg-background/50 whitespace-nowrap" style={{ borderColor: `${faction.color}40`, color: faction.color }}>
                      {faction.pixelCount.toLocaleString()} px
                    </Badge>
                  </div>
                  {faction.description && (
                    <CardDescription className="line-clamp-2 text-sm mt-2">{faction.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="mt-auto pb-4">
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/30 w-fit px-2 py-1 rounded">
                    <Users className="w-4 h-4 mr-1.5" />
                    <span className="font-medium">{faction.memberCount.toLocaleString()}</span>&nbsp;operatives
                  </div>
                </CardContent>
                {user && user.factionId !== faction.id && (
                  <CardFooter className="pt-0">
                    <Button variant="secondary" className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20" onClick={() => handleJoin(faction.id)} disabled={joinFaction.isPending || !!user.factionId}>
                      <UserPlus className="w-4 h-4 mr-2" /> Join {faction.name}
                    </Button>
                  </CardFooter>
                )}
                {user?.factionId === faction.id && (
                  <CardFooter className="pt-0">
                    <div className="w-full text-center py-2 text-sm font-bold text-primary bg-primary/10 rounded">
                      Current Assignment
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
            {(!factions || factions.length === 0) && (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/20">
                No factions established yet. Be the first.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
