/**
 * app/page.tsx
 *
 * Profile Library — the main landing page of the simulator.
 *
 * This is a Server Component that fetches all profile summaries directly
 * from the storage service (no HTTP round-trip needed on the server).
 * It then hands the data to the client-side ProfileLibrary component
 * which handles interaction (filtering, modals, actions).
 *
 * Route: /
 */

import { listProfileSummaries } from '@/lib/profileStorage';
import ProfileLibrary from '@/components/profiles/ProfileLibrary';

export default function HomePage() {
  // Load profile summaries on the server — avoids a client-side fetch waterfall
  const profiles = listProfileSummaries();

  return <ProfileLibrary initialProfiles={profiles} />;
}
