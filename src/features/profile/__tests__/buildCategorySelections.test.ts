import { buildCategorySelections } from '@/src/features/profile/profileOptions';

describe('buildCategorySelections', () => {
  it('nests selected specializations under their discipline', () => {
    const tree = buildCategorySelections(
      { disciplineIds: ['DESIGNERS'], specializationIds: ['ARCHITECT'], projectTypeIds: [] },
      [],
      [],
    );
    expect(tree).toEqual([
      { discipline: 'DESIGNERS', specializations: [{ specialization: 'ARCHITECT', projectTypes: [] }] },
    ]);
  });

  it('keeps disciplines without a specialization tier (builders)', () => {
    const tree = buildCategorySelections(
      { disciplineIds: ['BUILDINGS', 'INFRASTRUCTURE'], specializationIds: [], projectTypeIds: [] },
      [],
      [],
    );
    expect(tree).toEqual([
      { discipline: 'BUILDINGS', specializations: [] },
      { discipline: 'INFRASTRUCTURE', specializations: [] },
    ]);
  });

  it('keeps saved per-specialization project types and drops deselected ones', () => {
    const saved = [
      {
        discipline: 'DESIGNERS',
        specializations: [{ specialization: 'ARCHITECT', projectTypes: ['RESIDENTIAL', 'COMMERCIAL'] }],
      },
    ];
    const tree = buildCategorySelections(
      { disciplineIds: ['DESIGNERS'], specializationIds: ['ARCHITECT'], projectTypeIds: ['RESIDENTIAL'] },
      saved,
      [],
    );
    expect(tree?.[0].specializations[0].projectTypes).toEqual(['RESIDENTIAL']);
  });

  it('attaches newly picked project types to every specialization', () => {
    const tree = buildCategorySelections(
      {
        disciplineIds: ['DESIGNERS'],
        specializationIds: ['ARCHITECT', 'INTERIOR'],
        projectTypeIds: ['HOSPITALITY'],
      },
      [],
      [],
    );
    expect(tree?.[0].specializations.map((s) => s.projectTypes)).toEqual([
      ['HOSPITALITY'],
      ['HOSPITALITY'],
    ]);
  });

  it('returns null when project types have no specialization to live under', () => {
    expect(
      buildCategorySelections(
        { disciplineIds: ['BUILDINGS'], specializationIds: [], projectTypeIds: ['RESIDENTIAL'] },
        [],
        [],
      ),
    ).toBeNull();
  });
});
