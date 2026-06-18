import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useVerifyAdmin } from "@workspace/api-client-react";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

const loginSchema = z.object({
  pin: z.string().min(4, "PIN must be at least 4 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setPin } = useAdmin();
  const { toast } = useToast();
  
  const verifyAdmin = useVerifyAdmin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { pin: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    verifyAdmin.mutate(
      { data: { pin: values.pin } },
      {
        onSuccess: (data) => {
          if (data.valid) {
            setPin(values.pin);
            setLocation("/conferences");
          } else {
            toast({
              variant: "destructive",
              title: "Invalid PIN",
              description: "The PIN you entered is incorrect.",
            });
          }
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "There was an error verifying your PIN.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-sm">
            <Layers className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
          Conference Admin
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your operator PIN to access the dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin PIN</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={verifyAdmin.isPending}
                >
                  {verifyAdmin.isPending ? "Verifying..." : "Enter Console"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
