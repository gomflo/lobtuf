import fs from 'fs';
import path from 'path';

export interface Match {
  hora: string;
  competicion: string;
  equipoLocal: string;
  equipoVisitante: string;
  canales: string[];
}

export const readMatches = (): Match[] => {
  try {
    const filePath = path.join(process.cwd(), 'partidos-hoy.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContents) as Match[];
  } catch (error) {
    console.error('Error reading matches file:', error);
    return [];
  }
};

export const getUniqueCompetitions = (matches: Match[]): string[] => {
  const competitions = new Set(matches.map((match) => match.competicion));
  return Array.from(competitions).sort();
};

export const getUniqueTeams = (matches: Match[]): string[] => {
  const teams = new Set<string>();
  matches.forEach((match) => {
    teams.add(match.equipoLocal);
    teams.add(match.equipoVisitante);
  });
  return Array.from(teams).sort();
};

export const filterMatches = (
  matches: Match[],
  searchTerm: string,
  competition?: string,
  team?: string
): Match[] => {
  return matches.filter((match) => {
    const matchesSearch =
      !searchTerm ||
      match.equipoLocal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.equipoVisitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.competicion.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompetition = !competition || match.competicion === competition;

    const matchesTeam =
      !team ||
      match.equipoLocal === team ||
      match.equipoVisitante === team;

    return matchesSearch && matchesCompetition && matchesTeam;
  });
};

