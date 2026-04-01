/**
 * app/simulator/page.tsx
 *
 * Simulator Dashboard — server component entry point.
 *
 * Reads the profileId and profileType from the URL search params,
 * loads the full profile server-side, and passes it to the client
 * SimulatorDashboard component.
 *
 * Route: /simulator?id=[profileId]&type=[profileType]
 *
 * If no valid profile is found, redirects back to the Profile Library.
 */

import { redirect } from 'next/navigation';
import { loadProfile } from '@/lib/profileStorage';
import { CompanyProfile } from '@/types/profile';
import SimulatorDashboard from '@/components/simulator/SimulatorDashboard';

interface SimulatorPageProps {
  searchParams: Promise<{ id?: string; type?: string }>;
}

export default async function SimulatorPage({ searchParams }: SimulatorPageProps) {
  const params = await searchParams;
  const { id, type } = params;

  // Validate params — redirect to library if missing or invalid
  if (!id || !type) {
    redirect('/');
  }

  const validTypes: CompanyProfile['profileType'][] = ['template', 'custom', 'prospect', 'archive'];
  if (!validTypes.includes(type as CompanyProfile['profileType'])) {
    redirect('/');
  }

  const profile = loadProfile(id, type as CompanyProfile['profileType']);
  if (!profile) {
    redirect('/');
  }

  return <SimulatorDashboard profile={profile} />;
}
