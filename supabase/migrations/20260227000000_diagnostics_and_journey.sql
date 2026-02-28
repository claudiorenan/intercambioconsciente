-- ============================================================
-- Intercâmbio Consciente — Diagnostics & Journey Progress
-- Migration: 20260227000000_diagnostics_and_journey.sql
-- ============================================================

-- ── Table: diagnostic_results ──

CREATE TABLE IF NOT EXISTS diagnostic_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Cultural (Berry Acculturation Model)
    cultural_heritage_answers JSONB,
    cultural_contact_answers JSONB,
    heritage_score SMALLINT,
    contact_score SMALLINT,
    acculturation_strategy TEXT CHECK (acculturation_strategy IN (
        'integration', 'assimilation', 'separation', 'marginalization', 'unknown'
    )),
    cultural_readiness SMALLINT CHECK (cultural_readiness BETWEEN 0 AND 100),

    -- Financial (DSOP)
    financial_answers JSONB,
    financial_viability TEXT CHECK (financial_viability IN (
        'viavel', 'parcialmente_viavel', 'inviavel_no_prazo', 'unknown'
    )),
    financial_readiness SMALLINT CHECK (financial_readiness BETWEEN 0 AND 100),
    gap_financeiro NUMERIC(12, 2),
    meses_necessarios SMALLINT,

    -- Consolidated
    overall_readiness SMALLINT CHECK (overall_readiness BETWEEN 0 AND 100),
    classification TEXT CHECK (classification IN (
        'pending', 'pronto', 'quase_pronto',
        'preparacao_necessaria', 'preparacao_significativa', 'reavaliacao'
    )),

    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_diagnostic_results_user_date
    ON diagnostic_results (user_id, created_at DESC);

-- ── Table: journey_progress ──

CREATE TABLE IF NOT EXISTS journey_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    diagnostic_id UUID REFERENCES diagnostic_results(id) ON DELETE SET NULL,

    current_phase SMALLINT NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 5),

    phase_1_status TEXT NOT NULL DEFAULT 'not_started' CHECK (phase_1_status IN ('locked', 'not_started', 'in_progress', 'completed')),
    phase_1_completed_at TIMESTAMPTZ,

    phase_2_status TEXT NOT NULL DEFAULT 'locked' CHECK (phase_2_status IN ('locked', 'not_started', 'in_progress', 'completed')),
    phase_2_completed_at TIMESTAMPTZ,

    phase_3_status TEXT NOT NULL DEFAULT 'locked' CHECK (phase_3_status IN ('locked', 'not_started', 'in_progress', 'completed')),
    phase_3_completed_at TIMESTAMPTZ,

    phase_4_status TEXT NOT NULL DEFAULT 'locked' CHECK (phase_4_status IN ('locked', 'not_started', 'in_progress', 'completed')),
    phase_4_completed_at TIMESTAMPTZ,

    phase_5_status TEXT NOT NULL DEFAULT 'locked' CHECK (phase_5_status IN ('locked', 'not_started', 'in_progress', 'completed')),
    phase_5_completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT journey_progress_user_unique UNIQUE (user_id)
);

-- ── RLS: diagnostic_results ──

ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostics"
    ON diagnostic_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostics"
    ON diagnostic_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostics"
    ON diagnostic_results FOR UPDATE
    USING (auth.uid() = user_id);

-- ── RLS: journey_progress ──

ALTER TABLE journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journey"
    ON journey_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey"
    ON journey_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journey"
    ON journey_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- ── Trigger: updated_at ──

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_diagnostic_results_updated
    BEFORE UPDATE ON diagnostic_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_journey_progress_updated
    BEFORE UPDATE ON journey_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RPC: complete_diagnostic ──

