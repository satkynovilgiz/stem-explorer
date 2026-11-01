import { ArrowLeft } from 'lucide-react'

/** The way back to Home on pages that are not a subject (the app has no global header). */
export function HomeLink() {
  return (
    <nav className="home-link-bar" aria-label="Back to Home">
      <a href="#/home" className="home-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Home</span>
      </a>
    </nav>
  )
}
