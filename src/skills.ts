import catalog from '../shared/skills.json';

export type SkillCategory = {category: string; skills: string[]};
export const SKILL_CATEGORIES: SkillCategory[] = catalog;
export const SKILLS: string[] = SKILL_CATEGORIES.flatMap(group => group.skills);
export const SKILL_COUNT = SKILLS.length;
const canonicalSkills = new Map(SKILLS.map(skill => [skill.toLowerCase(), skill]));

// Accept DB JSON or form arrays. Preserve older saved skills until explicitly removed.
export function parseSkills(value: unknown): string[] {
  let decoded = value;
  if (typeof value === 'string') {
    try {decoded = JSON.parse(value);} catch {return [];}
  }
  if (!Array.isArray(decoded)) return [];
  const seen = new Set<string>();
  return decoded.filter((skill): skill is string => typeof skill === 'string' && !!skill.trim())
    .map(skill => canonicalSkills.get(skill.trim().toLowerCase()) || skill.trim())
    .filter(skill => {
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function matchesSkills(available: unknown, selected: readonly string[]): boolean {
  if (!selected.length) return true;
  const skills = new Set(parseSkills(available).map(skill => skill.toLowerCase()));
  return selected.some(skill => skills.has(skill.toLowerCase()));
}
