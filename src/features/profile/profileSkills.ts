import { getProfileSkillLabels } from '@/src/features/profile/RoleExpertiseSection';
import type { ProfessionalProfile, ProfileOptions } from '@/src/types/api';
import { normalizeOptions } from '@/src/features/profile/profileOptions';

export function getTopSkillLabels(
  profile?: ProfessionalProfile | null,
  options?: ProfileOptions,
) {
  const disciplineOptions = normalizeOptions(options?.disciplines);
  const specializationOptions = normalizeOptions(options?.specializations);
  const projectTypeOptions = normalizeOptions(options?.projectTypes);

  return getProfileSkillLabels(profile, {
    disciplines: disciplineOptions,
    specializations: specializationOptions,
    projectTypes: projectTypeOptions,
  });
}

export const BIO_MAX_LENGTH = 2600;