CREATE OR REPLACE FUNCTION complete_diagnostic(
    p_heritage_answers JSONB,
    p_contact_answers JSONB,
    p_financial_answers JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_heritage_score SMALLINT;
    v_contact_score SMALLINT;
    v_strategy TEXT;
    v_cultural_readiness SMALLINT;
    v_financial_readiness SMALLINT;
    v_viability TEXT;
    v_gap NUMERIC(12, 2);
    v_meses SMALLINT;
    v_overall SMALLINT;
    v_classification TEXT;
    v_diag_id UUID;
    v_heritage_high BOOLEAN;
    v_contact_high BOOLEAN;
    v_custo_total NUMERIC;
    v_reserva NUMERIC;
    v_poupanca NUMERIC;
    v_meses_ate SMALLINT;
    v_total_disponivel NUMERIC;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- ── Cultural Scores ──
    -- Sum answers (each 1-5), max 25 per dimension
    SELECT COALESCE(SUM((val)::int), 0)::SMALLINT INTO v_heritage_score
    FROM jsonb_array_elements_text(p_heritage_answers) AS val;

    SELECT COALESCE(SUM((val)::int), 0)::SMALLINT INTO v_contact_score
    FROM jsonb_array_elements_text(p_contact_answers) AS val;

    v_heritage_high := v_heritage_score >= 15;
    v_contact_high := v_contact_score >= 15;

    -- Berry Acculturation Strategy
    IF v_heritage_high AND v_contact_high THEN
        v_strategy := 'integration';
    ELSIF NOT v_heritage_high AND v_contact_high THEN
        v_strategy := 'assimilation';
    ELSIF v_heritage_high AND NOT v_contact_high THEN
        v_strategy := 'separation';
    ELSE
        v_strategy := 'marginalization';
    END IF;

    -- Cultural readiness: average of both scaled to 0-100
    v_cultural_readiness := LEAST(100, GREATEST(0,
        ((v_heritage_score + v_contact_score)::NUMERIC / 50.0 * 100)::SMALLINT
    ));

    -- ── Financial Scores ──
    v_custo_total := COALESCE((p_financial_answers->>'custoTotal')::NUMERIC, 0);
    v_reserva := COALESCE((p_financial_answers->>'reservaAtual')::NUMERIC, 0);
    v_poupanca := COALESCE((p_financial_answers->>'capacidadePoupanca')::NUMERIC, 0);
    v_meses_ate := COALESCE((p_financial_answers->>'mesesAteEmbarque')::SMALLINT, 12);

    v_total_disponivel := v_reserva + (v_poupanca * v_meses_ate);
    v_gap := GREATEST(0, v_custo_total - v_total_disponivel);

    IF v_poupanca > 0 AND v_gap > 0 THEN
        v_meses := CEIL(v_gap / v_poupanca)::SMALLINT;
    ELSE
        v_meses := 0;
    END IF;

    IF v_total_disponivel >= v_custo_total THEN
        v_viability := 'viavel';
        v_financial_readiness := 100;
    ELSIF v_total_disponivel >= v_custo_total * 0.7 THEN
        v_viability := 'parcialmente_viavel';
        v_financial_readiness := LEAST(100, GREATEST(0,
            (v_total_disponivel / NULLIF(v_custo_total, 0) * 100)::SMALLINT
        ));
    ELSE
        v_viability := 'inviavel_no_prazo';
        v_financial_readiness := LEAST(100, GREATEST(0,
            (v_total_disponivel / NULLIF(v_custo_total, 0) * 100)::SMALLINT
        ));
    END IF;

    -- ── Overall Readiness (40% cultural + 60% financial) ──
    v_overall := LEAST(100, GREATEST(0,
        (v_cultural_readiness * 0.4 + v_financial_readiness * 0.6)::SMALLINT
    ));

    -- Classification
    IF v_overall >= 85 THEN
        v_classification := 'pronto';
    ELSIF v_overall >= 70 THEN
        v_classification := 'quase_pronto';
    ELSIF v_overall >= 50 THEN
        v_classification := 'preparacao_necessaria';
    ELSIF v_overall >= 30 THEN
        v_classification := 'preparacao_significativa';
    ELSE
        v_classification := 'reavaliacao';
    END IF;

    -- ── Insert diagnostic_results ──
    INSERT INTO diagnostic_results (
        user_id,
        cultural_heritage_answers, cultural_contact_answers,
        heritage_score, contact_score,
        acculturation_strategy, cultural_readiness,
        financial_answers, financial_viability, financial_readiness,
        gap_financeiro, meses_necessarios,
        overall_readiness, classification,
        completed_at
    ) VALUES (
        v_user_id,
        p_heritage_answers, p_contact_answers,
        v_heritage_score, v_contact_score,
        v_strategy, v_cultural_readiness,
        p_financial_answers, v_viability, v_financial_readiness,
        v_gap, v_meses,
        v_overall, v_classification,
        now()
    ) RETURNING id INTO v_diag_id;

    -- ── Upsert journey_progress ──
    INSERT INTO journey_progress (
        user_id, diagnostic_id, current_phase,
        phase_1_status, phase_1_completed_at,
        phase_2_status
    ) VALUES (
        v_user_id, v_diag_id, 2,
        'completed', now(),
        'not_started'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        diagnostic_id = v_diag_id,
        current_phase = 2,
        phase_1_status = 'completed',
        phase_1_completed_at = COALESCE(journey_progress.phase_1_completed_at, now()),
        phase_2_status = CASE
            WHEN journey_progress.phase_2_status = 'completed' THEN 'completed'
            ELSE 'not_started'
        END,
        updated_at = now();

    -- ── Return result ──
    RETURN jsonb_build_object(
        'diagnostic_id', v_diag_id,
        'heritage_score', v_heritage_score,
        'contact_score', v_contact_score,
        'acculturation_strategy', v_strategy,
        'cultural_readiness', v_cultural_readiness,
        'financial_viability', v_viability,
        'financial_readiness', v_financial_readiness,
        'gap_financeiro', v_gap,
        'meses_necessarios', v_meses,
        'overall_readiness', v_overall,
        'classification', v_classification
    );
END;
$$;
