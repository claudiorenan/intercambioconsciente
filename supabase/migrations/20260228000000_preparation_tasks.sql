-- ============================================================
-- Intercâmbio Consciente — Fase 2: Preparação Pré-Partida
-- Tables: preparation_tasks, preparation_weekly_exercises
-- ============================================================

-- ── preparation_tasks ──────────────────────────────────────

CREATE TABLE preparation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    diagnostic_id UUID REFERENCES diagnostic_results(id) ON DELETE SET NULL,

    dimension TEXT NOT NULL CHECK (dimension IN (
        'documentacao', 'financeira', 'cultural', 'linguistica', 'emocional', 'logistica'
    )),
    task_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
        'critical', 'high', 'medium', 'recommended'
    )),
    sort_order SMALLINT NOT NULL DEFAULT 0,

    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    personalization_source TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT preparation_tasks_user_key UNIQUE (user_id, task_key)
);

CREATE INDEX idx_preparation_tasks_user
    ON preparation_tasks (user_id, dimension, sort_order);

-- ── preparation_weekly_exercises ───────────────────────────

CREATE TABLE preparation_weekly_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    week_number SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 26),
    dimension TEXT NOT NULL CHECK (dimension IN (
        'cultural', 'linguistica', 'financeira'
    )),
    title TEXT NOT NULL,
    description TEXT,

    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT prep_exercises_user_week_dim UNIQUE (user_id, week_number, dimension)
);

CREATE INDEX idx_prep_exercises_user_week
    ON preparation_weekly_exercises (user_id, week_number);

-- ── updated_at trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_preparation_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_preparation_tasks_updated_at
    BEFORE UPDATE ON preparation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_preparation_tasks_updated_at();

-- ── RLS: preparation_tasks ─────────────────────────────────

ALTER TABLE preparation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preparation tasks"
    ON preparation_tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preparation tasks"
    ON preparation_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preparation tasks"
    ON preparation_tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preparation tasks"
    ON preparation_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ── RLS: preparation_weekly_exercises ──────────────────────

ALTER TABLE preparation_weekly_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercises"
    ON preparation_weekly_exercises FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
    ON preparation_weekly_exercises FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
    ON preparation_weekly_exercises FOR UPDATE
    USING (auth.uid() = user_id);
