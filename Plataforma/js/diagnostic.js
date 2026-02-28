/**
 * Intercâmbio Consciente — Diagnostic Module
 * Berry Acculturation Model + DSOP Financial Framework
 */

const Diagnostic = {

    // ── Cultural Heritage Questions (Berry — Maintenance of Origin Culture) ──
    culturalHeritage: [
        { id: 'h1', text: 'Mantenho e valorizo as tradições e costumes da minha cultura de origem.' },
        { id: 'h2', text: 'Sinto orgulho da minha identidade cultural brasileira.' },
        { id: 'h3', text: 'Busco manter contato com pessoas da minha cultura mesmo no exterior.' },
        { id: 'h4', text: 'Considero importante preservar meu idioma e sotaque originais.' },
        { id: 'h5', text: 'Gostaria de transmitir valores culturais brasileiros onde quer que eu vá.' },
    ],

    // ── Cultural Contact Questions (Berry — Contact with Host Culture) ──
    culturalContact: [
        { id: 'c1', text: 'Tenho interesse genuíno em conhecer e vivenciar outras culturas.' },
        { id: 'c2', text: 'Me sinto confortável em ambientes multiculturais e diversos.' },
        { id: 'c3', text: 'Estou disposto(a) a adaptar meus hábitos ao país de destino.' },
        { id: 'c4', text: 'Busco ativamente aprender o idioma e costumes do país anfitrião.' },
        { id: 'c5', text: 'Acredito que conviver com a cultura local enriquece minha experiência.' },
    ],

    // ── Financial Fields (DSOP — Fase D: Diagnosticar) ──
    financialFields: [
        { id: 'rendaMensal', label: 'Renda mensal líquida (R$)', type: 'number', placeholder: '0,00', required: true },
        { id: 'despesasMensais', label: 'Despesas mensais fixas (R$)', type: 'number', placeholder: '0,00' },
        { id: 'reservaAtual', label: 'Reserva financeira atual (R$)', type: 'number', placeholder: '0,00', required: true },
        { id: 'custoTotal', label: 'Custo total estimado do intercâmbio (R$)', type: 'number', placeholder: '0,00', required: true },
        { id: 'capacidadePoupanca', label: 'Capacidade de poupança mensal (R$)', type: 'number', placeholder: '0,00', required: true },
        { id: 'mesesAteEmbarque', label: 'Meses até o embarque', type: 'number', placeholder: '12', required: true },
        { id: 'temFinanciamento', label: 'Possui financiamento/empréstimo?', type: 'select', options: ['Não', 'Sim, até 30% da renda', 'Sim, mais de 30% da renda'] },
        { id: 'temRendaExtra', label: 'Possui fonte de renda extra?', type: 'select', options: ['Não', 'Sim, freelancer/bico', 'Sim, renda passiva'] },
    ],

    // ── Journey Phases ──
    phases: [
        { num: 1, emoji: '\uD83C\uDFAF', name: 'Diagnóstico', duration: '1-2 semanas', desc: 'Avalie sua prontidão cultural e financeira para o intercâmbio.' },
        { num: 2, emoji: '\uD83D\uDCDA', name: 'Preparação', duration: '3-6 meses', desc: 'Planejamento financeiro, cultural e linguístico antes da viagem.' },
        { num: 3, emoji: '\u2708\uFE0F', name: 'Primeiros 90 Dias', duration: '3 meses', desc: 'Adaptação inicial, choque cultural e construção de rede de apoio.' },
        { num: 4, emoji: '\uD83C\uDF0D', name: 'Vivência', duration: '3-12 meses', desc: 'Imersão profunda na cultura, desenvolvimento pessoal e profissional.' },
        { num: 5, emoji: '\uD83C\uDFE0', name: 'Retorno', duration: '1-3 meses', desc: 'Reintegração cultural, aplicação dos aprendizados e próximos passos.' },
    ],

    // ── Likert Scale Labels ──
    likertLabels: [
        'Discordo totalmente',
        'Discordo',
        'Neutro',
        'Concordo',
        'Concordo totalmente',
    ],

    // ── Supabase Operations ──

    async loadLatest(userId) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return null;

        const { data, error } = await sb
            .from('diagnostic_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error loading diagnostic:', error);
            return null;
        }
        return data;
    },

    async loadJourneyProgress(userId) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return null;

        const { data, error } = await sb
            .from('journey_progress')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error loading journey progress:', error);
            return null;
        }
        return data;
    },

    async updatePhaseStatus(userId, phaseNum, newStatus) {
        const sb = window.supabaseClient;
        if (!sb || !userId) throw new Error('Not initialized');

        const updates = { [`phase_${phaseNum}_status`]: newStatus };

        if (newStatus === 'completed') {
            updates[`phase_${phaseNum}_completed_at`] = new Date().toISOString();
            // Unlock next phase and advance current_phase
            if (phaseNum < 5) {
                updates[`phase_${phaseNum + 1}_status`] = 'not_started';
                updates.current_phase = phaseNum + 1;
            }
        } else if (newStatus === 'in_progress') {
            updates.current_phase = phaseNum;
        }

        const { error } = await sb
            .from('journey_progress')
            .update(updates)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async submitDiagnostic(heritageAnswers, contactAnswers, financialAnswers) {
        const sb = window.supabaseClient;
        if (!sb) throw new Error('Supabase not initialized');

        const { data, error } = await sb.rpc('complete_diagnostic', {
            p_heritage_answers: heritageAnswers,
            p_contact_answers: contactAnswers,
            p_financial_answers: financialAnswers,
        });

        if (error) throw error;
        return data;
    },

    // ── Client-Side Calculation Helpers (preview before submit) ──

    calcAcculturationStrategy(heritageScore, contactScore) {
        const hHigh = heritageScore >= 15;
        const cHigh = contactScore >= 15;

        if (hHigh && cHigh) return 'integration';
        if (!hHigh && cHigh) return 'assimilation';
        if (hHigh && !cHigh) return 'separation';
        return 'marginalization';
    },

    calcFinancialViability(financial) {
        const custoTotal = parseFloat(financial.custoTotal) || 0;
        const reserva = parseFloat(financial.reservaAtual) || 0;
        const poupanca = parseFloat(financial.capacidadePoupanca) || 0;
        const meses = parseInt(financial.mesesAteEmbarque) || 12;

        const totalDisponivel = reserva + (poupanca * meses);
        const gap = Math.max(0, custoTotal - totalDisponivel);
        const mesesNecessarios = poupanca > 0 && gap > 0 ? Math.ceil(gap / poupanca) : 0;

        let viability, readiness;
        if (totalDisponivel >= custoTotal) {
            viability = 'viavel';
            readiness = 100;
        } else if (totalDisponivel >= custoTotal * 0.7) {
            viability = 'parcialmente_viavel';
            readiness = custoTotal > 0 ? Math.round((totalDisponivel / custoTotal) * 100) : 0;
        } else {
            viability = 'inviavel_no_prazo';
            readiness = custoTotal > 0 ? Math.round((totalDisponivel / custoTotal) * 100) : 0;
        }

        return { viability, readiness: Math.min(100, Math.max(0, readiness)), gap, mesesNecessarios };
    },

    calcOverallReadiness(culturalReadiness, financialReadiness) {
        return Math.min(100, Math.max(0, Math.round(culturalReadiness * 0.4 + financialReadiness * 0.6)));
    },

    getClassification(overall) {
        if (overall >= 85) return 'pronto';
        if (overall >= 70) return 'quase_pronto';
        if (overall >= 50) return 'preparacao_necessaria';
        if (overall >= 30) return 'preparacao_significativa';
        return 'reavaliacao';
    },

    getClassificationLabel(classification) {
        const labels = {
            pronto: 'Pronto para o intercâmbio!',
            quase_pronto: 'Quase pronto — pequenos ajustes',
            preparacao_necessaria: 'Preparação necessária',
            preparacao_significativa: 'Preparação significativa necessária',
            reavaliacao: 'Reavaliação recomendada',
        };
        return labels[classification] || classification;
    },

    getStrategyLabel(strategy) {
        const labels = {
            integration: 'Integração',
            assimilation: 'Assimilação',
            separation: 'Separação',
            marginalization: 'Marginalização',
        };
        return labels[strategy] || strategy;
    },

    getStrategyDescription(strategy) {
        const descs = {
            integration: 'Você valoriza tanto sua cultura de origem quanto a cultura anfitriã. Esse é o perfil mais adaptável para intercâmbio!',
            assimilation: 'Você tende a abraçar a cultura anfitriã. Cuidado para não perder conexão com suas raízes.',
            separation: 'Você valoriza muito sua cultura de origem. Busque se abrir mais para a cultura local.',
            marginalization: 'Há espaço para desenvolver conexão tanto com sua cultura quanto com a cultura anfitriã.',
        };
        return descs[strategy] || '';
    },

    getViabilityLabel(viability) {
        const labels = {
            viavel: 'Financeiramente viável',
            parcialmente_viavel: 'Parcialmente viável',
            inviavel_no_prazo: 'Inviável no prazo atual',
        };
        return labels[viability] || viability;
    },
};

window.Diagnostic = Diagnostic;
