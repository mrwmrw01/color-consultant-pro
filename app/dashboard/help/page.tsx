
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Camera, 
  Palette, 
  FileText, 
  FolderOpen, 
  Tag, 
  Download,
  BookOpen,
  Video,
  MessageCircle,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  const helpCategories = [
    {
      title: "Getting Started",
      description: "Learn the basics of Color Consultant Pro",
      icon: BookOpen,
      topics: [
        "Creating your first project",
        "Setting up client information", 
        "Organizing rooms and spaces",
        "Understanding the dashboard"
      ]
    },
    {
      title: "Photo Management",
      description: "Upload, organize, and work with photos",
      icon: Camera,
      topics: [
        "Uploading photos to projects",
        "Organizing photos by room",
        "Photo quality best practices",
        "Managing large photo collections"
      ]
    },
    {
      title: "Color Annotation",
      description: "Tag colors and create annotations", 
      icon: Tag,
      topics: [
        "Using the annotation tools",
        "Selecting color codes",
        "Adding custom colors",
        "Annotation best practices"
      ]
    },
    {
      title: "Color Catalog",
      description: "Work with paint colors and brands",
      icon: Palette,
      topics: [
        "Browsing color catalog",
        "Adding custom colors",
        "Managing color preferences",
        "Understanding color codes"
      ]
    },
    {
      title: "Synopsis & Reports",
      description: "Generate professional color reports",
      icon: FileText,
      topics: [
        "Creating color synopsis forms",
        "Exporting to Excel/PDF",
        "Customizing report templates",
        "Sharing reports with clients"
      ]
    },
    {
      title: "Project Management",
      description: "Organize and manage client projects",
      icon: FolderOpen,
      topics: [
        "Project organization tips",
        "Managing multiple clients",
        "Project archiving",
        "Data backup strategies"
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-900 mb-1">Video Tutorials</h3>
            <p className="text-sm text-blue-700 mb-3">Watch step-by-step guides</p>
            <Button size="sm" variant="outline" className="border-blue-300" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-900 mb-1">Support Chat</h3>
            <p className="text-sm text-green-700 mb-3">Get help from our team</p>
            <Button size="sm" variant="outline" className="border-green-300" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6 text-center">
            <Download className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900 mb-1">User Guide</h3>
            <p className="text-sm text-purple-700 mb-3">Download PDF manual</p>
            <Button size="sm" variant="outline" className="border-purple-300" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpCategories.map((category, index) => (
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
              <ul className="space-y-2">
                {category.topics.map((topic, topicIndex) => (
                  <li key={topicIndex} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-1 w-1 bg-gray-400 rounded-full flex-shrink-0" />
                    {topic}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4" disabled>
                View Details (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Information */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Need More Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Can't find what you're looking for? Our support team is here to help you get the most out of Color Consultant Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" disabled>
              Contact Support
            </Button>
            <Button variant="outline" disabled>
              Request Feature
            </Button>
            <Button variant="outline" disabled>
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
