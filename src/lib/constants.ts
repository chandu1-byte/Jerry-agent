import { PaymentMode, Project } from '../types/accounting';

export const INITIAL_PROJECTS: Omit<Project, 'createdAt'>[] = [
  {
    id: 'proj_natraju',
    name: 'NATRAJU',
    aliases: ['natraju', 'natraj', 'natraju project'],
    description: 'Natraju Real Estate Layout',
    active: true,
  },
  {
    id: 'proj_br',
    name: 'BR',
    aliases: ['br', 'b r', 'br project'],
    description: 'BR Project Venture',
    active: true,
  },
  {
    id: 'proj_br_2',
    name: 'BR-2',
    aliases: ['br-2', 'br 2', 'br2'],
    description: 'BR Phase 2',
    active: true,
  },
  {
    id: 'proj_200_cents',
    name: '200 CENTS',
    aliases: ['200 cents', '200cents', '200 cent', 'two hundred cents'],
    description: '200 Cents Land Venture',
    active: true,
  },
  {
    id: 'proj_sr',
    name: 'SR',
    aliases: ['sr', 's r', 'sr project'],
    description: 'SR Project Development',
    active: true,
  },
  {
    id: 'proj_sr_2',
    name: 'SR-2',
    aliases: ['sr-2', 'sr 2', 'sr2'],
    description: 'SR Phase 2',
    active: true,
  },
  {
    id: 'proj_rk',
    name: 'RK',
    aliases: ['rk', 'r k', 'rk project'],
    description: 'RK Venture Sites',
    active: true,
  },
  {
    id: 'proj_babul_reddy_syte',
    name: 'BABUL REDDY SYTE',
    aliases: ['babul', 'babul reddy', 'babul site', 'babul syte', 'babul reddy site'],
    description: 'Babul Reddy Syte Venture',
    active: true,
  },
  {
    id: 'proj_boru_ramasubbareddy',
    name: 'BORU RAMASUBBAREDDY',
    aliases: ['boru', 'ramasubbareddy', 'boru ramasubbareddy', 'ramasubba reddy'],
    description: 'Boru Ramasubbareddy Venture',
    active: true,
  },
  {
    id: 'proj_25_cents',
    name: '25 CENTS',
    aliases: ['25 cents', '25cents', '25 cent', 'twenty five cents'],
    description: '25 Cents Land Project',
    active: true,
  },
  {
    id: 'proj_47_cents',
    name: '47 CENTS',
    aliases: ['47 cents', '47cents', '47 cent', 'forty seven cents'],
    description: '47 Cents Land Project',
    active: true,
  },
  {
    id: 'proj_49_cents',
    name: '49 CENTS',
    aliases: ['49 cents', '49cents', '49 cent', 'forty nine cents'],
    description: '49 Cents Land Project',
    active: true,
  },
];

export const PAYMENT_MODES: PaymentMode[] = ['CASH', 'HDFC', 'SBI', 'UNION'];

export function resolveProjectAlias(rawName: string, availableProjects: Project[]): Project | undefined {
  if (!rawName) return undefined;
  const clean = rawName.trim().toLowerCase();

  // Special alias rule: "Babul" strictly resolves to "BABUL REDDY SYTE"
  if (clean === 'babul' || clean.includes('babul')) {
    const babulProj = availableProjects.find(p => p.name === 'BABUL REDDY SYTE');
    if (babulProj) return babulProj;
  }

  // Exact match
  const exact = availableProjects.find(p => p.name.toLowerCase() === clean);
  if (exact) return exact;

  // Check aliases
  const aliasMatch = availableProjects.find(p =>
    p.aliases?.some(a => a.toLowerCase() === clean || clean.includes(a.toLowerCase()))
  );
  if (aliasMatch) return aliasMatch;

  // Substring search
  const subMatch = availableProjects.find(p => clean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(clean));
  return subMatch;
}
