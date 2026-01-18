
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Palette, FileText, Users, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export function LandingPage() {
  const features = [
    {
      icon: Camera,
      title: "Photo Upload & Organization",
      description: "Mobile-friendly photo capture and project-based organization for professional consultations"
    },
    {
      icon: Palette,
      title: "Advanced Annotation Tools",
      description: "Mark photos with red annotations, tag surfaces with color codes, and add detailed notes"
    },
    {
      icon: FileText,
      title: "Automated Color Synopsis",
      description: "Generate comprehensive color reports that summarize all rooms, surfaces, and specifications"
    },
    {
      icon: Users,
      title: "Client & Project Management",
      description: "Track multiple projects, client information, and consultation progress in one place"
    }
  ]

  const benefits = [
    "Mobile-responsive design for field work",
    "Professional PDF exports for clients and crews",
    "Comprehensive color code database",
    "Surface-by-surface specifications",
    "Digital and printable workflows"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-guru-light-orange via-white to-guru-yellow/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Palette className="h-8 w-8 text-guru-orange" />
              <span className="text-xl font-bold text-guru-charcoal">Color Consultant Pro</span>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-guru-charcoal mb-6">
              Professional Color
              <span className="text-guru-orange block">Consultation Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your paint consultation workflow with photo annotation tools, 
              automated color synopsis generation, and professional reporting features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Professional Consultations
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From photo capture to final reporting, our platform handles every aspect 
              of your paint consultation workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <feature.icon className={`h-12 w-12 mb-4 ${
                      index % 4 === 0 ? 'text-guru-orange' :
                      index % 4 === 1 ? 'text-guru-lime' :
                      index % 4 === 2 ? 'text-guru-red-orange' :
                      'text-guru-yellow'
                    }`} />
                    <CardTitle className="text-xl text-guru-charcoal">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-guru-orange to-guru-red-orange">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Built for Professional Paint Consultants
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Save hours on every consultation with automated workflows and 
                professional reporting tools designed specifically for paint professionals.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <span className="text-blue-100">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Camera className="h-16 w-16 text-white mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Mobile First</h3>
                  <p className="text-blue-100">
                    Designed for on-site consultations with intuitive mobile interface
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Streamline Your Consultations?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join professional paint consultants who are saving time and delivering 
            better results with Paint Consultant Pro.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Palette className="h-6 w-6 text-guru-orange" />
              <span className="text-lg font-semibold">Color Consultant Pro</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 Color Consultant Pro. Professional color consultation software.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
