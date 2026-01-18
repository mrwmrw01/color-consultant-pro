
import { redirect } from "next/navigation"

export default async function NewProjectPage() {
  // Redirect to clients page since projects must be created within a property context
  redirect("/dashboard/clients")
}
