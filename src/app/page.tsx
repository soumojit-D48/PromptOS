import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, GitBranch, FlaskConical, BarChart3, Key, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-2xl font-bold">PromptOS</div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            GitHub + Vercel, for AI prompts
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Store, version, test, and deploy AI prompts. Run A/B experiments,
            track analytics, and serve prompts via API — all in one platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg">Start Free</Button>
            </Link>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>AI Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Run prompts with streaming output. Test with real variables
                  before deploying.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GitBranch className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>Version Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Every save creates an immutable version. Rollback, diff, and
                  publish with confidence.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FlaskConical className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>A/B Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Compare versions with real inputs. Let data decide which
                  prompt performs best.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track latency, token usage, and costs. See trends over time
                  with beautiful charts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Key className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>Public API</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Serve prompts to external apps via REST API. Control access
                  with API keys.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Invite teammates with Owner, Editor, or Viewer roles. Work
                  together on prompts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center">
                <Badge variant="secondary" className="mb-2">Free</Badge>
                <CardTitle className="text-4xl">$0</CardTitle>
                <p className="text-muted-foreground">forever</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>10 prompts</p>
                <p>3 team members</p>
                <p>50 test runs/day</p>
                <p>100 API calls/day</p>
                <p>Semantic search</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader className="text-center">
                <Badge className="mb-2">Pro</Badge>
                <CardTitle className="text-4xl">$19</CardTitle>
                <p className="text-muted-foreground">/month</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Unlimited prompts</p>
                <p>10 team members</p>
                <p>Unlimited test runs</p>
                <p>10,000 API calls/day</p>
                <p>Everything in free</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2026 PromptOS. Built for AI teams.</p>
        </div>
      </footer>
    </div>
  );
}