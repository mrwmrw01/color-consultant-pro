import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Palette, Upload } from "lucide-react"

export default function AdminIndexPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/dashboard/admin/manufacturers">
        <Card className="hover:border-slate-400 transition">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-slate-600" />
              <CardTitle>Manufacturers</CardTitle>
            </div>
            <CardDescription>Add or edit paint brands like SW, BM, Farrow & Ball, PPG.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link href="/dashboard/admin/colors">
        <Card className="hover:border-slate-400 transition">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-slate-600" />
              <CardTitle>Colors</CardTitle>
            </div>
            <CardDescription>Browse, search, add, edit, or discontinue colors in the catalog.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link href="/dashboard/admin/colors/import">
        <Card className="hover:border-slate-400 transition">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-slate-600" />
              <CardTitle>Bulk CSV Import</CardTitle>
            </div>
            <CardDescription>Upload a CSV of colors with preview and dedupe check.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
