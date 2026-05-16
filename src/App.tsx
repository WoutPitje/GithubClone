import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" />
            <CardTitle>Welcome</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            This is your starter app. Ask the AI in the chat to change anything.
          </p>
          <Button>Get started</Button>
        </CardContent>
      </Card>
    </div>
  )
}
