import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { INTAKE } from '@/copy/client';
import { COMMON } from '@/copy/fixed';
import { track } from '@/lib/analytics';
import { useIntakeDraftStore } from '@/stores/intakeDraftStore';

/** C-02 인테이크 1: 카테고리 */
export function C02IntakeCategoryPage() {
  const navigate = useNavigate();
  const category = useIntakeDraftStore((state) => state.category);
  const setCategory = useIntakeDraftStore((state) => state.setCategory);

  useEffect(() => {
    track('intake_started');
  }, []);

  return (
    <Screen>
      <ScreenHeader backTo="/c" right={<CrisisButton />} />
      <p className="pt-6.5 text-micro text-fg-muted">{INTAKE.categoryStep}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{INTAKE.categoryTitle}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{INTAKE.categoryDescription}</p>

      <div role="group" aria-label={INTAKE.categoryTitle} className="flex flex-wrap gap-1.5 pt-4">
        {INTAKE.categories.map((option) => (
          <Chip
            key={option.value}
            selected={category === option.value}
            onClick={() => setCategory(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <div className="mt-auto flex justify-end pt-8">
        <Mascot pose="choose" />
      </div>
      <div className="pb-10 pt-4">
        <Button block disabled={!category} onClick={() => navigate('/c/intake/write')}>
          {COMMON.next}
        </Button>
      </div>
    </Screen>
  );
}
