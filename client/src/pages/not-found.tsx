import { Link } from "wouter";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <h1 className="font-display text-xl">Page not found</h1>
      <Link href="/"><Button variant="outline">Back to Today</Button></Link>
    </div>
  );
}
