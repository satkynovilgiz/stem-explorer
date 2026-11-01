import { AppLink } from '../../../components/AppLink'
import { parseChemLearn } from '../../../lib/urlState'
import { EntryPage } from '../../reference/EntryPage'
import { useManifest } from '../../reference/useManifest'
import '../../../styles/reference.css'

/**
 * A Chemistry reading page (`?csec=learn&lt=<entry>`): the reference entry, shown inside Chemistry
 * with Chemistry's breadcrumb, so explanations are not duplicated between the two places.
 */
export function ChemLearnPage() {
  const { topic, focus } = parseChemLearn(window.location.search)
  const [manifest] = useManifest()
  if (!topic)
    return (
      <div className="ref-page">
        <div className="ref-state" role="alert">
          <h1 className="ref-state-title">No explanation was named in this link</h1>
          <p>
            Go to <AppLink href="?csec=topics#/chemistry">Chemistry topics</AppLink> to find one.
          </p>
        </div>
      </div>
    )
  return <EntryPage subject="chemistry" id={topic} manifest={manifest.state === 'ready' ? manifest.byId : null} context="chemistry" focus={focus} />
}
