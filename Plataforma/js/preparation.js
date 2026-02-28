/**
 * Intercâmbio Consciente — Preparation Module (Phase 2)
 * Personalized checklists, weekly exercises, progress tracking
 */

const Preparation = {

    // ── Dimensions ──────────────────────────────────────────

    dimensions: {
        documentacao: { emoji: '\uD83D\uDCC4', label: 'Documentação', color: '#3B82F6' },
        financeira:   { emoji: '\uD83D\uDCB0', label: 'Financeira',   color: '#F59E0B' },
        cultural:     { emoji: '\uD83C\uDF0D', label: 'Cultural',     color: '#8B5CF6' },
        linguistica:  { emoji: '\uD83D\uDDE3\uFE0F', label: 'Linguística',  color: '#10B981' },
        emocional:    { emoji: '\uD83D\uDC9C', label: 'Emocional',    color: '#EC4899' },
        logistica:    { emoji: '\u2708\uFE0F', label: 'Logística',    color: '#06B6D4' },
    },

    // ── Base Tasks (~32 tasks across 6 dimensions) ─────────

    baseTasks: [
        // Documentação (6 critical)
        { key: 'passport_valid',      dim: 'documentacao', title: 'Verificar validade do passaporte',           desc: 'Passaporte deve ter pelo menos 6 meses de validade após retorno.',  priority: 'critical', sort: 1 },
        { key: 'visa_application',    dim: 'documentacao', title: 'Solicitar visto (se necessário)',            desc: 'Verificar requisitos de visto do país destino e iniciar processo.', priority: 'critical', sort: 2 },
        { key: 'health_insurance',    dim: 'documentacao', title: 'Contratar seguro saúde internacional',      desc: 'Seguro com cobertura mínima exigida pelo país de destino.',         priority: 'critical', sort: 3 },
        { key: 'acceptance_letter',   dim: 'documentacao', title: 'Obter carta de aceitação da instituição',   desc: 'Carta oficial da escola/universidade confirmando matrícula.',       priority: 'critical', sort: 4 },
        { key: 'digital_copies',      dim: 'documentacao', title: 'Digitalizar documentos importantes',        desc: 'Salvar cópias na nuvem: passaporte, visto, seguro, diplomas.',     priority: 'critical', sort: 5 },
        { key: 'emergency_contacts',  dim: 'documentacao', title: 'Preparar lista de contatos de emergência',  desc: 'Embaixada, consulado, seguro, família — tudo acessível offline.',   priority: 'critical', sort: 6 },

        // Financeira (6 high)
        { key: 'intl_account',        dim: 'financeira', title: 'Abrir conta bancária internacional',         desc: 'Wise, Nomad ou conta no país destino para receber/enviar.',         priority: 'high', sort: 1 },
        { key: 'intl_card',           dim: 'financeira', title: 'Providenciar cartão internacional',          desc: 'Cartão sem IOF ou com taxas reduzidas para uso no exterior.',       priority: 'high', sort: 2 },
        { key: 'emergency_fund',      dim: 'financeira', title: 'Montar reserva de emergência',               desc: 'Pelo menos 3 meses de gastos em moeda local do destino.',          priority: 'high', sort: 3 },
        { key: 'expense_app',         dim: 'financeira', title: 'Instalar app de controle de gastos',         desc: 'Mobills, Organizze ou planilha para monitorar gastos.',             priority: 'high', sort: 4 },
        { key: 'monthly_budget',      dim: 'financeira', title: 'Criar orçamento mensal no destino',          desc: 'Estimar moradia, alimentação, transporte e lazer em moeda local.', priority: 'high', sort: 5 },
        { key: 'exchange_strategy',   dim: 'financeira', title: 'Definir estratégia de câmbio',               desc: 'Comprar moeda gradualmente vs. de uma vez — avaliar cenário.',     priority: 'high', sort: 6 },

        // Cultural (5 medium)
        { key: 'destination_customs', dim: 'cultural', title: 'Pesquisar costumes do país destino',          desc: 'Etiqueta social, gestos, horários de refeição, dress code.',        priority: 'medium', sort: 1 },
        { key: 'media_immersion',     dim: 'cultural', title: 'Assistir filmes/séries do país',              desc: 'Imersão cultural através de mídia local — entender humor e valores.', priority: 'medium', sort: 2 },
        { key: 'expat_community',     dim: 'cultural', title: 'Entrar em grupo de intercambistas',           desc: 'Facebook, WhatsApp ou Discord de brasileiros no destino.',          priority: 'medium', sort: 3 },
        { key: 'cultural_values',     dim: 'cultural', title: 'Estudar valores culturais do destino',        desc: 'Individualismo vs. coletivismo, pontualidade, hierarquia social.', priority: 'medium', sort: 4 },
        { key: 'local_history',       dim: 'cultural', title: 'Conhecer história básica do país',            desc: 'Eventos históricos importantes, feriados nacionais, símbolos.',    priority: 'medium', sort: 5 },

        // Linguística (5 medium)
        { key: 'study_routine',       dim: 'linguistica', title: 'Criar rotina diária de estudo do idioma',   desc: 'Pelo menos 30min/dia com app (Duolingo, Anki) ou curso.',          priority: 'medium', sort: 1 },
        { key: 'native_conversation', dim: 'linguistica', title: 'Praticar conversa com nativos',             desc: 'iTalki, Tandem ou grupos de conversação presenciais.',             priority: 'medium', sort: 2 },
        { key: 'survival_phrases',    dim: 'linguistica', title: 'Aprender frases de sobrevivência',          desc: 'Direções, emergências, compras, restaurante — com pronúncia.',     priority: 'medium', sort: 3 },
        { key: 'media_language',      dim: 'linguistica', title: 'Consumir podcasts/músicas no idioma',       desc: 'Treinar ouvido com conteúdo autêntico do país destino.',           priority: 'medium', sort: 4 },
        { key: 'cefr_selfeval',       dim: 'linguistica', title: 'Fazer auto-avaliação CEFR do idioma',       desc: 'Identificar seu nível (A1-C2) e definir meta realista.',           priority: 'medium', sort: 5 },

        // Emocional (5 recommended)
        { key: 'transformational_goals', dim: 'emocional', title: 'Definir intenções transformacionais',     desc: 'O que você quer que o intercâmbio mude em você? Escreva 3 metas.', priority: 'recommended', sort: 1 },
        { key: 'letter_to_self',         dim: 'emocional', title: 'Escrever carta para si mesmo(a)',         desc: 'Para ler quando sentir saudade — suas razões e sonhos.',           priority: 'recommended', sort: 2 },
        { key: 'family_talk',            dim: 'emocional', title: 'Conversar com família sobre expectativas', desc: 'Alinhar comunicação, frequência de contato e apoio emocional.',   priority: 'recommended', sort: 3 },
        { key: 'support_network',        dim: 'emocional', title: 'Construir rede de apoio',                 desc: 'Identificar pessoas-chave: mentor, amigos locais, família.',      priority: 'recommended', sort: 4 },
        { key: 'culture_shock_prep',     dim: 'emocional', title: 'Estudar sobre choque cultural',           desc: 'Fases do choque cultural (lua de mel → crise → adaptação).',      priority: 'recommended', sort: 5 },

        // Logística (5 medium)
        { key: 'housing',           dim: 'logistica', title: 'Garantir moradia inicial',                desc: 'Hostel, homestay ou aluguel — pelo menos as primeiras 2 semanas.', priority: 'medium', sort: 1 },
        { key: 'flights',           dim: 'logistica', title: 'Comprar passagens aéreas',                desc: 'Comparar preços, verificar bagagem, reservar assento.',            priority: 'medium', sort: 2 },
        { key: 'local_transport',   dim: 'logistica', title: 'Pesquisar transporte local',              desc: 'Metrô, ônibus, bike — apps e passes mensais disponíveis.',        priority: 'medium', sort: 3 },
        { key: 'sim_esim',          dim: 'logistica', title: 'Providenciar chip/eSIM internacional',    desc: 'Airalo, Holafly ou chip local — ter internet ao chegar.',          priority: 'medium', sort: 4 },
        { key: 'packing_list',      dim: 'logistica', title: 'Montar lista de mala',                    desc: 'Clima, adaptadores, remédios, itens essenciais — checar peso.',    priority: 'medium', sort: 5 },
    ],

    // ── Personalization based on diagnostic ────────────────

    personalizeTasks(diagnosticResult) {
        const extra = [];
        const priorityOverrides = {};

        if (!diagnosticResult) return { extra, priorityOverrides };

        const strategy = diagnosticResult.acculturation_strategy;
        const viability = diagnosticResult.financial_viability;
        const readiness = diagnosticResult.overall_readiness;

        // Strategy-based personalization
        if (strategy === 'assimilation') {
            extra.push(
                { key: 'keep_heritage',     dim: 'emocional', title: 'Manter conexão com herança cultural',   desc: 'Reserve tempo semanal para culinária, música ou tradições brasileiras.', priority: 'high', sort: 10, source: 'strategy:assimilation' },
                { key: 'heritage_journal',  dim: 'emocional', title: 'Criar diário de identidade cultural',   desc: 'Registre reflexões sobre como sua identidade evolui no exterior.',       priority: 'medium', sort: 11, source: 'strategy:assimilation' },
                { key: 'br_traditions',     dim: 'cultural',  title: 'Planejar celebração de tradições BR',   desc: 'Festas juninas, carnaval, receitas — compartilhe sua cultura.',          priority: 'medium', sort: 10, source: 'strategy:assimilation' },
            );
        } else if (strategy === 'separation') {
            extra.push(
                { key: 'host_engagement',   dim: 'cultural',    title: 'Planejar atividades com locais',        desc: 'Participe de eventos, clubes ou voluntariado da comunidade local.',    priority: 'high', sort: 10, source: 'strategy:separation' },
                { key: 'host_food',         dim: 'cultural',    title: 'Experimentar culinária local semanalmente', desc: 'Visite restaurantes locais e aprenda receitas tradicionais.',       priority: 'medium', sort: 11, source: 'strategy:separation' },
                { key: 'extra_language',    dim: 'linguistica', title: 'Intensificar prática do idioma local',  desc: 'Aumente para 1h/dia de prática ativa do idioma do destino.',           priority: 'high', sort: 10, source: 'strategy:separation' },
            );
        } else if (strategy === 'marginalization') {
            extra.push(
                { key: 'host_engagement',   dim: 'cultural',  title: 'Planejar atividades com locais',          desc: 'Participe de eventos, clubes ou voluntariado da comunidade local.', priority: 'high', sort: 10, source: 'strategy:marginalization' },
                { key: 'keep_heritage',     dim: 'emocional', title: 'Manter conexão com herança cultural',     desc: 'Reserve tempo semanal para culinária, música ou tradições BR.',     priority: 'high', sort: 10, source: 'strategy:marginalization' },
                { key: 'identity_workshop', dim: 'emocional', title: 'Fazer workshop de autoconhecimento',      desc: 'Explore quem você é e o que quer levar dessa experiência.',         priority: 'high', sort: 11, source: 'strategy:marginalization' },
                { key: 'mentor_session',    dim: 'emocional', title: 'Agendar sessão com mentor de intercâmbio', desc: 'Um mentor experiente pode ajudar a preparar sua mentalidade.',     priority: 'critical', sort: 12, source: 'strategy:marginalization' },
            );
        }

        // Financial viability personalization
        if (viability === 'parcialmente_viavel') {
            extra.push(
                { key: 'savings_review',  dim: 'financeira', title: 'Revisar plano de poupança mensal',        desc: 'Ajuste cortes e metas para fechar o gap financeiro a tempo.',       priority: 'high', sort: 10, source: 'viability:parcialmente_viavel' },
                { key: 'cut_expenses',    dim: 'financeira', title: 'Identificar e cortar gastos supérfluos',   desc: 'Revise assinaturas, delivery e lazer — cada real conta.',           priority: 'high', sort: 11, source: 'viability:parcialmente_viavel' },
            );
        } else if (viability === 'inviavel_no_prazo') {
            extra.push(
                { key: 'scholarship_search', dim: 'financeira', title: 'Pesquisar bolsas de estudo',            desc: 'Governo, instituição ou organizações — aplique para reduzir custo.', priority: 'critical', sort: 10, source: 'viability:inviavel_no_prazo' },
                { key: 'work_study',         dim: 'financeira', title: 'Avaliar opções de trabalho-estudo',     desc: 'Visto permite trabalhar? Quais são as opções no destino?',          priority: 'critical', sort: 11, source: 'viability:inviavel_no_prazo' },
                { key: 'dsop_strict',        dim: 'financeira', title: 'Implementar DSOP rígido',               desc: 'Diagnosticar → Sonhar → Orçar → Poupar com disciplina máxima.',    priority: 'critical', sort: 12, source: 'viability:inviavel_no_prazo' },
                { key: 'consider_delay',     dim: 'financeira', title: 'Considerar adiar data de embarque',     desc: 'Adiar 3-6 meses pode ser mais seguro que ir sem reserva.',         priority: 'high', sort: 13, source: 'viability:inviavel_no_prazo' },
            );
            // Upgrade all financial tasks to critical
            priorityOverrides.financeira = 'critical';
        }

        // Low readiness — add mentor to all dimensions
        if (readiness < 50) {
            const hasMentor = extra.some(t => t.key === 'mentor_session');
            if (!hasMentor) {
                extra.push(
                    { key: 'mentor_session', dim: 'emocional', title: 'Agendar sessão com mentor de intercâmbio', desc: 'Um mentor experiente pode ajudar a preparar sua mentalidade.', priority: 'critical', sort: 12, source: 'readiness:low' },
                );
            }
        }

        // High readiness — simplified checklist hint (all tasks included, but noted)
        // We don't remove tasks, just keep them — the UI will show them as easy to complete

        return { extra, priorityOverrides };
    },

    // ── Weekly Exercises Generator ─────────────────────────

    weeklyExercises: {
        cultural: [
            'Pesquise um costume do país destino e anote 3 curiosidades.',
            'Assista a um filme/documentário do país destino.',
            'Cozinhe uma receita típica do país destino.',
            'Leia um artigo sobre a história recente do país.',
            'Converse com alguém que já morou no seu destino.',
            'Visite virtualmente um museu ou ponto turístico do destino.',
            'Compare um aspecto cultural (ex: educação) entre Brasil e destino.',
            'Participe de um evento online sobre o país destino.',
            'Pesquise sobre o sistema de saúde do país.',
            'Estude as regras de etiqueta social do país.',
            'Aprenda sobre o mercado de trabalho no destino.',
            'Investigue a cena artística/musical do país.',
            'Pesquise sobre o clima e como se vestir.',
            'Descubra 3 tradições locais que você quer vivenciar.',
            'Pesquise sobre o sistema educacional do país.',
            'Estude a geografia e regiões do país.',
            'Leia sobre brasileiros que se destacaram no destino.',
            'Assista a uma palestra TED de alguém do país.',
            'Pesquise esportes populares no destino.',
            'Compare custo de vida entre sua cidade e o destino.',
            'Pesquise sobre voluntariado no destino.',
            'Estude sobre transporte público no país.',
            'Descubra aplicativos essenciais usados no destino.',
            'Pesquise sobre a culinária vegetariana/vegana local.',
            'Revise tudo que aprendeu e faça um resumo cultural.',
            'Crie um "guia pessoal" do país destino com suas anotações.',
        ],
        linguistica: [
            'Aprenda 10 palavras novas relacionadas ao dia a dia.',
            'Ouça um podcast de 15min no idioma do destino.',
            'Escreva um parágrafo simples sobre seu dia no idioma.',
            'Assista a um vídeo curto sem legendas em português.',
            'Pratique pronúncia de 5 frases úteis em voz alta.',
            'Faça um exercício de listening com música local.',
            'Aprenda expressões idiomáticas comuns do país.',
            'Pratique uma conversa de role-play (restaurante, loja).',
            'Leia uma notícia curta no idioma original.',
            'Escreva uma mensagem de apresentação pessoal no idioma.',
            'Aprenda vocabulário de emergência e saúde.',
            'Faça shadowing — repita frases de um vídeo nativo.',
            'Aprenda vocabulário de moradia e casa.',
            'Pratique pedir direções no idioma.',
            'Escreva sobre seus hobbies no idioma.',
            'Aprenda vocabulário de trabalho/estudo.',
            'Assista a um stand-up comedy no idioma.',
            'Pratique uma entrevista simulada no idioma.',
            'Aprenda gírias e linguagem informal.',
            'Faça um ditado — ouça e escreva.',
            'Aprenda vocabulário de transporte.',
            'Pratique conversa ao telefone (simulação).',
            'Escreva um e-mail formal no idioma.',
            'Aprenda vocabulário de compras e supermercado.',
            'Faça uma auto-avaliação do progresso no idioma.',
            'Grave um áudio de 1min falando sobre seus objetivos no idioma.',
        ],
        financeira: [
            'Pesquise a cotação atual da moeda do destino.',
            'Liste seus gastos fixos mensais e identifique cortes possíveis.',
            'Compare 3 opções de conta/cartão internacional.',
            'Calcule seu orçamento semanal no destino.',
            'Pesquise preço de moradia na cidade de destino.',
            'Defina uma meta de poupança para esta semana.',
            'Pesquise custo de alimentação no destino.',
            'Revise seu progresso de poupança.',
            'Pesquise opções de seguro saúde e compare preços.',
            'Calcule custo de transporte mensal no destino.',
            'Pesquise sobre taxas bancárias internacionais.',
            'Planeje como vai receber dinheiro no exterior.',
            'Pesquise sobre trabalho/freelance permitido pelo visto.',
            'Revise e ajuste seu orçamento mensal.',
            'Pesquise descontos para estudantes no destino.',
            'Calcule custo total da viagem (ida + primeiros 3 meses).',
            'Pesquise sobre impostos para estrangeiros.',
            'Revise suas assinaturas — pause/cancele as desnecessárias.',
            'Pesquise custo de lazer e entretenimento no destino.',
            'Defina seu "colchão financeiro" mínimo.',
            'Pesquise sobre remessas internacionais.',
            'Compare custo de vida entre cidades do destino.',
            'Faça projeção financeira para toda a duração do intercâmbio.',
            'Pesquise programas de cashback/rewards no destino.',
            'Revise e finalize seu plano financeiro completo.',
            'Faça um simulado: viva 1 semana com o orçamento do destino.',
        ],
    },

    getExercisesForWeek(weekNum, diagnosticResult) {
        const week = Math.max(1, Math.min(26, weekNum));
        const idx = week - 1;
        const exercises = [];

        for (const dim of ['cultural', 'linguistica', 'financeira']) {
            const pool = this.weeklyExercises[dim];
            exercises.push({
                dimension: dim,
                title: pool[idx % pool.length],
                week_number: week,
            });
        }

        return exercises;
    },

    // ── Supabase Operations ────────────────────────────────

    async loadTasks(userId) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return [];

        const { data, error } = await sb
            .from('preparation_tasks')
            .select('*')
            .eq('user_id', userId)
            .order('dimension')
            .order('sort_order');

        if (error) {
            console.error('Error loading preparation tasks:', error);
            return [];
        }
        return data || [];
    },

    async toggleTask(taskId, isCompleted) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const updates = {
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
        };

        const { error } = await sb
            .from('preparation_tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) throw error;
    },

    async initializeTasks(userId, diagnosticResult) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return;

        // Check if already initialized
        const existing = await this.loadTasks(userId);
        if (existing.length > 0) return existing;

        const diagnosticId = diagnosticResult?.diagnostic_id || diagnosticResult?.id || null;
        const { extra, priorityOverrides } = this.personalizeTasks(diagnosticResult);

        // Merge base + extra, dedup by key
        const allTasks = [...this.baseTasks];
        for (const t of extra) {
            if (!allTasks.some(bt => bt.key === t.key)) {
                allTasks.push(t);
            }
        }

        // Build rows
        const rows = allTasks.map(t => {
            let priority = t.priority;
            if (priorityOverrides[t.dim] && this._priorityRank(priorityOverrides[t.dim]) > this._priorityRank(priority)) {
                priority = priorityOverrides[t.dim];
            }
            return {
                user_id: userId,
                diagnostic_id: diagnosticId,
                dimension: t.dim,
                task_key: t.key,
                title: t.title,
                description: t.desc,
                priority,
                sort_order: t.sort,
                personalization_source: t.source || null,
            };
        });

        const { data, error } = await sb
            .from('preparation_tasks')
            .insert(rows)
            .select();

        if (error) {
            console.error('Error initializing preparation tasks:', error);
            throw error;
        }
        return data || [];
    },

    async loadWeeklyExercises(userId, weekNum) {
        const sb = window.supabaseClient;
        if (!sb || !userId) return [];

        const { data, error } = await sb
            .from('preparation_weekly_exercises')
            .select('*')
            .eq('user_id', userId)
            .eq('week_number', weekNum);

        if (error) {
            console.error('Error loading weekly exercises:', error);
            return [];
        }
        return data || [];
    },

    async ensureWeeklyExercises(userId, weekNum, diagnosticResult) {
        const existing = await this.loadWeeklyExercises(userId, weekNum);
        if (existing.length > 0) return existing;

        const exercises = this.getExercisesForWeek(weekNum, diagnosticResult);
        const rows = exercises.map(ex => ({
            user_id: userId,
            week_number: ex.week_number,
            dimension: ex.dimension,
            title: ex.title,
            description: ex.title,
        }));

        const sb = window.supabaseClient;
        const { data, error } = await sb
            .from('preparation_weekly_exercises')
            .insert(rows)
            .select();

        if (error) {
            console.error('Error creating weekly exercises:', error);
            return [];
        }
        return data || [];
    },

    async completeExercise(exerciseId) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { error } = await sb
            .from('preparation_weekly_exercises')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .eq('id', exerciseId);

        if (error) throw error;
    },

    // ── Helpers ────────────────────────────────────────────

    calcDimensionProgress(tasks, dimension) {
        const dimTasks = tasks.filter(t => t.dimension === dimension);
        const completed = dimTasks.filter(t => t.is_completed).length;
        const total = dimTasks.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percent };
    },

    calcOverallProgress(tasks) {
        if (!tasks.length) return 0;
        const completed = tasks.filter(t => t.is_completed).length;
        return Math.round((completed / tasks.length) * 100);
    },

    getCurrentWeek(phase2StartDate) {
        if (!phase2StartDate) return 1;
        const start = new Date(phase2StartDate);
        const now = new Date();
        const diffMs = now - start;
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Math.max(1, Math.min(26, diffWeeks));
    },

    _priorityRank(p) {
        const ranks = { recommended: 1, medium: 2, high: 3, critical: 4 };
        return ranks[p] || 0;
    },

    getPriorityLabel(priority) {
        const labels = { critical: 'Crítico', high: 'Alta', medium: 'Média', recommended: 'Sugerido' };
        return labels[priority] || priority;
    },
};

window.Preparation = Preparation;
