import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Camera,
  Palette,
  FileText,
  FolderOpen,
  Tag,
  BookOpen,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  const quickStart = [
    { step: "Add a client", detail: "Clients → New Client, or Import Clients to load a CSV/Excel spreadsheet." },
    { step: "Add the property", detail: "Open the client → Add Property and enter the address." },
    { step: "Start a project", detail: "Open the property → New Project." },
    { step: "Upload photos", detail: "In the project, click Upload Photos and pick photos from your phone or computer." },
    { step: "Annotate colors", detail: "Click Annotate on a photo and tag each surface with its color, product line and sheen." },
    { step: "Send the synopsis", detail: "In the project, click Edit Synopsis, review the draft, then Export DOCX for the painter." },
  ]

  const helpCategories = [
    {
      title: "Clients & Projects",
      description: "How work is organized",
      icon: FolderOpen,
      topics: [
        { q: "How is information organized?", a: "Each client has one or more properties, and each property has its projects. Rooms are shared across all projects." },
        { q: "Can I import my existing client list?", a: "Yes. On the Clients page choose Import Clients and upload a CSV or Excel file with columns such as name, contact, email and phone." },
        { q: "How do I edit or remove records?", a: "Use the edit and delete buttons on each client, property or project card. Settings → Cleanup Tools lets you review and bulk-delete old records." },
      ]
    },
    {
      title: "Photos",
      description: "Uploading and organizing photos",
      icon: Camera,
      topics: [
        { q: "What photos can I upload?", a: "JPG, PNG or WebP photos from a phone or camera; iPhones convert their photos automatically when uploading through the browser. Several photos can be uploaded at once." },
        { q: "Why do uploads look smaller?", a: "Photos are optimized automatically into thumbnail, medium and large sizes so galleries load quickly. The detail stays sharp enough for annotation and reports." },
        { q: "How do I move between photos?", a: "In the annotator use the previous/next arrows, or the ← and → keys." },
      ]
    },
    {
      title: "Color Annotation",
      description: "Tagging colors on photos",
      icon: Tag,
      topics: [
        { q: "Which tools are available?", a: "The toolbar has a Color tag tool, a Pen for freehand marks and a Text tool, plus Undo, Redo and Clear all." },
        { q: "How do I tag a color?", a: "Pick the Color tag tool, click the surface, then choose the color (search by name, code or manufacturer), surface type, product line and sheen. Add notes if needed." },
        { q: "Do I need to save?", a: "No. Annotations and the annotated photo save automatically as you work." },
        { q: "What does the amber warning mean?", a: "The product line does not match the room — for example an interior product on an exterior surface. Change the product, or confirm the override if it is intentional." },
      ]
    },
    {
      title: "Color Catalog",
      description: "Paint colors and brands",
      icon: Palette,
      topics: [
        { q: "Which colors are included?", a: "The full Sherwin-Williams and Benjamin Moore catalogs. Browse them on the Colors page." },
        { q: "How do favorites and recent colors work?", a: "Star a color to add it to your favorites. Colors you used recently appear at the top of the color picker." },
        { q: "A color is missing — can I add it?", a: "Yes. Use Add custom color in the annotator, or Settings → Color Catalog to manage manufacturers, edit colors or import a CSV." },
      ]
    },
    {
      title: "Synopsis & Reports",
      description: "The painter-ready color synopsis",
      icon: FileText,
      topics: [
        { q: "How is the synopsis created?", a: "Edit Synopsis builds a first draft from your annotations, grouping rooms that share the same color, product and sheen." },
        { q: "What can I change?", a: "Client details, the color summary, room labels and notes tags. Drag groups and columns to reorder them. Edits save automatically a few seconds after you stop typing." },
        { q: "How do I start over?", a: "Reset rebuilds the draft from the current annotations. It replaces your edits, so you will be asked to confirm." },
        { q: "How do I send it?", a: "Export DOCX downloads a Word document with the color tables and photos, ready to email to the painter." },
      ]
    },
    {
      title: "Account & Data",
      description: "Profile, password and backups",
      icon: BookOpen,
      topics: [
        { q: "How do I change my password?", a: "Open your profile from the menu (or Settings → Account) and use Change Password." },
        { q: "How do I back up my work?", a: "Settings → Data Management → Export All Data downloads everything you have entered as a JSON file." },
        { q: "Can others sign up?", a: "New accounts are created by the administrator; public sign-up is turned off." },
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help & Documentation</h1>
          <p className="text-gray-600 mt-1">
            Learn how to use Color Consultant Pro effectively
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Quick Start</CardTitle>
          <CardDescription className="text-blue-700">
            From a new client to a finished color synopsis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {quickStart.map((item, index) => (
              <li key={item.step} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-blue-900">
                  <span className="font-semibold">{item.step}.</span> {item.detail}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpCategories.map((category) => (
          <Card key={category.title} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5 text-blue-600" />
                {category.title}
              </CardTitle>
              <CardDescription>
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {category.topics.map((topic) => (
                  <div key={topic.q}>
                    <dt className="text-sm font-medium text-gray-900">{topic.q}</dt>
                    <dd className="text-sm text-gray-600 mt-0.5">{topic.a}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Information */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need More Help?</h3>
          <p className="text-sm text-gray-600">
            Contact your administrator for new accounts, access problems or anything not covered here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
