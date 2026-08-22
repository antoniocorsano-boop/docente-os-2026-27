create index if not exists idx_experience_feedback_academic_year
  on public.experience_feedback(academic_year_id)
  where academic_year_id is not null;

create index if not exists idx_experience_feedback_created_by
  on public.experience_feedback(created_by);
