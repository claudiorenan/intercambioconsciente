/**
 * Intercâmbio Consciente — Main Application
 * Jornada de autoconhecimento para intercambistas
 */

const BRAZILIAN_CITIES = [
    'São Paulo - SP', 'Rio de Janeiro - RJ', 'Brasília - DF', 'Belo Horizonte - MG',
    'Curitiba - PR', 'Porto Alegre - RS', 'Salvador - BA', 'Recife - PE',
    'Fortaleza - CE', 'Goiânia - GO', 'Manaus - AM', 'Belém - PA',
    'Florianópolis - SC', 'Campinas - SP', 'Vitória - ES', 'Natal - RN',
    'Campo Grande - MS', 'João Pessoa - PB', 'São Luís - MA', 'Maceió - AL',
    'Cuiabá - MT', 'Teresina - PI', 'Aracaju - SE', 'Porto Velho - RO',
    'Macapá - AP', 'Boa Vista - RR', 'Palmas - TO', 'Rio Branco - AC',
    'Santos - SP', 'Ribeirão Preto - SP', 'Sorocaba - SP', 'São José dos Campos - SP',
    'Londrina - PR', 'Maringá - PR', 'Joinville - SC', 'Blumenau - SC',
    'Uberlândia - MG', 'Juiz de Fora - MG', 'Niterói - RJ', 'Petrópolis - RJ',
    'Feira de Santana - BA', 'Caxias do Sul - RS', 'Santa Maria - RS', 'Pelotas - RS',
];

const COUNTRY_CITIES = {
    'Canadá': ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Edmonton', 'Winnipeg', 'Quebec City', 'Victoria', 'Halifax'],
    'Estados Unidos': ['Nova York', 'Los Angeles', 'Miami', 'San Francisco', 'Chicago', 'Boston', 'San Diego', 'Orlando', 'Seattle', 'Houston'],
    'Reino Unido': ['Londres', 'Manchester', 'Liverpool', 'Edinburgh', 'Birmingham', 'Bristol', 'Cambridge', 'Oxford', 'Brighton', 'Glasgow'],
    'Irlanda': ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kilkenny', 'Drogheda', 'Bray'],
    'Austrália': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Cairns', 'Canberra'],
    'Nova Zelândia': ['Auckland', 'Wellington', 'Christchurch', 'Queenstown', 'Hamilton', 'Dunedin'],
    'Alemanha': ['Berlim', 'Munique', 'Frankfurt', 'Hamburgo', 'Colônia', 'Stuttgart', 'Düsseldorf', 'Dresden'],
    'França': ['Paris', 'Lyon', 'Marselha', 'Nice', 'Toulouse', 'Bordeaux', 'Montpellier', 'Estrasburgo'],
    'Espanha': ['Madri', 'Barcelona', 'Valência', 'Sevilha', 'Málaga', 'Bilbao', 'Granada', 'Salamanca'],
    'Portugal': ['Lisboa', 'Porto', 'Coimbra', 'Braga', 'Faro', 'Aveiro', 'Évora', 'Funchal'],
    'Itália': ['Roma', 'Milão', 'Florença', 'Bolonha', 'Turim', 'Nápoles', 'Veneza', 'Verona'],
    'Holanda': ['Amsterdã', 'Roterdã', 'Haia', 'Utrecht', 'Eindhoven', 'Groningen', 'Leiden', 'Delft'],
    'Malta': ['Valletta', 'Sliema', 'St. Julian\'s', 'Mdina', 'Gozo', 'Birkirkara'],
    'Japão': ['Tóquio', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Fukuoka', 'Sapporo', 'Kobe'],
    'Coreia do Sul': ['Seul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Jeju'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Mendoza', 'Rosário', 'Bariloche', 'Mar del Plata'],
    'Chile': ['Santiago', 'Valparaíso', 'Viña del Mar', 'Concepción', 'Temuco', 'La Serena'],
    'África do Sul': ['Cidade do Cabo', 'Joanesburgo', 'Durban', 'Pretória', 'Port Elizabeth'],
    'Dubai (EAU)': ['Dubai', 'Abu Dhabi', 'Sharjah'],
};

const App = {
    currentUser: null,
    currentTab: 'tabJornadaContent',
    _userProfile: null,
    _modalTrigger: null,
    _deferredInstallPrompt: null,

    // ── Lifecycle ──

    async init() {
        await initSupabase();
        this._loadGroupLinks();

        // Initialize monitoring
        Monitoring.init({
            dsn: AppConfig.sentryDsn,
            endpoint: AppConfig.monitoringEndpoint,
        });

        this._setupGate();
        this._setupTabs();
        this._setupThemeToggle();
        this._setupAuthUI();
        this._setupCheckin();
        this._renderCheckinStreak();
        this._setupPhaseResources();
        this._setupQuickActions();
        this._setupGroupAccordions();
        this._initMapAnimations();
        this._renderPsychologists();
        this._setupInstallPrompt();
        this._setupSearch();
        this._setupMentorProfileModal();
        this._setupAdminPanel();
        this._setupScrollToTop();
        this._setupOfflineIndicator();
        this._setupDiagnostic();
        this._setupPreparation();
        this._setupConnections();

        await Auth.init();
        Auth.onAuthChange((user) => this._onAuthChange(user));
        Auth.onPasswordRecovery((user) => this._onPasswordRecovery(user));
        this._setupNewPasswordForm();

        if (Auth.currentUser) {
            await this._onAuthChange(Auth.currentUser);
        } else {
            this._renderDefaultContent();
        }
    },

    // ── Gate Modal ──

    _setupGate() {
        const gate = document.getElementById('gateModal');
        if (!gate) return;

        const stored = localStorage.getItem('ic_profile');
        if (stored) {
            gate.classList.add('hidden');
            return;
        }

        const gateButtons = gate.querySelectorAll('.gate-option');

        // Focus trap: Tab cycles through gate-option buttons only
        gate.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const btns = Array.from(gateButtons);
            const first = btns[0];
            const last = btns[btns.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // Set initial focus on first gate option
        requestAnimationFrame(() => {
            if (!gate.classList.contains('hidden')) {
                gateButtons[0]?.focus();
            }
        });

        gateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const profile = btn.dataset.profile;
                localStorage.setItem('ic_profile', profile);
                gate.classList.add('hidden');
                // Move focus to main content after gate closes
                document.getElementById('mainContent')?.focus();
                ErrorHandler.showToast(`Bem-vindo(a)! Perfil: ${btn.querySelector('.gate-option-label').textContent}`, 'success');
            });
        });
    },

    // ── Auth ──

    async _onAuthChange(user) {
        this.currentUser = user;

        if (user) {
            this._userProfile = await Profile.getProfile(user.id);

            // Block check: force logout if user is blocked
            if (this._userProfile?.is_blocked) {
                await Auth.signOut();
                this.currentUser = null;
                this._userProfile = null;
                ErrorHandler.showToast('Sua conta foi bloqueada. Entre em contato com o suporte.', 'error');
                this._switchTab('tabJornadaContent');
                return;
            }

            await Messages.init(user.id);
            await Notifications.init(user.id);
            await Connections.init(user.id);
            this._setupNotifPanel();

            document.getElementById('dmBtn').style.display = '';
            document.getElementById('notifBtn').style.display = '';
            document.getElementById('newPostBtn').style.display = '';

            this._loadUpcomingEvents();
            this._loadJourneyStatus();

            // Admin detection
            const adminTab = document.getElementById('tabAdmin');
            if (adminTab) {
                adminTab.style.display = this._isAdmin() ? '' : 'none';
            }
        } else {
            this._userProfile = null;
            Messages.destroy();
            Notifications.destroy();
            Connections.destroy();
            this._destroyNotifPanel();

            document.getElementById('dmBtn').style.display = 'none';
            document.getElementById('notifBtn').style.display = 'none';
            document.getElementById('newPostBtn').style.display = 'none';

            // Hide admin tab on logout
            const adminTab = document.getElementById('tabAdmin');
            if (adminTab) adminTab.style.display = 'none';
        }
    },

    _isAdmin() {
        return this._userProfile && this._userProfile.role === 'admin';
    },

    _setupAuthUI() {
        const form = document.getElementById('authForm');
        const toggleLink = document.getElementById('authToggleLink');
        const rememberCheck = document.getElementById('authRemember');
        const forgotLink = document.getElementById('authForgotLink');
        const emailInput = document.getElementById('authEmail');
        let isSignUp = false;

        // Restore remembered email
        const savedEmail = localStorage.getItem('ic_remember_email');
        if (savedEmail && emailInput) {
            emailInput.value = savedEmail;
        }

        if (forgotLink) {
            forgotLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = emailInput?.value.trim();
                if (!email || !Validation.isValidEmail(email)) {
                    ErrorHandler.showToast('Digite seu email primeiro', 'warning');
                    emailInput?.focus();
                    return;
                }
                forgotLink.textContent = 'Enviando...';
                const { error } = await Auth.resetPassword(email);
                forgotLink.textContent = 'Esqueci minha senha';
                if (error) {
                    ErrorHandler.showToast(this._translateAuthError(error.message), 'error');
                } else {
                    ErrorHandler.showToast('Link de recuperação enviado para seu email!', 'success');
                }
            });
        }

        if (toggleLink) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                isSignUp = !isSignUp;
                document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Criar conta' : 'Entrar';
                toggleLink.textContent = isSignUp ? 'Já tenho conta' : 'Criar conta';
                document.querySelector('.auth-subtitle').textContent = isSignUp
                    ? 'Crie sua conta e comece sua jornada'
                    : 'Acesse sua jornada de autoconhecimento';
                document.querySelectorAll('.signup-only').forEach(el => {
                    el.style.display = isSignUp ? '' : 'none';
                });
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('authEmail').value.trim();
                const password = document.getElementById('authPassword').value;

                if (!Validation.isValidEmail(email)) {
                    ErrorHandler.showToast('Email inválido', 'warning');
                    return;
                }
                if (!Validation.isValidPassword(password)) {
                    ErrorHandler.showToast('Senha deve ter pelo menos 6 caracteres', 'warning');
                    return;
                }

                if (isSignUp) {
                    const confirm = document.getElementById('authPasswordConfirm')?.value;
                    if (password !== confirm) {
                        ErrorHandler.showToast('As senhas não coincidem', 'warning');
                        return;
                    }
                }

                const btn = document.getElementById('authSubmitBtn');
                btn.disabled = true;
                btn.textContent = 'Aguarde...';

                const name = isSignUp ? (document.getElementById('authName')?.value.trim() || '') : '';
                const result = isSignUp
                    ? await Auth.signUp(email, password, { name, profile_type: localStorage.getItem('ic_profile') || 'intercambista' })
                    : await Auth.signIn(email, password);

                btn.disabled = false;
                btn.textContent = isSignUp ? 'Criar conta' : 'Entrar';

                if (result.error) {
                    ErrorHandler.showToast(this._translateAuthError(result.error.message), 'error');
                } else {
                    // Remember email preference
                    if (rememberCheck?.checked) {
                        localStorage.setItem('ic_remember_email', email);
                    } else {
                        localStorage.removeItem('ic_remember_email');
                    }
                    if (isSignUp) {
                        ErrorHandler.showToast('Conta criada com sucesso! Bem-vindo(a)!', 'success');
                    }
                    this._switchTab('tabJornadaContent');
                }
            });
        }

        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    this._previousTab = this.currentTab;
                    this._switchTab('profileView');
                    this._renderProfile();
                } else {
                    this._switchTab('authView');
                }
            });
        }
    },

    // ── Password Recovery & Change ──

    _onPasswordRecovery(_user) {
        this._switchTab('newPasswordView');
    },

    _setupNewPasswordForm() {
        const form = document.getElementById('newPasswordForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pw = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (!Validation.isValidPassword(pw)) {
                ErrorHandler.showToast('Senha deve ter pelo menos 6 caracteres', 'warning');
                return;
            }
            if (pw !== confirm) {
                ErrorHandler.showToast('As senhas não coincidem', 'warning');
                return;
            }

            const btn = document.getElementById('newPasswordBtn');
            btn.disabled = true;
            btn.textContent = 'Salvando...';

            const { error } = await Auth.updatePassword(pw);

            btn.disabled = false;
            btn.textContent = 'Salvar Nova Senha';

            if (error) {
                ErrorHandler.showToast(this._translateAuthError(error.message), 'error');
            } else {
                ErrorHandler.showToast('Senha atualizada com sucesso!', 'success');
                this._switchTab('tabJornadaContent');
            }
        });
    },

    async _changePassword() {
        const current = prompt('Digite sua senha atual:');
        if (!current) return;

        const newPw = prompt('Digite a nova senha (mínimo 6 caracteres):');
        if (!newPw) return;

        if (!Validation.isValidPassword(newPw)) {
            ErrorHandler.showToast('Senha deve ter pelo menos 6 caracteres', 'warning');
            return;
        }

        const confirmPw = prompt('Confirme a nova senha:');
        if (newPw !== confirmPw) {
            ErrorHandler.showToast('As senhas não coincidem', 'warning');
            return;
        }

        // Verify current password by re-signing in
        const email = this.currentUser?.email;
        if (!email) return;

        const { error: signInError } = await Auth.signIn(email, current);
        if (signInError) {
            ErrorHandler.showToast('Senha atual incorreta', 'error');
            return;
        }

        const { error } = await Auth.updatePassword(newPw);
        if (error) {
            ErrorHandler.showToast(this._translateAuthError(error.message), 'error');
        } else {
            ErrorHandler.showToast('Senha alterada com sucesso!', 'success');
        }
    },

    // ── Tabs ──

    _setupTabs() {
        const navTabs = Array.from(document.querySelectorAll('.nav-tab'));

        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                this._switchTab(target);
            });
        });

        // WAI-ARIA keyboard navigation for tabs
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) {
            bottomNav.addEventListener('keydown', (e) => {
                const currentIndex = navTabs.indexOf(document.activeElement);
                if (currentIndex === -1) return;

                let newIndex = -1;
                if (e.key === 'ArrowRight') {
                    newIndex = (currentIndex + 1) % navTabs.length;
                } else if (e.key === 'ArrowLeft') {
                    newIndex = (currentIndex - 1 + navTabs.length) % navTabs.length;
                } else if (e.key === 'Home') {
                    newIndex = 0;
                } else if (e.key === 'End') {
                    newIndex = navTabs.length - 1;
                }

                if (newIndex !== -1) {
                    e.preventDefault();
                    navTabs[newIndex].focus();
                    navTabs[newIndex].click();
                }
            });
        }

        // DM button
        document.getElementById('dmBtn')?.addEventListener('click', () => {
            this._switchTab('dmListView');
            this._loadDMList();
        });

        // DM back buttons
        document.getElementById('dmBackBtn')?.addEventListener('click', () => {
            this._switchTab('tabJornadaContent');
        });
        document.getElementById('dmChatBackBtn')?.addEventListener('click', () => {
            this._switchTab('dmListView');
            this._loadDMList();
        });

        // DM send
        document.getElementById('dmSendBtn')?.addEventListener('click', () => this._handleSendDM());
        document.getElementById('dmChatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSendDM();
            }
        });

        // New Post
        document.getElementById('newPostBtn')?.addEventListener('click', () => {
            this._modalTrigger = document.activeElement;
            const modal = document.getElementById('newPostModal');
            modal.style.display = 'flex';
            // Focus first focusable element inside modal
            const firstFocusable = modal.querySelector('select, input, textarea, button');
            if (firstFocusable) firstFocusable.focus();
        });
        document.getElementById('closePostModal')?.addEventListener('click', () => {
            this._closePostModal();
        });
        document.getElementById('submitPost')?.addEventListener('click', () => this._handleSubmitPost());

        // Escape key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const postModal = document.getElementById('newPostModal');
                if (postModal && postModal.style.display !== 'none') {
                    this._closePostModal();
                }
            }
        });

        // Post char count
        document.getElementById('postContent')?.addEventListener('input', (e) => {
            document.getElementById('postCharCount').textContent = `${e.target.value.length}/1000`;
        });
    },

    _switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
        const target = document.getElementById(tabId);
        if (target) target.style.display = '';

        // Update nav active state and tabindex (WAI-ARIA tabs pattern)
        document.querySelectorAll('.nav-tab').forEach(t => {
            const isActive = t.dataset.tab === tabId;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive);
            t.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        this.currentTab = tabId;

        // Load content on tab switch
        if (tabId === 'tabComunidadeContent') this._loadFeed();
        if (tabId === 'tabMentoresContent') this._loadMentors();
        if (tabId === 'tabEncontrosContent') this._loadEvents();
        if (tabId === 'tabAdminContent') this._loadAdminPanel();
        if (tabId === 'tabConexoesContent') this._loadConnections();
    },

    // ── Theme ──

    _setupThemeToggle() {
        this._applyTimeTheme();
        this._timePhaseInterval = setInterval(() => this._applyTimeTheme(), 5 * 60 * 1000);
    },

    _getTimePhase() {
        const h = new Date().getHours();
        if (h >= 5 && h <= 6) return 'dawn';
        if (h >= 7 && h <= 17) return 'day';
        if (h >= 18 && h <= 19) return 'dusk';
        return 'night';
    },

    _applyTimeTheme() {
        const phase = this._getTimePhase();
        const root = document.documentElement;

        const isLight = phase === 'dawn' || phase === 'day';
        root.dataset.theme = isLight ? 'light' : 'dark';
        root.dataset.timePhase = phase;

        const phaseConfig = {
            dawn: {
                ambient1: 'rgba(245,158,11,0.10)',
                ambient2: 'rgba(244,63,94,0.06)',
                particleSpeed: '8s',
                globeColor: 0x2a1040,
                globeEmissive: 0x4a2060,
                globeEmissiveIntensity: 0.4,
            },
            day: {
                ambient1: 'rgba(245,158,11,0.12)',
                ambient2: 'rgba(251,191,36,0.08)',
                particleSpeed: '6s',
                globeColor: 0x8B6914,
                globeEmissive: 0xD97706,
                globeEmissiveIntensity: 0.35,
            },
            dusk: {
                ambient1: 'rgba(244,63,94,0.08)',
                ambient2: 'rgba(245,158,11,0.06)',
                particleSpeed: '9s',
                globeColor: 0x200a30,
                globeEmissive: 0x3a1050,
                globeEmissiveIntensity: 0.45,
            },
            night: {
                ambient1: 'rgba(124,58,237,0.08)',
                ambient2: 'rgba(244,63,94,0.05)',
                particleSpeed: '10s',
                globeColor: 0x120a30,
                globeEmissive: 0x1a0a40,
                globeEmissiveIntensity: 0.3,
            },
        };

        const cfg = phaseConfig[phase];
        root.style.setProperty('--ambient-1', cfg.ambient1);
        root.style.setProperty('--ambient-2', cfg.ambient2);
        root.style.setProperty('--particle-speed', cfg.particleSpeed);

        if (window._globeMaterial) {
            window._globeMaterial.color.setHex(cfg.globeColor);
            window._globeMaterial.emissive.setHex(cfg.globeEmissive);
            window._globeMaterial.emissiveIntensity = cfg.globeEmissiveIntensity;
        }
    },

    // ── Check-in ──

    _setupCheckin() {
        const noteInput = document.getElementById('checkinNote');

        document.querySelectorAll('.checkin-emoji').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.checkin-emoji').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const mood = btn.dataset.mood;
                const note = noteInput?.value.trim() || null;

                if (this.currentUser) {
                    const sb = window.supabaseClient;
                    if (sb) {
                        const row = { user_id: this.currentUser.id, mood, created_at: new Date().toISOString() };
                        if (note) row.note = note;
                        await sb.from('checkins').insert(row);
                    }
                }

                // Show note field for next time, clear current value
                if (noteInput) {
                    noteInput.style.display = '';
                    noteInput.value = '';
                }

                // Update streak
                this._updateCheckinStreak();

                const labels = {
                    otimo: 'Que bom que está ótimo!',
                    bem: 'Bom saber que está bem!',
                    neutro: 'Tudo bem estar neutro. Respire fundo.',
                    ansioso: 'Ansiedade é normal no intercâmbio. Você não está sozinho(a).',
                    triste: 'Está tudo bem sentir tristeza. Considere conversar com alguém.',
                    saudade: 'Saudade de casa é natural. Isso mostra o quanto você ama os seus.',
                };
                ErrorHandler.showToast(labels[mood] || 'Check-in registrado!', 'info');
            });
        });
    },

    async _updateCheckinStreak() {
        // Update localStorage as immediate feedback
        const today = new Date().toISOString().slice(0, 10);
        const stored = JSON.parse(localStorage.getItem('ic_checkin_streak') || '{"lastDate":"","count":0}');
        if (stored.lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const count = stored.lastDate === yesterday ? stored.count + 1 : 1;
            localStorage.setItem('ic_checkin_streak', JSON.stringify({ lastDate: today, count }));
        }

        // Calculate real streak from Supabase if available
        if (this.currentUser) {
            const streak = await this._calcStreakFromDB();
            if (streak !== null) {
                localStorage.setItem('ic_checkin_streak', JSON.stringify({ lastDate: today, count: streak }));
            }
        }
        this._renderCheckinStreak();
    },

    async _calcStreakFromDB() {
        const sb = window.supabaseClient;
        if (!sb || !this.currentUser) return null;

        const { data } = await sb
            .from('checkins')
            .select('created_at')
            .eq('user_id', this.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(60);

        if (!data?.length) return 0;

        // Get unique dates
        const dates = [...new Set(data.map(c => c.created_at.slice(0, 10)))].sort().reverse();
        let streak = 0;
        let expected = new Date().toISOString().slice(0, 10);

        for (const d of dates) {
            if (d === expected) {
                streak++;
                expected = new Date(new Date(expected).getTime() - 86400000).toISOString().slice(0, 10);
            } else if (d < expected) {
                break;
            }
        }
        return streak;
    },

    _renderCheckinStreak() {
        const el = document.getElementById('checkinStreak');
        const textEl = document.getElementById('streakText');
        if (!el || !textEl) return;

        const stored = JSON.parse(localStorage.getItem('ic_checkin_streak') || '{"lastDate":"","count":0}');
        if (stored.count > 0) {
            el.style.display = '';
            textEl.textContent = `${stored.count} dia${stored.count > 1 ? 's' : ''} seguido${stored.count > 1 ? 's' : ''}`;
        } else {
            el.style.display = 'none';
        }
    },

    // ── Phase Resources ──

    _setupPhaseResources() {
        const resources = {
            antes: [
                { icon: '📋', title: 'Checklist emocional pré-intercâmbio', desc: 'Prepare-se emocionalmente para a viagem' },
                { icon: '🧠', title: 'O que esperar: fases da adaptação', desc: 'Entenda o ciclo emocional do intercâmbio' },
                { icon: '💬', title: 'Como conversar com a família', desc: 'Dicas para alinhar expectativas' },
                { icon: '📝', title: 'Diário de intenções', desc: 'Defina seus objetivos pessoais' },
            ],
            durante: [
                { icon: '🌊', title: 'Lidando com o choque cultural', desc: 'Estratégias práticas para se adaptar' },
                { icon: '😢', title: 'Saudade de casa: o que fazer', desc: 'Técnicas para lidar com a saudade' },
                { icon: '🤝', title: 'Fazendo amizades no exterior', desc: 'Como criar conexões genuínas' },
                { icon: '🆘', title: 'Quando buscar ajuda profissional', desc: 'Sinais de que precisa de suporte' },
            ],
            depois: [
                { icon: '🏠', title: 'O choque cultural reverso', desc: 'Voltando pra casa: o que ninguém conta' },
                { icon: '🔄', title: 'Integrando a experiência', desc: 'Como trazer o aprendizado para sua vida' },
                { icon: '💼', title: 'Intercâmbio no currículo', desc: 'Valorizando sua experiência profissionalmente' },
                { icon: '🌱', title: 'Mantendo conexões internacionais', desc: 'Preserve as amizades que fez' },
            ],
            familiar: [
                { icon: '💙', title: 'Como apoiar de longe', desc: 'Dicas para familiares de intercambistas' },
                { icon: '📱', title: 'Comunicação saudável', desc: 'Frequência e limites nas ligações' },
                { icon: '😰', title: 'Lidando com a ansiedade da distância', desc: 'Cuidando de você também' },
                { icon: '🎉', title: 'Preparando a volta', desc: 'Como receber quem volta mudado' },
            ],
        };

        const renderResources = (phase) => {
            const list = document.getElementById('resourcesList');
            if (!list) return;
            const items = resources[phase] || [];
            list.innerHTML = items.map(r => `
                <div class="resource-card">
                    <span class="resource-icon">${r.icon}</span>
                    <div class="resource-info">
                        <div class="resource-title">${r.title}</div>
                        <div class="resource-desc">${r.desc}</div>
                    </div>
                </div>
            `).join('');
        };

        document.querySelectorAll('.phase-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.phase-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderResources(tab.dataset.phase);
            });
        });

        renderResources('antes');
    },

    // ── Quick Actions ──

    _setupQuickActions() {
        document.querySelectorAll('.quick-action-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'checkin') {
                    document.getElementById('checkinSection')?.scrollIntoView({ behavior: 'smooth' });
                } else if (action === 'journeys') {
                    if (!this.currentUser) {
                        this._switchTab('authView');
                        ErrorHandler.showToast('Faça login para acessar as jornadas', 'info');
                    } else {
                        const timeline = document.getElementById('journeyProgressSection');
                        if (timeline && timeline.style.display !== 'none') {
                            timeline.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            this._openDiagnosticModal();
                        }
                    }
                } else if (action === 'events') {
                    this._switchTab('tabEncontrosContent');
                } else if (action === 'resources') {
                    document.getElementById('resourcesSection')?.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    },

    // ── Group Accordions ──

    _groupLinks: {},
    _groupData: {},

    async _loadGroupLinks() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const groups = await Admin.loadGroups();
        if (!groups.length) return;

        groups.forEach(g => {
            if (g.country_code && g.invite_link) {
                const key = g.country_code.toLowerCase();
                this._groupLinks[key] = g.invite_link;
                this._groupData[key] = g;
            }
            if (g.name && g.name.toLowerCase().includes('geral') && g.invite_link) {
                this._groupLinks.geral = g.invite_link;
                this._groupData.geral = g;
            }
        });

        this._enrichGroupDescriptions();
    },

    _enrichGroupDescriptions() {
        // Enrich country group links with description and platform info
        document.querySelectorAll('.country-group').forEach(link => {
            const country = link.dataset.country;
            const g = this._groupData[country];
            if (!g) return;

            const platform = g.platform ? g.platform.charAt(0).toUpperCase() + g.platform.slice(1) : '';
            const desc = g.description || '';
            if (desc || platform) {
                link.setAttribute('title', [desc, platform ? `Via ${platform}` : ''].filter(Boolean).join(' · '));
            }
        });

        // Enrich general group
        const geralLink = document.getElementById('groupGeralLink');
        const geralData = this._groupData.geral;
        if (geralLink && geralData) {
            const geralDesc = document.querySelector('.group-general-desc');
            if (geralDesc && geralData.description) {
                geralDesc.textContent = geralData.description;
            }
        }
    },

    _setupGroupAccordions() {
        // Continent toggle
        document.querySelectorAll('.continent-header').forEach(header => {
            header.addEventListener('click', () => {
                const continent = header.dataset.continent;
                const countries = document.querySelector(`.continent-countries[data-continent="${continent}"]`);
                if (!countries) return;

                const isOpen = countries.style.display !== 'none';
                // Close all
                document.querySelectorAll('.continent-countries').forEach(c => c.style.display = 'none');
                document.querySelectorAll('.continent-header').forEach(h => h.classList.remove('open'));

                if (!isOpen) {
                    countries.style.display = '';
                    header.classList.add('open');
                }
            });
        });

        // Country group links
        document.querySelectorAll('.country-group').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const country = link.dataset.country;
                const url = this._groupLinks[country];
                if (url) {
                    window.open(url, '_blank', 'noopener');
                } else {
                    ErrorHandler.showToast(`Grupo de ${link.textContent.trim()} em breve!`, 'info');
                }
            });
        });

        // General group
        document.getElementById('groupGeralLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            const url = this._groupLinks.geral;
            if (url) {
                window.open(url, '_blank', 'noopener');
            } else {
                ErrorHandler.showToast('Link do grupo geral em breve!', 'info');
            }
        });
    },

    // ── Map Animations (lazy-loaded globe) ──

    _initMapAnimations() {
        // Load real stats from Supabase, then animate counters
        this._loadRealStats().then(() => {
            if (window.Globe) {
                Globe.animateCounters();
            } else {
                this._animateCountersFallback();
            }
        });

        // Lazy-load Three.js + globe.js
        this._lazyLoadGlobe();
    },

    async _loadRealStats() {
        const sb = window.supabaseClient;
        if (!sb) return;

        try {
            const [countriesRes, membersRes, groupsRes] = await Promise.all([
                sb.from('groups').select('country_code', { count: 'exact', head: false }).eq('is_active', true),
                sb.from('profiles').select('id', { count: 'exact', head: true }),
                sb.from('groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
            ]);

            const uniqueCountries = countriesRes.data
                ? new Set(countriesRes.data.map(r => r.country_code).filter(Boolean)).size
                : 0;
            const members = membersRes.count ?? 0;
            const groups = groupsRes.count ?? 0;

            const el = (id, val) => {
                const node = document.getElementById(id);
                if (node) node.setAttribute('data-target', String(val));
            };

            el('statCountries', uniqueCountries);
            el('statMembers', members);
            el('statGroups', groups);
        } catch (err) {
            console.error('Failed to load real stats:', err);
        }
    },

    /**
     * Fallback counter animation used when globe.js has not loaded yet.
     * Once globe.js loads it provides its own `animateCounters` which is
     * functionally identical.
     */
    _animateCountersFallback() {
        const counters = document.querySelectorAll('.map-stat-number[data-target]');
        if (!counters.length) return;

        const countUp = (el, target) => {
            const duration = 1500;
            const start = performance.now();
            const step = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target, 10);
                    countUp(el, target);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    },

    /**
     * Dynamically inject Three.js and then globe.js.  Shows a lightweight
     * loading indicator inside the hero section while scripts download.
     * If Three.js fails to load the counters still animate and a static
     * fallback message is displayed instead of the 3-D globe.
     */
    _lazyLoadGlobe() {
        const container = document.getElementById('heroMapSection');
        if (!container) return;

        // Avoid loading twice
        if (this._globeLoading) return;
        this._globeLoading = true;

        // --- Lightweight spinner while loading ---
        const spinner = document.createElement('div');
        spinner.className = 'globe-loading-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        spinner.innerHTML = '<div class="globe-spinner-ring"></div>';
        container.appendChild(spinner);

        const removeSpinner = () => {
            if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
        };

        const showFallback = () => {
            removeSpinner();
            // Canvas stays but remains empty — no harm
            console.warn('[App] Three.js or globe.js failed to load — showing static fallback.');
        };

        // --- Step 1: load Three.js ---
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
        threeScript.async = true;

        threeScript.onload = () => {
            // --- Step 2: load globe.js ---
            const globeScript = document.createElement('script');
            globeScript.src = 'js/globe.js';
            globeScript.async = true;

            globeScript.onload = () => {
                removeSpinner();
                if (window.Globe) {
                    Globe.init('heroMapSection', 'mapCanvas');
                    Globe.animateCounters();
                }
            };

            globeScript.onerror = showFallback;
            document.body.appendChild(globeScript);
        };

        threeScript.onerror = showFallback;
        document.body.appendChild(threeScript);
    },

    // ── Psychologists ──

    _psychologists: [],
    _psiPage: 0,
    _psiPerPage: 6,

    async _loadPsychologists() {
        try {
            const res = await fetch('js/psi-data.json');
            if (res.ok) {
                const all = await res.json();
                this._psychologists = all.filter(p => p.photo && p.photo.trim() !== '');
            }
        } catch (e) {
            console.warn('Failed to load psi-data.json:', e);
        }
    },

    _renderPsychologists() {
        const grid = document.getElementById('psiGrid');
        if (!grid) return;

        if (!this._psychologists.length) {
            this._loadPsychologists().then(() => this._renderPsychologists());
            return;
        }

        const start = 0;
        const end = (this._psiPage + 1) * this._psiPerPage;
        const visible = this._psychologists.slice(start, end);
        const hasMore = end < this._psychologists.length;

        const formatName = (n) => {
            return n.split(' ').map(w => {
                if (w.length <= 2 && !w.match(/^(De|Do|Da|Dos|Das)$/i)) return w;
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }).join(' ').replace(/\s+/g, ' ').trim();
        };

        const extractTags = (psi) => {
            const tags = [];
            const spec = (psi.specialty || '').toLowerCase();
            if (spec.includes('ansiedade') || spec.includes('pânico')) tags.push('Ansiedade');
            if (spec.includes('depress')) tags.push('Depressão');
            if (spec.includes('tdah') || spec.includes('tea')) tags.push('TDAH/TEA');
            if (spec.includes('luto') || spec.includes('perda')) tags.push('Luto');
            if (spec.includes('autoestima') || spec.includes('auto-estima')) tags.push('Autoestima');
            if (spec.includes('casal') || spec.includes('casais')) tags.push('Casais');
            if (spec.includes('burnout') || spec.includes('estresse')) tags.push('Burnout');
            if (spec.includes('intercâmbio') || spec.includes('adaptação') || spec.includes('mudança')) tags.push('Adaptação');
            return tags.length ? tags.slice(0, 3) : ['Clínica Geral'];
        };

        const cleanPhone = (phone) => {
            if (!phone) return null;
            return phone.replace(/\D/g, '');
        };

        grid.innerHTML = visible.map((psi, i) => {
            const name = formatName(psi.name);
            const initials = name.replace(/^(Dra?\.\s)/, '').split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const tags = extractTags(psi);
            const location = [psi.city, psi.state].filter(Boolean).join('/');
            const phone = cleanPhone(psi.phone);
            const whatsappUrl = phone ? `https://wa.me/55${phone}` : '#';
            const profileUrl = psi.slug ? `https://cademeupsi.com.br/psicologo/${psi.slug}` : '#';
            const approach = (psi.approach || '').split(/[.,;]/)[0].trim();

            return `
                <div class="psi-card">
                    <span class="psi-card-badge intercambio">Esp. Intercâmbio</span>
                    ${psi.photo
                        ? `<img class="psi-card-photo" src="${psi.photo}" alt="${name}" loading="lazy" onerror="this.closest('.psi-card').style.display='none'">`
                        : ''}
                    <div class="psi-card-photo-placeholder" ${psi.photo ? 'style="display:none"' : ''}>${initials}</div>
                    <div class="psi-card-name">${name}</div>
                    <div class="psi-card-specialty">${approach || 'Psicóloga Clínica'}</div>
                    <div class="psi-card-crp">CRP ${psi.crp}${location ? ` · ${location}` : ''}</div>
                    <div class="psi-card-tags">
                        ${tags.map(t => `<span class="psi-card-tag">${t}</span>`).join('')}
                    </div>
                    <div class="psi-card-langs">
                        ${(psi.services || []).slice(0, 3).map(s => `<span class="psi-card-lang">${s}</span>`).join('')}
                    </div>
                    <div class="psi-card-actions">
                        <a class="psi-card-btn primary" href="${whatsappUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">WhatsApp</a>
                        <a class="psi-card-btn" href="${profileUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Perfil</a>
                    </div>
                </div>
            `;
        }).join('');

        if (hasMore) {
            grid.insertAdjacentHTML('beforeend', `
                <div class="psi-load-more" style="grid-column: 1 / -1; text-align: center; padding: var(--space-md);">
                    <button class="psi-card-btn primary" onclick="app._psiPage++; app._renderPsychologists();" style="max-width: 280px; margin: 0 auto; display: inline-block; padding: 12px 32px;">
                        Ver mais psicólogos (${this._psychologists.length - end} restantes)
                    </button>
                </div>
            `);
        }
    },

    // ── Default Content ──

    _renderDefaultContent() {
        this._loadUpcomingEvents();
    },

    async _loadUpcomingEvents() {
        const grid = document.getElementById('upcomingEventsGrid');
        const noMsg = document.getElementById('noEventsMsg');
        if (!grid) return;

        const sb = window.supabaseClient;
        if (!sb) {
            grid.innerHTML = '';
            if (noMsg) noMsg.style.display = '';
            return;
        }

        const { data: events } = await sb
            .from('events')
            .select('*, profiles(name, photo_url)')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(3);

        if (!events?.length) {
            grid.innerHTML = '';
            if (noMsg) noMsg.style.display = '';
            return;
        }

        grid.innerHTML = events.map(ev => this._renderEventCard(ev)).join('');
        if (noMsg) noMsg.style.display = 'none';
    },

    // ── Feed ──

    async _loadFeed() {
        const list = document.getElementById('feedList');
        if (!list) return;

        list.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
        try {
            const posts = await Feed.loadPosts(Feed._currentTopic);
            if (!posts.length) {
                list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><p>Nenhum post ainda. Seja o primeiro a compartilhar!</p></div>`;
                return;
            }
            list.innerHTML = posts.map(p => this._renderPostCard(p)).join('');
        } catch (e) {
            list.innerHTML = '<p class="empty-state">Erro ao carregar posts. Tente novamente.</p>';
        }
    },

    _renderPostCard(post) {
        const name = post.is_anonymous ? 'Anônimo' : (post.profiles?.name || 'Usuário');
        const initials = name.substring(0, 2).toUpperCase();
        const time = this._timeAgo(post.created_at);
        const topicLabels = {
            adaptacao: 'Adaptação', saudade: 'Saudade', cultura: 'Choque Cultural',
            idioma: 'Idioma', financeiro: 'Financeiro', dicas: 'Dicas', volta: 'Volta pra Casa',
        };

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${initials}</div>
                    <div>
                        <div class="post-author">${Validation.sanitizeHTML(name)}</div>
                        <div class="post-time" data-timestamp="${post.created_at}">${time}</div>
                    </div>
                    ${post.topic ? `<span class="post-topic-tag">${topicLabels[post.topic] || post.topic}</span>` : ''}
                </div>
                <div class="post-content">${Validation.sanitizeHTML(post.content)}</div>
                <div class="post-actions-bar">
                    <button class="post-action-btn" onclick="app._reactToPost('${post.id}')">
                        💙 Apoio
                    </button>
                    <button class="post-action-btn" onclick="app._toggleReplies('${post.id}')">
                        💬 Respostas
                    </button>
                </div>
                <div class="post-replies-container" id="replies-${post.id}" style="display:none">
                    <div class="replies-list" id="repliesList-${post.id}"></div>
                    <div class="reply-input-row">
                        <input type="text" class="reply-input" id="replyInput-${post.id}" placeholder="Escreva uma resposta..." maxlength="500">
                        <button class="reply-submit-btn" onclick="app._submitReply('${post.id}')">Enviar</button>
                    </div>
                </div>
            </div>
        `;
    },

    async _reactToPost(postId) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para reagir', 'info');
            return;
        }
        await Feed.reactToPost(postId);
        ErrorHandler.showToast('Apoio enviado!', 'success');
    },

    async _toggleReplies(postId) {
        const container = document.getElementById(`replies-${postId}`);
        if (!container) return;

        const isVisible = container.style.display !== 'none';
        if (isVisible) {
            container.style.display = 'none';
            return;
        }

        container.style.display = '';
        const list = document.getElementById(`repliesList-${postId}`);
        list.innerHTML = '<p class="empty-state" style="font-size:0.8rem">Carregando...</p>';

        try {
            const replies = await Feed.loadReplies(postId);
            if (!replies.length) {
                list.innerHTML = '<p class="empty-state" style="font-size:0.8rem">Nenhuma resposta ainda. Seja o primeiro!</p>';
            } else {
                list.innerHTML = replies.map(r => this._renderReplyCard(r)).join('');
            }
        } catch (e) {
            list.innerHTML = '<p class="empty-state" style="font-size:0.8rem">Erro ao carregar respostas.</p>';
        }

        const input = document.getElementById(`replyInput-${postId}`);
        if (input && !input._hasKeyHandler) {
            input._hasKeyHandler = true;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._submitReply(postId);
                }
            });
        }
    },

    _renderReplyCard(reply) {
        const name = reply.profiles?.name || 'Usuário';
        const initials = name.substring(0, 2).toUpperCase();
        const time = this._timeAgo(reply.created_at);
        return `
            <div class="reply-card">
                <div class="reply-avatar">${initials}</div>
                <div class="reply-body">
                    <div class="reply-header">
                        <span class="reply-author">${Validation.sanitizeHTML(name)}</span>
                        <span class="reply-time">${time}</span>
                    </div>
                    <div class="reply-content">${Validation.sanitizeHTML(reply.content)}</div>
                </div>
            </div>
        `;
    },

    async _submitReply(postId) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para responder', 'info');
            return;
        }

        const input = document.getElementById(`replyInput-${postId}`);
        const content = input?.value?.trim();
        if (!content) return;

        input.disabled = true;
        const result = await Feed.createReply(postId, content);
        input.disabled = false;

        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        input.value = '';
        ErrorHandler.showToast('Resposta enviada!', 'success');
        // Reload replies
        this._toggleReplies(postId); // hide
        this._toggleReplies(postId); // show with fresh data
    },

    async _handleSubmitPost() {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para publicar', 'warning');
            return;
        }

        const content = document.getElementById('postContent')?.value?.trim();
        const topic = document.getElementById('postTopic')?.value;
        const anonymous = document.getElementById('postAnonymous')?.checked;

        if (!content) {
            ErrorHandler.showToast('Escreva algo para compartilhar', 'warning');
            return;
        }
        if (!topic) {
            ErrorHandler.showToast('Escolha um tema', 'warning');
            return;
        }

        const submitBtn = document.getElementById('submitPost');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publicando...'; }

        const result = await Feed.createPost(content, topic, anonymous);

        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publicar'; }

        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        document.getElementById('postContent').value = '';
        document.getElementById('postTopic').value = '';
        document.getElementById('postCharCount').textContent = '0/1000';
        this._closePostModal();
        ErrorHandler.showToast('Post publicado!', 'success');
        this._loadFeed();
    },

    _closePostModal() {
        document.getElementById('newPostModal').style.display = 'none';
        // Return focus to the element that opened the modal
        if (this._modalTrigger) {
            this._modalTrigger.focus();
            this._modalTrigger = null;
        }
    },

    // ── Topic Filters ──

    _setupTopicFilters() {
        document.querySelectorAll('.topic-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                Feed._currentTopic = chip.dataset.topic;
                this._loadFeed();
            });
        });
    },

    // ── Mentors ──

    async _loadMentors() {
        const grid = document.getElementById('mentoresGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
        const mentors = await Profile.getMentors();

        if (!mentors.length) {
            grid.innerHTML = '';
            document.getElementById('noMentoresMsg').style.display = '';
            return;
        }

        document.getElementById('noMentoresMsg').style.display = 'none';
        grid.innerHTML = mentors.map(m => this._renderMentorCard(m)).join('');
    },

    _renderMentorCard(mentor) {
        const initials = (mentor.name || 'M').substring(0, 2).toUpperCase();
        const specialtyLabels = { psicologo: 'Psicólogo(a)', coach: 'Coach', mentor: 'Mentor(a)' };
        const languages = mentor.languages || ['pt'];

        return `
            <div class="mentor-card">
                ${mentor.photo_url
                    ? `<img class="mentor-photo" src="${Validation.sanitizeURL(mentor.photo_url)}" alt="${Validation.sanitizeHTML(mentor.name)}">`
                    : `<div class="mentor-photo-placeholder">${initials}</div>`
                }
                <div class="mentor-name">${Validation.sanitizeHTML(mentor.name)}</div>
                <div class="mentor-specialty">${specialtyLabels[mentor.specialty] || mentor.specialty || 'Profissional'}</div>
                ${mentor.crp ? `<div class="mentor-crp">CRP ${mentor.crp}</div>` : ''}
                <div class="mentor-languages">
                    ${languages.map(l => `<span class="mentor-lang-tag">${l.toUpperCase()}</span>`).join('')}
                </div>
                <div class="mentor-actions">
                    <button class="mentor-dm-btn" onclick="app.openDMWith('${mentor.id}', '${Validation.sanitizeHTML(mentor.name)}')">Mensagem</button>
                    <button class="mentor-profile-btn" onclick="app._viewMentorProfile('${mentor.id}')">Perfil</button>
                </div>
            </div>
        `;
    },

    async _viewMentorProfile(mentorId) {
        const modal = document.getElementById('mentorProfileModal');
        if (!modal) return;

        const sb = window.supabaseClient;
        if (!sb) return;

        const { data: mentor, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', mentorId)
            .single();

        if (error || !mentor) {
            ErrorHandler.showToast('Erro ao carregar perfil', 'error');
            return;
        }

        const specialtyLabels = { psicologo: 'Psicólogo(a)', coach: 'Coach', mentor: 'Mentor(a)' };
        const initials = (mentor.name || 'M').substring(0, 2).toUpperCase();
        const languages = mentor.languages || ['pt'];

        document.getElementById('mentorProfileBody').innerHTML = `
            <div class="mentor-profile-header">
                ${mentor.photo_url
                    ? `<img class="mentor-profile-photo" src="${Validation.sanitizeURL(mentor.photo_url)}" alt="${Validation.sanitizeHTML(mentor.name)}">`
                    : `<div class="mentor-profile-photo-placeholder">${initials}</div>`
                }
                <h3 class="mentor-profile-name">${Validation.sanitizeHTML(mentor.name)}</h3>
                <p class="mentor-profile-specialty">${specialtyLabels[mentor.specialty] || mentor.specialty || 'Profissional'}</p>
                ${mentor.crp ? `<p class="mentor-profile-crp">CRP ${mentor.crp}</p>` : ''}
                <div class="mentor-languages" style="justify-content:center">
                    ${languages.map(l => `<span class="mentor-lang-tag">${l.toUpperCase()}</span>`).join('')}
                </div>
            </div>
            ${mentor.bio ? `
                <div class="mentor-profile-section">
                    <h4>Sobre</h4>
                    <p>${Validation.sanitizeHTML(mentor.bio)}</p>
                </div>
            ` : ''}
            ${mentor.approach ? `
                <div class="mentor-profile-section">
                    <h4>Abordagem</h4>
                    <p>${Validation.sanitizeHTML(mentor.approach)}</p>
                </div>
            ` : ''}
            ${mentor.session_price ? `
                <div class="mentor-profile-section">
                    <h4>Valor da Sessão</h4>
                    <p>R$ ${mentor.session_price}</p>
                </div>
            ` : ''}
            <div class="mentor-profile-actions">
                <button class="mentor-dm-btn" onclick="app.openDMWith('${mentor.id}', '${Validation.sanitizeHTML(mentor.name)}'); document.getElementById('mentorProfileModal').style.display='none';">Enviar Mensagem</button>
            </div>
        `;

        modal.style.display = 'flex';
    },

    // ── Events ──

    _activeEventFilter: 'all',
    _cachedEvents: null,

    _setupEventFilters() {
        document.querySelectorAll('.event-type-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.event-type-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this._activeEventFilter = chip.dataset.type;
                this._applyEventFilter();
            });
        });
    },

    _applyEventFilter() {
        const list = document.getElementById('eventsList');
        if (!list || !this._cachedEvents) return;

        const filtered = this._activeEventFilter === 'all'
            ? this._cachedEvents
            : this._cachedEvents.filter(ev => ev.event_type === this._activeEventFilter);

        if (!filtered.length) {
            list.innerHTML = '<p class="empty-state">Nenhum evento deste tipo no momento.</p>';
        } else {
            list.innerHTML = filtered.map(ev => this._renderEventCard(ev)).join('');
        }
    },

    async _loadEvents() {
        const list = document.getElementById('eventsList');
        if (!list) return;

        this._setupEventFilters();
        this._setupEventViewTabs();

        const sb = window.supabaseClient;
        if (!sb) {
            list.innerHTML = '<p class="empty-state">Nenhum encontro agendado no momento.</p>';
            return;
        }

        list.innerHTML = '<p class="empty-state">Carregando eventos...</p>';

        const { data: events, error } = await sb
            .from('events')
            .select('*, profiles(name, photo_url)')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true });

        if (error || !events?.length) {
            this._cachedEvents = null;
            list.innerHTML = '<p class="empty-state">Nenhum encontro agendado no momento.</p>';
            return;
        }

        this._cachedEvents = events;
        this._applyEventFilter();
    },

    async _registerForEvent(eventId) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para se inscrever', 'info');
            this._switchTab('authView');
            return;
        }
        if (this._registeringEvent) return;
        this._registeringEvent = true;

        const btn = document.querySelector(`[onclick*="_registerForEvent('${eventId}')"]`);
        if (btn) { btn.disabled = true; btn.textContent = 'Inscrevendo...'; }

        try {
            const sb = window.supabaseClient;
            if (!sb) return;

            // Check if already registered
            const { data: existing } = await sb
                .from('event_registrations')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', this.currentUser.id)
                .maybeSingle();

            if (existing) {
                ErrorHandler.showToast('Você já está inscrito neste evento!', 'info');
                return;
            }

            // Check if event has available spots
            const { data: ev } = await sb
                .from('events')
                .select('current_spots, max_spots')
                .eq('id', eventId)
                .single();

            if (ev && ev.max_spots > 0 && (ev.current_spots || 0) >= ev.max_spots) {
                ErrorHandler.showToast('Este evento está lotado!', 'warning');
                return;
            }

            const { error } = await sb
                .from('event_registrations')
                .insert({ event_id: eventId, user_id: this.currentUser.id });

            if (error) {
                ErrorHandler.showToast('Erro ao inscrever: ' + error.message, 'error');
                return;
            }

            // Increment current_spots
            await sb.rpc('increment_event_spots', { eid: eventId });

            ErrorHandler.showToast('Inscrição realizada com sucesso!', 'success');
            this._loadEvents();
            this._loadMyEvents();
        } finally {
            this._registeringEvent = false;
        }
    },

    async _cancelEventRegistration(eventId) {
        if (!this.currentUser) return;
        if (!confirm('Tem certeza que deseja cancelar sua inscrição?')) return;

        const sb = window.supabaseClient;
        if (!sb) return;

        const { error } = await sb
            .from('event_registrations')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', this.currentUser.id);

        if (error) {
            ErrorHandler.showToast('Erro ao cancelar: ' + error.message, 'error');
            return;
        }

        await sb.rpc('decrement_event_spots', { eid: eventId });

        ErrorHandler.showToast('Inscrição cancelada.', 'info');
        this._loadEvents();
        this._loadMyEvents();
    },

    _setupEventViewTabs() {
        document.querySelectorAll('.event-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.event-view-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const view = tab.dataset.view;
                document.getElementById('allEventsView').style.display = view === 'all' ? '' : 'none';
                document.getElementById('myEventsView').style.display = view === 'mine' ? '' : 'none';
                if (view === 'mine') this._loadMyEvents();
            });
        });
    },

    async _loadMyEvents() {
        const list = document.getElementById('myEventsList');
        const noMsg = document.getElementById('noMyEventsMsg');
        if (!list) return;

        if (!this.currentUser) {
            list.innerHTML = '';
            if (noMsg) { noMsg.style.display = ''; noMsg.textContent = 'Faça login para ver seus eventos.'; }
            return;
        }

        const sb = window.supabaseClient;
        if (!sb) return;

        list.innerHTML = '<p class="empty-state">Carregando...</p>';

        const { data: regs } = await sb
            .from('event_registrations')
            .select('event_id, events(*, profiles(name, photo_url))')
            .eq('user_id', this.currentUser.id)
            .order('created_at', { ascending: false });

        const events = (regs || []).map(r => r.events).filter(Boolean);

        if (!events.length) {
            list.innerHTML = '';
            if (noMsg) noMsg.style.display = '';
            return;
        }

        if (noMsg) noMsg.style.display = 'none';
        list.innerHTML = events.map(ev => this._renderMyEventCard(ev)).join('');
    },

    _renderMyEventCard(ev) {
        const date = new Date(ev.event_date).toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const typeLabels = { roda: '🟢 Roda de Conversa', workshop: '🟢 Workshop', jornada: '🗺️ Jornada', live: '🔴 Live' };
        const isPast = new Date(ev.event_date) < new Date();
        const meetingBtn = ev.meeting_link && !isPast
            ? `<a href="${ev.meeting_link}" target="_blank" rel="noopener" class="event-card-btn">Acessar Reunião</a>`
            : '';
        const cancelBtn = !isPast
            ? `<button class="event-card-btn event-card-btn-cancel" onclick="app._cancelEventRegistration('${ev.id}')">Cancelar Inscrição</button>`
            : '';

        return `
            <div class="event-card ${isPast ? 'event-card-past' : ''}">
                <span class="event-card-type">${typeLabels[ev.event_type] || ev.event_type}</span>
                <div class="event-card-title">${Validation.sanitizeHTML(ev.title)}</div>
                <div class="event-card-meta">
                    <span>${date}</span>
                    <span class="event-card-host">${ev.profiles?.name || 'Profissional'}</span>
                </div>
                ${isPast ? '<span class="event-card-badge-past">Encerrado</span>' : '<span class="event-card-badge-active">Inscrito</span>'}
                <div class="event-card-actions">${meetingBtn}${cancelBtn}</div>
            </div>
        `;
    },

    _renderEventCard(ev) {
        const date = new Date(ev.event_date).toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const typeLabels = { roda: '🟢 Roda de Conversa', workshop: '🟢 Workshop', jornada: '🗺️ Jornada', live: '🔴 Live' };
        const priceText = ev.price === 0 ? 'Gratuito' : `R$ ${ev.price}`;
        const spotsText = `${ev.current_spots || 0}/${ev.max_spots || '∞'} vagas`;

        const isFull = ev.max_spots > 0 && (ev.current_spots || 0) >= ev.max_spots;
        let actionBtn;
        if (isFull) {
            actionBtn = `<button class="event-card-btn event-card-btn-disabled" disabled>Vagas Esgotadas</button>`;
        } else if (ev.payment_link) {
            actionBtn = `<a href="${ev.payment_link}" target="_blank" rel="noopener" class="event-card-btn">Inscreva-se — ${priceText}</a>`;
        } else {
            actionBtn = `<button class="event-card-btn" onclick="app._registerForEvent('${ev.id}')">${ev.price === 0 ? 'Participar' : `Inscreva-se — ${priceText}`}</button>`;
        }

        const descHtml = ev.description
            ? `<div class="event-card-desc">${Validation.sanitizeHTML(ev.description.slice(0, 120))}${ev.description.length > 120 ? '...' : ''}</div>`
            : '';

        return `
            <div class="event-card" data-event-type="${ev.event_type}">
                <span class="event-card-type">${typeLabels[ev.event_type] || ev.event_type}</span>
                <div class="event-card-title">${Validation.sanitizeHTML(ev.title)}</div>
                ${descHtml}
                <div class="event-card-meta">
                    <span>${date}</span>
                    <span class="event-card-host">${ev.profiles?.name || 'Profissional'}</span>
                </div>
                <div class="event-card-footer">
                    <span class="event-card-price ${ev.price === 0 ? 'free' : ''}">${priceText}</span>
                    <span class="event-card-spots">${spotsText}</span>
                </div>
                ${actionBtn}
            </div>
        `;
    },

    // ── DM ──

    async _loadDMList() {
        const list = document.getElementById('dmConversationsList');
        const noMsg = document.getElementById('noDMsMsg');
        if (!list) return;

        list.innerHTML = '';
        const conversations = await Messages.getConversations();

        if (!conversations.length) {
            noMsg.style.display = '';
            return;
        }
        noMsg.style.display = 'none';

        list.innerHTML = conversations.map(c => {
            const initials = (c.other_user_name || '?').substring(0, 2).toUpperCase();
            const time = c.last_message_at ? this._timeAgo(c.last_message_at) : '';
            return `
                <div class="dm-conversation-item" onclick="app._openChat('${c.conversation_id}', '${Validation.sanitizeHTML(c.other_user_name || '')}')">
                    <div class="dm-conv-avatar">${initials}</div>
                    <div class="dm-conv-info">
                        <div class="dm-conv-name">${Validation.sanitizeHTML(c.other_user_name || 'Usuário')}</div>
                        <div class="dm-conv-preview">${Validation.sanitizeHTML(c.last_message || '')}</div>
                    </div>
                    <div>
                        <div class="dm-conv-time" data-timestamp="${c.last_message_at || ''}">${time}</div>
                        ${c.unread_count > 0 ? `<div class="dm-conv-unread">${c.unread_count}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    async _openChat(conversationId, userName) {
        this._currentConversationId = conversationId;
        document.getElementById('dmChatUserName').textContent = userName;
        this._switchTab('dmChatView');

        await Messages.markAsRead(conversationId);
        const messages = await Messages.loadMessages(conversationId);

        const container = document.getElementById('dmChatMessages');
        container.innerHTML = messages.map(m => `
            <div class="dm-msg ${m.sender_id === this.currentUser?.id ? 'sent' : 'received'}">
                <div>${Validation.sanitizeHTML(m.content)}</div>
                <div class="dm-msg-time">${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    },

    async openDMWith(userId, userName) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para enviar mensagens', 'warning');
            this._switchTab('authView');
            return;
        }

        const conversationId = await Messages.getOrCreateConversation(userId);
        if (conversationId) {
            this._openChat(conversationId, userName);
        }
    },

    async _handleSendDM() {
        const input = document.getElementById('dmChatInput');
        const content = input?.value?.trim();
        if (!content || !this._currentConversationId) return;

        const sendBtn = document.getElementById('dmSendBtn');
        if (sendBtn) sendBtn.disabled = true;
        input.disabled = true;

        const result = await Messages.sendMessage(this._currentConversationId, content);

        if (sendBtn) sendBtn.disabled = false;
        input.disabled = false;

        if (result.error) {
            ErrorHandler.showToast(result.error, 'warning');
            return;
        }

        input.value = '';

        const container = document.getElementById('dmChatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'dm-msg sent';
        msgDiv.innerHTML = `
            <div>${Validation.sanitizeHTML(content)}</div>
            <div class="dm-msg-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        input.focus();
    },

    _onRealtimeDM(msg) {
        if (this.currentTab === 'dmChatView' && msg.conversation_id === this._currentConversationId) {
            const container = document.getElementById('dmChatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'dm-msg received';
            msgDiv.innerHTML = `
                <div>${Validation.sanitizeHTML(msg.content)}</div>
                <div class="dm-msg-time">${new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
            Messages.markAsRead(msg.conversation_id);
        }
    },

    // ── Profile ──

    _renderProfile() {
        const container = document.getElementById('profileContainer');
        if (!container) return;

        const profile = this._userProfile;
        const profileType = localStorage.getItem('ic_profile') || 'intercambista';
        const typeLabels = {
            intercambista: 'Intercambista',
            futuro: 'Futuro Intercambista',
            familiar: 'Familiar',
            profissional: 'Profissional',
        };

        const completeness = Profile.getCompleteness(profile);
        const initials = (profile?.name || this.currentUser?.email || '?').substring(0, 2).toUpperCase();
        const s = (v) => Validation.sanitizeHTML(v || '');

        const avatarHtml = profile?.photo_url
            ? `<img class="profile-avatar-img" src="${Validation.sanitizeURL(profile.photo_url)}" alt="Avatar" id="profileAvatarImg">`
            : `<div class="profile-avatar-initials" id="profileAvatarImg">${initials}</div>`;

        const motivationHtml = completeness.percent < 70
            ? `<div class="profile-motivation">
                <strong>Complete seu perfil!</strong> Quanto mais informações você preencher, mais fácil será encontrar pessoas com objetivos semelhantes ao seu. Perfis completos têm muito mais chances de fazer conexões relevantes na comunidade.
               </div>`
            : '';

        container.innerHTML = `
            <div class="auth-card" style="max-width:100%;position:relative">
                <button class="profile-close-btn" onclick="app._closeProfile()" aria-label="Fechar perfil">&times;</button>
                <h2 class="auth-title">Meu Perfil</h2>
                <p class="auth-subtitle">${typeLabels[profileType]}</p>

                <div class="profile-avatar-section">
                    ${avatarHtml}
                    <input type="file" id="profileAvatarInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="app._handleAvatarUpload()">
                    <span class="profile-avatar-upload" onclick="document.getElementById('profileAvatarInput').click()">Alterar foto</span>
                </div>

                ${motivationHtml}

                <div class="profile-progress-bar"><div class="profile-progress-fill" style="width:${completeness.percent}%"></div></div>
                <div class="profile-progress-label">${completeness.percent}% completo${completeness.missing.length > 0 ? ' — faltam: ' + completeness.missing.slice(0, 3).join(', ') + (completeness.missing.length > 3 ? '...' : '') : ''}</div>

                <!-- Seção: Dados Pessoais -->
                <div class="profile-section" id="profileSectionPersonal">
                    <div class="profile-section-header" onclick="app._toggleProfileSection('profileSectionPersonal')">
                        <span>Dados Pessoais</span>
                        <span class="profile-section-arrow">&#9660;</span>
                    </div>
                    <div class="profile-section-body">
                        <div class="profile-field-group">
                            <div class="form-group">
                                <label>Nome</label>
                                <input type="text" class="form-input" id="profileName" value="${s(profile?.name)}" placeholder="Seu nome">
                            </div>
                            <div class="form-group">
                                <label>Ano de nascimento</label>
                                <input type="number" class="form-input" id="profileBirthYear" value="${profile?.birth_year || ''}" placeholder="Ex: 1995" min="1940" max="2010">
                            </div>
                            <div class="form-group">
                                <label>Cidade de origem</label>
                                ${this._buildSelect('profileCityOrigin', [['', 'Selecione sua cidade...'], ...BRAZILIAN_CITIES.map(c => [c, c]), ...(profile?.city_origin && !BRAZILIAN_CITIES.includes(profile.city_origin) && profile.city_origin !== '' ? [[profile.city_origin, profile.city_origin]] : [])], profile?.city_origin || '')}
                            </div>
                            <div class="form-group">
                                <label>Profissão</label>
                                <input type="text" class="form-input" id="profileProfession" value="${s(profile?.profession)}" placeholder="Ex: Designer, Estudante...">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seção: Intercâmbio -->
                <div class="profile-section" id="profileSectionExchange">
                    <div class="profile-section-header" onclick="app._toggleProfileSection('profileSectionExchange')">
                        <span>Intercâmbio</span>
                        <span class="profile-section-arrow">&#9660;</span>
                    </div>
                    <div class="profile-section-body">
                        <div class="profile-field-group">
                            <div class="form-group">
                                <label>País de destino</label>
                                ${this._buildSelect('profileDestCountry', [['', 'Selecione o país...'], ...Object.keys(COUNTRY_CITIES).map(c => [c, c])], profile?.destination_country || '')}
                            </div>
                            <div class="form-group">
                                <label>Cidade de destino</label>
                                ${this._buildCitySelect(profile?.destination_country, profile?.destination_city)}
                            </div>
                            <div class="form-group">
                                <label>Previsão de embarque</label>
                                ${(() => {
                                    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                                    const now = new Date();
                                    const opts = [['', 'Selecione...'], ['Já embarquei', 'Já embarquei']];
                                    for (let i = 0; i < 24; i++) {
                                        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                                        const label = months[d.getMonth()] + ' ' + d.getFullYear();
                                        opts.push([label, label]);
                                    }
                                    opts.push(['Ainda não sei', 'Ainda não sei']);
                                    return this._buildSelect('profilePlannedDeparture', opts, profile?.planned_departure || '');
                                })()}
                            </div>
                            <div class="form-group">
                                <label>Tipo de intercâmbio</label>
                                ${this._buildSelect('profileObjective', [
                                    ['', 'Selecione o tipo...'],
                                    ['Curso de idioma', 'Curso de idioma'],
                                    ['Graduação', 'Graduação'],
                                    ['Pós-graduação / MBA', 'Pós-graduação / MBA'],
                                    ['Mestrado / Doutorado', 'Mestrado / Doutorado'],
                                    ['Work & Travel', 'Work & Travel'],
                                    ['Au Pair', 'Au Pair'],
                                    ['Estágio / Trainee', 'Estágio / Trainee'],
                                    ['Trabalho', 'Trabalho'],
                                    ['Voluntariado', 'Voluntariado'],
                                    ['Nômade digital', 'Nômade digital'],
                                    ['High School', 'High School'],
                                    ['Imigração', 'Imigração'],
                                ], profile?.exchange_objective || '')}
                            </div>
                            <div class="form-group" style="grid-column: 1 / -1">
                                <label>Objetivo do intercâmbio</label>
                                <textarea class="form-textarea" id="profileGoal" rows="2" placeholder="Descreva seu objetivo... Ex: Quero melhorar meu inglês para conseguir uma promoção no trabalho">${s(profile?.exchange_goal)}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Duração prevista</label>
                                ${this._buildSelect('profileDuration', [
                                    ['', 'Selecione a duração...'],
                                    ['1 mês', '1 mês'],
                                    ['2 meses', '2 meses'],
                                    ['3 meses', '3 meses'],
                                    ['4 meses', '4 meses'],
                                    ['6 meses', '6 meses'],
                                    ['9 meses', '9 meses'],
                                    ['1 ano', '1 ano'],
                                    ['1 ano e meio', '1 ano e meio'],
                                    ['2 anos', '2 anos'],
                                    ['Mais de 2 anos', 'Mais de 2 anos'],
                                    ['Indefinido', 'Indefinido'],
                                ], profile?.exchange_duration || '')}
                            </div>
                            <div class="form-group">
                                <label>Status do intercâmbio</label>
                                ${this._buildSelect('profileExchangeStatus', [
                                    ['planejando', 'Planejando'],
                                    ['preparando', 'Preparando documentação'],
                                    ['no_exterior', 'Já estou no exterior'],
                                    ['retornou', 'Já retornei'],
                                ], profile?.exchange_status || 'planejando')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seção: Idioma -->
                <div class="profile-section" id="profileSectionLanguage">
                    <div class="profile-section-header" onclick="app._toggleProfileSection('profileSectionLanguage')">
                        <span>Idioma</span>
                        <span class="profile-section-arrow">&#9660;</span>
                    </div>
                    <div class="profile-section-body">
                        <div class="profile-field-group">
                            <div class="form-group">
                                <label>Idioma que está aprendendo</label>
                                ${this._buildSelect('profileTargetLanguage', [
                                    ['', 'Selecione o idioma...'],
                                    ['Inglês', 'Inglês'],
                                    ['Espanhol', 'Espanhol'],
                                    ['Francês', 'Francês'],
                                    ['Alemão', 'Alemão'],
                                    ['Italiano', 'Italiano'],
                                    ['Japonês', 'Japonês'],
                                    ['Coreano', 'Coreano'],
                                    ['Mandarim', 'Mandarim'],
                                    ['Holandês', 'Holandês'],
                                    ['Árabe', 'Árabe'],
                                ], profile?.target_language || '')}
                            </div>
                            <div class="form-group">
                                <label>Nível do idioma</label>
                                ${this._buildSelect('profileLanguageLevel', [
                                    ['', 'Selecione...'],
                                    ['iniciante', 'Iniciante'],
                                    ['basico', 'Básico'],
                                    ['intermediario', 'Intermediário'],
                                    ['avancado', 'Avançado'],
                                    ['fluente', 'Fluente'],
                                ], profile?.language_level || '')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seção: Sobre Mim -->
                <div class="profile-section" id="profileSectionAbout">
                    <div class="profile-section-header" onclick="app._toggleProfileSection('profileSectionAbout')">
                        <span>Sobre Mim</span>
                        <span class="profile-section-arrow">&#9660;</span>
                    </div>
                    <div class="profile-section-body">
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea class="form-textarea" id="profileBio" rows="3" placeholder="Conte um pouco sobre sua experiência...">${s(profile?.bio)}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Interesses</label>
                            <div class="profile-interests-tags" id="profileInterestsTags">
                                ${['Cultura', 'Culinária', 'Esportes', 'Música', 'Tecnologia', 'Viagem', 'Idiomas', 'Networking', 'Empreendedorismo', 'Fotografia'].map(tag => {
                                    const sel = (profile?.interests || []).includes(tag) ? ' selected' : '';
                                    return `<span class="profile-interest-tag${sel}" onclick="app._toggleInterestTag(this)">${tag}</span>`;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label>O que busco na comunidade</label>
                            <textarea class="form-textarea" id="profileLookingFor" rows="2" placeholder="Ex: Dicas sobre moradia, amigos na mesma cidade...">${s(profile?.looking_for)}</textarea>
                        </div>
                    </div>
                </div>

                <button id="profileSaveBtn" class="btn-primary btn-full" onclick="app._saveProfile()" style="margin-top:var(--space-md)">Salvar Perfil</button>

                <div style="margin-top: var(--space-xl); padding-top: var(--space-md); border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: var(--space-sm)">
                    <button class="btn-outline btn-full" onclick="app._changePassword()">Alterar senha</button>
                    <button class="btn-outline btn-full" style="color: var(--danger); border-color: var(--danger)" onclick="app._handleLogout()">Sair da conta</button>
                </div>
            </div>
        `;

        // Bind country → city dynamic select
        document.getElementById('profileDestCountry')?.addEventListener('change', () => this._onCountryChange());

        if (this._isAdmin()) {
            this._renderAdminPanel();
        }
    },

    _closeProfile() {
        const target = this._previousTab || 'tabJornadaContent';
        this._switchTab(target);
    },

    // ── Admin Panel in Profile ──

    _adminProfileUsers: [],
    _adminProfilePage: 0,
    _adminProfilePageSize: 15,
    _adminProfileStats: {},
    _adminProfileFilterRole: '',
    _adminProfileFilterBlocked: '',
    _adminProfileSearch: '',
    _adminProfileTab: 'overview',

    async _renderAdminPanel() {
        const container = document.getElementById('profileContainer');
        if (!container) return;

        const section = document.createElement('div');
        section.className = 'profile-admin-section';
        section.id = 'profileAdminSection';
        section.innerHTML = `
            <h3 class="section-title" style="margin-bottom: var(--space-sm)">Painel Administrativo</h3>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:var(--space-md)">Gerencie toda a plataforma de um lugar</p>

            <div class="pa-tabs" id="paAdminTabs">
                <button class="pa-tab active" data-pa="overview">Visao Geral</button>
                <button class="pa-tab" data-pa="users">Usuarios</button>
                <button class="pa-tab" data-pa="events">Eventos</button>
                <button class="pa-tab" data-pa="groups">Grupos</button>
                <button class="pa-tab" data-pa="feed">Feed</button>
                <button class="pa-tab" data-pa="notifs">Notificacoes</button>
                <button class="pa-tab" data-pa="checkins">Check-ins</button>
            </div>

            <div class="pa-panel" id="paOverview"></div>
            <div class="pa-panel" id="paUsers" style="display:none"></div>
            <div class="pa-panel" id="paEvents" style="display:none"></div>
            <div class="pa-panel" id="paGroups" style="display:none"></div>
            <div class="pa-panel" id="paFeed" style="display:none"></div>
            <div class="pa-panel" id="paNotifs" style="display:none"></div>
            <div class="pa-panel" id="paCheckins" style="display:none"></div>
        `;
        container.appendChild(section);

        // Setup tab switching
        section.querySelectorAll('.pa-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                section.querySelectorAll('.pa-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.pa;
                this._adminProfileTab = target;
                const panels = ['paOverview', 'paUsers', 'paEvents', 'paGroups', 'paFeed', 'paNotifs', 'paCheckins'];
                const panelMap = { overview: 'paOverview', users: 'paUsers', events: 'paEvents', groups: 'paGroups', feed: 'paFeed', notifs: 'paNotifs', checkins: 'paCheckins' };
                panels.forEach(p => {
                    const el = document.getElementById(p);
                    if (el) el.style.display = p === panelMap[target] ? '' : 'none';
                });
                this._loadAdminProfileTab(target);
            });
        });

        // Load overview first
        this._loadAdminProfileTab('overview');
    },

    async _loadAdminProfileTab(tab) {
        switch (tab) {
            case 'overview': return this._loadPAOverview();
            case 'users': return this._loadPAUsers();
            case 'events': return this._loadPAEvents();
            case 'groups': return this._loadPAGroups();
            case 'feed': return this._loadPAFeed();
            case 'notifs': return this._loadPANotifs();
            case 'checkins': return this._loadPACheckins();
        }
    },

    // ── PA: Overview ──

    async _loadPAOverview() {
        const panel = document.getElementById('paOverview');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando...</p>';

        const stats = await Admin.getStats();

        const items = [
            { label: 'Usuarios', value: stats.users, icon: '👥' },
            { label: 'Mentores', value: stats.mentors, icon: '🧠' },
            { label: 'Posts', value: stats.posts, icon: '💬' },
            { label: 'Eventos', value: stats.events, icon: '📅' },
            { label: 'Grupos', value: stats.groups, icon: '🌍' },
            { label: 'Check-ins', value: stats.checkins, icon: '😊' },
        ];

        panel.innerHTML = `
            <div class="profile-admin-stats" style="grid-template-columns:repeat(3,1fr)">
                ${items.map(s => `
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon">${s.icon}</div>
                        <div class="admin-stat-number">${s.value}</div>
                        <div class="admin-stat-label">${s.label}</div>
                    </div>
                `).join('')}
            </div>
            <h4 class="pa-section-title">Acoes Rapidas</h4>
            <div class="pa-quick-actions">
                <button class="pa-action-btn" onclick="app._paQuickAction('event')">
                    <span>📅</span> Novo Evento
                </button>
                <button class="pa-action-btn" onclick="app._paQuickAction('group')">
                    <span>🌍</span> Novo Grupo
                </button>
                <button class="pa-action-btn" onclick="app._paQuickAction('notif')">
                    <span>📢</span> Enviar Notificacao
                </button>
                <button class="pa-action-btn" onclick="app._paQuickAction('users')">
                    <span>👥</span> Gerenciar Usuarios
                </button>
            </div>
        `;
    },

    _paQuickAction(action) {
        if (action === 'event') {
            this._openEventForm(null);
        } else if (action === 'group') {
            this._openGroupForm(null);
        } else if (action === 'notif') {
            // Switch to notifs tab
            const tab = document.querySelector('.pa-tab[data-pa="notifs"]');
            if (tab) tab.click();
        } else if (action === 'users') {
            const tab = document.querySelector('.pa-tab[data-pa="users"]');
            if (tab) tab.click();
        }
    },

    // ── PA: Users ──

    async _loadPAUsers() {
        const panel = document.getElementById('paUsers');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando usuarios...</p>';

        const result = await Admin.loadProfilesWithCounts();
        this._adminProfileUsers = result.profiles;
        this._adminProfileStats = result.stats;

        const statsItems = [
            { label: 'Total', value: result.stats.total || 0, icon: '👥' },
            { label: 'Mentores', value: result.stats.mentors || 0, icon: '🧠' },
            { label: 'Admins', value: result.stats.admins || 0, icon: '🛡️' },
            { label: 'Bloqueados', value: result.stats.blocked || 0, icon: '🚫' },
        ];

        panel.innerHTML = `
            <div class="profile-admin-stats" id="profileAdminStats">
                ${statsItems.map(s => `
                    <div class="admin-stat-card">
                        <div class="admin-stat-icon">${s.icon}</div>
                        <div class="admin-stat-number">${s.value}</div>
                        <div class="admin-stat-label">${s.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="profile-admin-toolbar" id="profileAdminToolbar">
                <input type="text" class="form-input" id="profileAdminSearch" placeholder="Buscar por nome ou email..." style="flex:1;min-width:150px">
                <select class="form-select-sm" id="profileAdminFilterRole">
                    <option value="">Todos os roles</option>
                    <option value="user">User</option>
                    <option value="mentor">Mentor</option>
                    <option value="admin">Admin</option>
                </select>
                <select class="form-select-sm" id="profileAdminFilterBlocked">
                    <option value="">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="blocked">Bloqueados</option>
                </select>
            </div>
            <div class="profile-admin-table-wrap" id="profileAdminTableWrap"></div>
            <div class="profile-admin-pagination" id="profileAdminPagination"></div>
        `;

        // Setup listeners (with debounce on search)
        let searchTimer;
        document.getElementById('profileAdminSearch').addEventListener('input', (e) => {
            this._adminProfileSearch = e.target.value.trim().toLowerCase();
            this._adminProfilePage = 0;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => this._adminFilterUsers(), 300);
        });
        document.getElementById('profileAdminFilterRole').addEventListener('change', (e) => {
            this._adminProfileFilterRole = e.target.value;
            this._adminProfilePage = 0;
            this._adminFilterUsers();
        });
        document.getElementById('profileAdminFilterBlocked').addEventListener('change', (e) => {
            this._adminProfileFilterBlocked = e.target.value;
            this._adminProfilePage = 0;
            this._adminFilterUsers();
        });

        this._adminFilterUsers();
    },

    _renderAdminProfileStats() {
        const container = document.getElementById('profileAdminStats');
        if (!container) return;
        const stats = this._adminProfileStats;
        const items = [
            { label: 'Total', value: stats.total || 0, icon: '👥' },
            { label: 'Mentores', value: stats.mentors || 0, icon: '🧠' },
            { label: 'Admins', value: stats.admins || 0, icon: '🛡️' },
            { label: 'Bloqueados', value: stats.blocked || 0, icon: '🚫' },
        ];
        container.innerHTML = items.map(s => `
            <div class="admin-stat-card">
                <div class="admin-stat-icon">${s.icon}</div>
                <div class="admin-stat-number">${s.value}</div>
                <div class="admin-stat-label">${s.label}</div>
            </div>
        `).join('');
    },

    _adminFilterUsers() {
        let filtered = [...this._adminProfileUsers];
        if (this._adminProfileSearch) {
            const q = this._adminProfileSearch;
            filtered = filtered.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        }
        if (this._adminProfileFilterRole) {
            filtered = filtered.filter(u => u.role === this._adminProfileFilterRole);
        }
        if (this._adminProfileFilterBlocked === 'blocked') {
            filtered = filtered.filter(u => u.is_blocked);
        } else if (this._adminProfileFilterBlocked === 'active') {
            filtered = filtered.filter(u => !u.is_blocked);
        }
        this._renderAdminUsersTable(filtered);
    },

    _renderAdminUsersTable(users) {
        const wrap = document.getElementById('profileAdminTableWrap');
        const pagWrap = document.getElementById('profileAdminPagination');
        if (!wrap) return;

        if (!users.length) {
            wrap.innerHTML = '<p class="empty-state">Nenhum usuario encontrado.</p>';
            if (pagWrap) pagWrap.innerHTML = '';
            return;
        }

        const page = this._adminProfilePage;
        const size = this._adminProfilePageSize;
        const totalPages = Math.ceil(users.length / size);
        const paged = users.slice(page * size, (page + 1) * size);

        wrap.innerHTML = `
            <table class="profile-admin-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Cadastro</th>
                        <th>Posts</th>
                        <th>Acoes</th>
                    </tr>
                </thead>
                <tbody>
                    ${paged.map(u => {
                        const name = Validation.sanitizeHTML(u.name || 'Sem nome');
                        const initials = (u.name || u.email || '?').substring(0, 2).toUpperCase();
                        const email = Validation.sanitizeHTML(u.email || '');
                        const blocked = u.is_blocked;
                        const roleOptions = ['user', 'mentor', 'admin'].map(r =>
                            `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
                        ).join('');
                        const date = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-';
                        const safeName = Validation.sanitizeHTML(u.name || 'Usuario').replace(/'/g, "\\'");

                        return `
                            <tr class="${blocked ? 'pa-row-blocked' : ''}">
                                <td>
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <div class="post-avatar" style="width:32px;height:32px;font-size:0.7rem;flex-shrink:0">${initials}</div>
                                        <span>${name}</span>
                                    </div>
                                </td>
                                <td><a href="mailto:${email}" class="pa-email-link">${email}</a></td>
                                <td>
                                    <select class="form-select-sm" onchange="app._changeUserRole('${u.id}', this.value)">
                                        ${roleOptions}
                                    </select>
                                </td>
                                <td>
                                    <span class="${blocked ? 'badge-blocked' : 'badge-active'}">${blocked ? 'Bloqueado' : 'Ativo'}</span>
                                </td>
                                <td style="white-space:nowrap">${date}</td>
                                <td>${u._postCount || 0}</td>
                                <td>
                                    <div class="pa-action-group">
                                        <button class="${blocked ? 'admin-btn-unblock' : 'admin-btn-block'}" onclick="app._adminToggleBlock('${u.id}', ${!blocked})" title="${blocked ? 'Desbloquear' : 'Bloquear'}">
                                            ${blocked ? '🔓' : '🔒'}
                                        </button>
                                        <button class="admin-btn-msg" onclick="app._adminSendDM('${u.id}', '${safeName}')" title="Enviar mensagem">
                                            ✉️
                                        </button>
                                        <button class="admin-btn-msg" onclick="app._adminEmailUser('${email}')" title="Enviar email">
                                            📧
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        if (pagWrap && totalPages > 1) {
            pagWrap.innerHTML = `
                <button class="btn-outline btn-sm" ${page === 0 ? 'disabled' : ''} onclick="app._adminProfileGoPage(${page - 1})">Anterior</button>
                <span class="admin-page-info">${page + 1} / ${totalPages} (${users.length} usuarios)</span>
                <button class="btn-outline btn-sm" ${page >= totalPages - 1 ? 'disabled' : ''} onclick="app._adminProfileGoPage(${page + 1})">Proxima</button>
            `;
        } else if (pagWrap) {
            pagWrap.innerHTML = '';
        }
    },

    _adminProfileGoPage(page) {
        this._adminProfilePage = page;
        this._adminFilterUsers();
    },

    async _adminToggleBlock(userId, block) {
        const action = block ? 'bloquear' : 'desbloquear';
        if (!confirm(`Tem certeza que deseja ${action} este usuario?`)) return;

        const result = await Admin.toggleBlockUser(userId, block);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        const user = this._adminProfileUsers.find(u => u.id === userId);
        if (user) user.is_blocked = block;

        if (block) {
            this._adminProfileStats.blocked = (this._adminProfileStats.blocked || 0) + 1;
        } else {
            this._adminProfileStats.blocked = Math.max(0, (this._adminProfileStats.blocked || 0) - 1);
        }

        this._renderAdminProfileStats();
        this._adminFilterUsers();
        ErrorHandler.showToast(`Usuario ${block ? 'bloqueado' : 'desbloqueado'}!`, 'success');
    },

    async _adminSendDM(userId, userName) {
        if (!this.currentUser) return;
        await this.openDMWith(userId, userName);
    },

    _adminEmailUser(email) {
        if (email) window.open(`mailto:${email}`, '_blank');
    },

    // ── PA: Events ──

    async _loadPAEvents() {
        const panel = document.getElementById('paEvents');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando eventos...</p>';

        const events = await Admin.loadEvents();

        panel.innerHTML = `
            <div class="pa-header-row">
                <span>${events.length} evento(s)</span>
                <button class="pa-action-btn pa-action-btn-sm" onclick="app._openEventForm(null)">+ Novo Evento</button>
            </div>
            <div class="pa-list" id="paEventsList">
                ${!events.length ? '<p class="empty-state">Nenhum evento. Crie o primeiro!</p>' : events.map(ev => {
                    const date = new Date(ev.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                    const typeLabels = { roda: 'Roda', workshop: 'Workshop', jornada: 'Jornada', live: 'Live' };
                    const isPast = new Date(ev.event_date) < new Date();
                    return `
                        <div class="pa-list-item ${isPast ? 'pa-list-item-past' : ''}">
                            <div class="pa-list-info">
                                <div class="pa-list-title">${Validation.sanitizeHTML(ev.title)}</div>
                                <div class="pa-list-meta">${typeLabels[ev.event_type] || ev.event_type} · ${date} · R$ ${ev.price || 0} · ${ev.current_spots || 0}/${ev.max_spots || 0} vagas</div>
                            </div>
                            <div class="pa-list-actions">
                                <button class="admin-edit-btn" onclick="app._viewEventAttendees('${ev.id}')">Inscritos</button>
                                <button class="admin-edit-btn" onclick="app._editEvent('${ev.id}')">Editar</button>
                                <button class="admin-delete-btn" onclick="app._deleteEvent('${ev.id}')">Excluir</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // ── PA: Groups ──

    async _loadPAGroups() {
        const panel = document.getElementById('paGroups');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando grupos...</p>';

        const groups = await Admin.loadGroups();
        const platformIcons = { whatsapp: '💬', telegram: '✈️', discord: '🎮', other: '🔗' };

        panel.innerHTML = `
            <div class="pa-header-row">
                <span>${groups.length} grupo(s)</span>
                <button class="pa-action-btn pa-action-btn-sm" onclick="app._openGroupForm(null)">+ Novo Grupo</button>
            </div>
            <div class="pa-list" id="paGroupsList">
                ${!groups.length ? '<p class="empty-state">Nenhum grupo. Crie o primeiro!</p>' : groups.map(g => `
                    <div class="pa-list-item">
                        <div class="pa-list-info">
                            <div class="pa-list-title">${g.emoji || '🌍'} ${Validation.sanitizeHTML(g.name)}</div>
                            <div class="pa-list-meta">${platformIcons[g.platform] || '🔗'} ${g.platform} · ${g.continent || 'Global'} · ${g.country_code || '-'}${g.invite_link ? ' · Link ativo' : ''}</div>
                        </div>
                        <div class="pa-list-actions">
                            <button class="admin-edit-btn" onclick="app._editGroup('${g.id}')">Editar</button>
                            <button class="admin-delete-btn" onclick="app._deleteGroup('${g.id}')">Excluir</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ── PA: Feed Moderation ──

    async _loadPAFeed() {
        const panel = document.getElementById('paFeed');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando posts...</p>';

        const posts = await Admin.loadAllPosts();

        panel.innerHTML = `
            <div class="pa-header-row">
                <span>${posts.length} post(s) recentes</span>
            </div>
            <div class="pa-list" id="paFeedList">
                ${!posts.length ? '<p class="empty-state">Nenhum post encontrado.</p>' : posts.map(p => {
                    const name = p.is_anonymous ? 'Anonimo' : (p.profiles?.name || 'Usuario');
                    const time = this._timeAgo(p.created_at);
                    const content = Validation.sanitizeHTML(p.content.substring(0, 120)) + (p.content.length > 120 ? '...' : '');
                    return `
                        <div class="pa-list-item">
                            <div class="pa-list-info">
                                <div class="pa-list-title">${Validation.sanitizeHTML(name)} <span class="pa-list-time">${time}</span></div>
                                <div class="pa-list-meta">${content}</div>
                            </div>
                            <div class="pa-list-actions">
                                <button class="admin-delete-btn" onclick="app._paDeletePost('${p.id}')">Excluir</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    async _paDeletePost(postId) {
        if (!confirm('Excluir este post e todas as suas respostas?')) return;
        const result = await Admin.deletePost(postId);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }
        ErrorHandler.showToast('Post excluido!', 'success');
        this._loadPAFeed();
    },

    // ── PA: Notifications ──

    _loadPANotifs() {
        const panel = document.getElementById('paNotifs');
        if (!panel) return;

        panel.innerHTML = `
            <h4 class="pa-section-title">Enviar Notificacao Broadcast</h4>
            <form id="paNotifForm" class="pa-form">
                <div class="form-group">
                    <label>Titulo</label>
                    <input type="text" class="form-input" id="paNotifTitle" placeholder="Titulo da notificacao" required>
                </div>
                <div class="form-group">
                    <label>Mensagem</label>
                    <textarea class="form-textarea" id="paNotifBody" rows="3" placeholder="Conteudo da notificacao..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Destinatarios</label>
                    <select class="form-select" id="paNotifTarget">
                        <option value="all">Todos os usuarios</option>
                        <option value="mentors">Apenas mentores</option>
                        <option value="users">Apenas usuarios comuns</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary btn-full" id="paNotifSubmitBtn">Enviar Notificacao</button>
            </form>
        `;

        document.getElementById('paNotifForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('paNotifTitle')?.value.trim();
            const body = document.getElementById('paNotifBody')?.value.trim();
            const target = document.getElementById('paNotifTarget')?.value;

            if (!title || !body) {
                ErrorHandler.showToast('Preencha titulo e mensagem', 'warning');
                return;
            }

            const btn = document.getElementById('paNotifSubmitBtn');
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            const result = await Admin.sendBroadcastNotification(title, body, target);
            btn.disabled = false;
            btn.textContent = 'Enviar Notificacao';

            if (result.error) {
                ErrorHandler.showToast(result.error, 'error');
                return;
            }

            ErrorHandler.showToast(`Notificacao enviada para ${result.count} usuario(s)!`, 'success');
            document.getElementById('paNotifForm').reset();
        });
    },

    // ── PA: Check-ins ──

    async _loadPACheckins() {
        const panel = document.getElementById('paCheckins');
        if (!panel) return;
        panel.innerHTML = '<p class="empty-state">Carregando check-ins...</p>';

        const checkins = await Admin.loadCheckinStats();

        if (!checkins.length) {
            panel.innerHTML = '<p class="empty-state">Nenhum check-in nos ultimos 7 dias.</p>';
            return;
        }

        const moodCounts = {};
        const moodLabels = {
            otimo: '😄 Otimo', bem: '🙂 Bem', neutro: '😐 Neutro',
            triste: '😢 Triste', ansioso: '😰 Ansioso',
        };

        checkins.forEach(c => {
            moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
        });

        const total = checkins.length;

        // Day-by-day breakdown
        const byDay = {};
        checkins.forEach(c => {
            const day = new Date(c.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            byDay[day] = (byDay[day] || 0) + 1;
        });

        panel.innerHTML = `
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">Ultimos 7 dias · ${total} check-ins</p>
            <div class="profile-admin-stats" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr))">
                ${Object.entries(moodCounts).map(([mood, count]) => `
                    <div class="admin-stat-card">
                        <div class="admin-stat-number">${count}</div>
                        <div class="admin-stat-label">${moodLabels[mood] || mood}</div>
                        <div class="admin-stat-pct">${Math.round(count / total * 100)}%</div>
                    </div>
                `).join('')}
            </div>
            <h4 class="pa-section-title" style="margin-top:var(--space-lg)">Por dia</h4>
            <div class="pa-day-chart">
                ${Object.entries(byDay).map(([day, count]) => {
                    const pct = Math.round(count / total * 100);
                    return `
                        <div class="pa-day-row">
                            <span class="pa-day-label">${day}</span>
                            <div class="pa-day-bar-wrap">
                                <div class="pa-day-bar" style="width:${pct}%"></div>
                            </div>
                            <span class="pa-day-count">${count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    async _saveProfile() {
        if (!this.currentUser) return;

        const val = (id) => document.getElementById(id)?.value?.trim() || '';
        const name = val('profileName');

        if (!name) {
            ErrorHandler.showToast('Nome é obrigatório', 'warning');
            return;
        }

        const interestEls = document.querySelectorAll('#profileInterestsTags .profile-interest-tag.selected');
        const interests = Array.from(interestEls).map(el => el.textContent);

        const birthYear = parseInt(val('profileBirthYear'), 10);

        const updates = {
            name,
            bio: val('profileBio'),
            birth_year: birthYear > 0 ? birthYear : null,
            city_origin: val('profileCityOrigin'),
            profession: val('profileProfession'),
            destination_country: val('profileDestCountry'),
            destination_city: val('profileDestCity'),
            planned_departure: val('profilePlannedDeparture'),
            exchange_objective: val('profileObjective'),
            exchange_goal: val('profileGoal'),
            exchange_duration: val('profileDuration'),
            exchange_status: val('profileExchangeStatus') || 'planejando',
            target_language: val('profileTargetLanguage'),
            language_level: val('profileLanguageLevel'),
            interests,
            looking_for: val('profileLookingFor'),
        };

        const completeness = Profile.getCompleteness({ ...this._userProfile, ...updates });
        if (completeness.percent === 100 && !this._userProfile?.profile_completed_at) {
            updates.profile_completed_at = new Date().toISOString();
        }

        const saveBtn = document.getElementById('profileSaveBtn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvando...'; }

        const result = await Profile.updateProfile(this.currentUser.id, updates);

        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar Perfil'; }

        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
        } else {
            this._userProfile = result.data;
            ErrorHandler.showToast('Perfil atualizado!', 'success');
            this._renderProfile();
        }
    },

    async _handleLogout() {
        await Auth.signOut();
        this._switchTab('tabJornadaContent');
        ErrorHandler.showToast('Até logo!', 'info');
    },

    _buildSelect(name, options, currentValue) {
        const opts = options.map(([val, label]) => {
            const sel = val === currentValue ? ' selected' : '';
            return `<option value="${Validation.sanitizeHTML(val)}"${sel}>${Validation.sanitizeHTML(label)}</option>`;
        }).join('');
        return `<select class="form-input" id="${name}">${opts}</select>`;
    },

    _toggleProfileSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.classList.toggle('collapsed');
    },

    async _handleAvatarUpload() {
        const input = document.getElementById('profileAvatarInput');
        if (!input?.files?.length || !this.currentUser) return;

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            ErrorHandler.showToast('Imagem muito grande (máx 5MB)', 'warning');
            return;
        }

        ErrorHandler.showToast('Enviando foto...', 'info');
        const result = await Profile.uploadAvatar(this.currentUser.id, file);

        if (result.error) {
            ErrorHandler.showToast('Erro ao enviar foto: ' + result.error, 'error');
        } else {
            this._userProfile = { ...this._userProfile, photo_url: result.url };
            const imgEl = document.getElementById('profileAvatarImg');
            if (imgEl) {
                if (imgEl.tagName === 'IMG') {
                    imgEl.src = result.url;
                } else {
                    imgEl.outerHTML = `<img class="profile-avatar-img" src="${result.url}" alt="Avatar" id="profileAvatarImg">`;
                }
            }
            ErrorHandler.showToast('Foto atualizada!', 'success');
        }
    },

    _toggleInterestTag(el) {
        el.classList.toggle('selected');
    },

    _buildCitySelect(country, currentCity) {
        const cities = COUNTRY_CITIES[country] || [];
        const options = [['', 'Selecione a cidade...'], ...cities.map(c => [c, c])];
        if (currentCity && !cities.includes(currentCity)) {
            options.push([currentCity, currentCity]);
        }
        return `<select class="form-input" id="profileDestCity" onchange="">${
            options.map(([val, label]) => {
                const sel = val === (currentCity || '') ? ' selected' : '';
                return `<option value="${Validation.sanitizeHTML(val)}"${sel}>${Validation.sanitizeHTML(label)}</option>`;
            }).join('')
        }</select>`;
    },

    _onCountryChange() {
        const country = document.getElementById('profileDestCountry')?.value || '';
        const cityContainer = document.getElementById('profileDestCity')?.parentElement;
        if (!cityContainer) return;
        const currentCity = document.getElementById('profileDestCity')?.value || '';
        const cities = COUNTRY_CITIES[country] || [];
        const options = [['', 'Selecione a cidade...'], ...cities.map(c => [c, c])];
        if (currentCity && !cities.includes(currentCity) && currentCity !== '') {
            options.push([currentCity, currentCity]);
        }
        const select = document.getElementById('profileDestCity');
        select.innerHTML = options.map(([val, label]) => {
            return `<option value="${Validation.sanitizeHTML(val)}">${Validation.sanitizeHTML(label)}</option>`;
        }).join('');
    },

    // ── Install Prompt ──

    _setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this._deferredInstallPrompt = e;
            this._showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            this._deferredInstallPrompt = null;
            this._hideInstallBanner();
            ErrorHandler.showToast('App instalado com sucesso!', 'success');
        });
    },

    _showInstallBanner() {
        // Don't show if already dismissed this session
        if (sessionStorage.getItem('ic_install_dismissed')) return;

        const banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-banner-content">
                <span class="install-banner-text">Instale o app para acesso rápido</span>
                <button class="install-banner-btn" id="installBtn">Instalar</button>
                <button class="install-banner-close" id="installDismiss" aria-label="Fechar">&times;</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('installBtn').addEventListener('click', () => {
            if (this._deferredInstallPrompt) {
                this._deferredInstallPrompt.prompt();
                this._deferredInstallPrompt.userChoice.then(() => {
                    this._deferredInstallPrompt = null;
                    this._hideInstallBanner();
                });
            }
        });

        document.getElementById('installDismiss').addEventListener('click', () => {
            this._hideInstallBanner();
            sessionStorage.setItem('ic_install_dismissed', '1');
        });

        // Auto-show with slide-in animation
        requestAnimationFrame(() => banner.classList.add('visible'));
    },

    _hideInstallBanner() {
        const banner = document.getElementById('installBanner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 300);
        }
    },

    // ── Journeys ──

    async _showJourneysView() {
        const section = document.getElementById('activeJourneySection');
        if (!section) return;

        section.style.display = '';
        section.innerHTML = `
            <h3 class="section-title">Jornadas</h3>
            <div id="journeysTabs" style="display:flex;gap:8px;margin-bottom:16px">
                <button class="admin-subtab active" data-jtab="available" onclick="app._loadJourneysTab('available', this)">Disponíveis</button>
                <button class="admin-subtab" data-jtab="mine" onclick="app._loadJourneysTab('mine', this)">Minhas Jornadas</button>
            </div>
            <div id="journeysList" class="journey-list"></div>
        `;

        this._loadJourneysTab('available');
        section.scrollIntoView({ behavior: 'smooth' });
    },

    async _loadJourneysTab(tab, clickedBtn) {
        if (clickedBtn) {
            document.querySelectorAll('#journeysTabs .admin-subtab').forEach(t => t.classList.remove('active'));
            clickedBtn.classList.add('active');
        }

        const list = document.getElementById('journeysList');
        if (!list) return;

        list.innerHTML = '<p class="empty-state">Carregando jornadas...</p>';

        let journeys;
        if (tab === 'mine') {
            const regs = await Journeys.loadMyJourneys(this.currentUser?.id);
            journeys = regs.map(r => r.events).filter(Boolean);
        } else {
            journeys = await Journeys.loadAvailable();
        }

        if (!journeys.length) {
            list.innerHTML = `<p class="empty-state">${tab === 'mine' ? 'Você ainda não está inscrito em nenhuma jornada.' : 'Nenhuma jornada disponível no momento.'}</p>`;
            return;
        }

        list.innerHTML = journeys.map(j => this._renderJourneyCard(j, tab === 'mine')).join('');
    },

    _renderJourneyCard(journey, isEnrolled) {
        const date = new Date(journey.event_date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const host = journey.profiles?.name || 'Profissional';
        const priceText = journey.price === 0 ? 'Gratuito' : `R$ ${journey.price}`;

        return `
            <div class="journey-card">
                <div class="journey-card-badge">🗺️ Jornada</div>
                <h4 class="journey-card-title">${Validation.sanitizeHTML(journey.title)}</h4>
                ${journey.description ? `<p class="journey-card-desc">${Validation.sanitizeHTML(journey.description.substring(0, 120))}${journey.description.length > 120 ? '...' : ''}</p>` : ''}
                <div class="journey-card-meta">
                    <span>Início: ${date}</span>
                    <span>${host}</span>
                </div>
                <div class="journey-card-footer">
                    <span class="event-card-price ${journey.price === 0 ? 'free' : ''}">${priceText}</span>
                    <span class="event-card-spots">${journey.current_spots || 0}/${journey.max_spots || '∞'} vagas</span>
                </div>
                ${isEnrolled
                    ? `<button class="event-card-btn" disabled style="opacity:0.6">Inscrito</button>`
                    : journey.payment_link
                        ? `<a href="${journey.payment_link}" target="_blank" rel="noopener" class="event-card-btn">Inscreva-se — ${priceText}</a>`
                        : `<button class="event-card-btn" onclick="app._registerForJourney('${journey.id}')">Inscreva-se</button>`
                }
            </div>
        `;
    },

    async _registerForJourney(eventId) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para se inscrever', 'info');
            return;
        }

        const result = await Journeys.registerForJourney(eventId, this.currentUser.id);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        ErrorHandler.showToast('Inscrição na jornada realizada!', 'success');
        this._loadJourneysTab('available');
    },

    // ── Diagnostic & Journey ──

    _diagState: { step: 0, heritage: [], contact: [], financial: {} },

    _setupDiagnostic() {
        document.getElementById('startDiagnosticBtn')?.addEventListener('click', () => this._openDiagnosticModal());
        document.getElementById('diagNextBtn')?.addEventListener('click', () => this._diagNext());
        document.getElementById('diagPrevBtn')?.addEventListener('click', () => this._diagPrev());
        document.getElementById('diagSkipBtn')?.addEventListener('click', () => this._diagSkip());
        document.getElementById('closeDiagnosticModal')?.addEventListener('click', () => {
            document.getElementById('diagnosticModal').style.display = 'none';
        });
        document.getElementById('closeDiagResultsModal')?.addEventListener('click', () => {
            document.getElementById('diagnosticResultsModal').style.display = 'none';
        });
        document.getElementById('diagResultsViewJourney')?.addEventListener('click', () => {
            document.getElementById('diagnosticResultsModal').style.display = 'none';
            this._loadJourneyStatus();
            this._switchTab('tabJornadaContent');
            setTimeout(() => {
                document.getElementById('journeyProgressSection')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        });
    },

    async _loadJourneyStatus() {
        if (!this.currentUser) return;

        const ctaSection = document.getElementById('diagnosticCTASection');
        const timelineSection = document.getElementById('journeyProgressSection');
        const prepSection = document.getElementById('preparationSection');
        if (!ctaSection || !timelineSection) return;

        const progress = await Diagnostic.loadJourneyProgress(this.currentUser.id);

        if (progress) {
            ctaSection.style.display = 'none';
            timelineSection.style.display = '';
            this._renderJourneyProgress(progress);

            // Show preparation dashboard when phase 2 is in_progress
            if (prepSection && progress.phase_2_status === 'in_progress') {
                prepSection.style.display = '';
                this._loadPreparationDashboard(progress);
            } else if (prepSection) {
                prepSection.style.display = 'none';
            }
        } else {
            ctaSection.style.display = '';
            timelineSection.style.display = 'none';
            if (prepSection) prepSection.style.display = 'none';
        }
    },

    _renderJourneyProgress(progress) {
        const container = document.getElementById('journeyTimeline');
        if (!container) return;

        container.innerHTML = Diagnostic.phases.map(phase => {
            const statusKey = `phase_${phase.num}_status`;
            const status = progress[statusKey] || 'locked';
            const isCurrent = progress.current_phase === phase.num && status !== 'completed';
            const stateClass = status === 'completed' ? 'completed' : isCurrent ? 'current' : 'locked';

            let badgeHtml = '';
            if (status === 'completed') {
                badgeHtml = '<span class="journey-phase-badge badge-completed">Completa</span>';
            } else if (isCurrent || status === 'not_started') {
                badgeHtml = status === 'in_progress'
                    ? '<span class="journey-phase-badge badge-current">Em andamento</span>'
                    : '<span class="journey-phase-badge badge-current">Disponível</span>';
            } else {
                badgeHtml = '<span class="journey-phase-badge badge-locked">Bloqueada</span>';
            }

            const indicatorContent = status === 'completed' ? '\u2713' : (isCurrent || status === 'not_started') ? phase.num : '\uD83D\uDD12';

            // Action buttons per phase status
            let actionHtml = '';
            if (phase.num === 1 && status === 'completed') {
                actionHtml = '<button class="journey-phase-action btn-ghost" onclick="app._openDiagnosticModal()">Refazer Diagnóstico</button>';
            } else if (status === 'not_started') {
                actionHtml = `<button class="journey-phase-action btn-primary-sm" onclick="app._advancePhase(${phase.num}, 'in_progress')">Iniciar Fase</button>`;
            } else if (status === 'in_progress') {
                actionHtml = `<button class="journey-phase-action btn-primary-sm" onclick="app._advancePhase(${phase.num}, 'completed')">Concluir Fase</button>`;
            }

            return `
                <div class="journey-phase-item ${stateClass}">
                    <div class="journey-phase-indicator">${indicatorContent}</div>
                    <div class="journey-phase-info">
                        <div class="journey-phase-name">
                            <span>${phase.emoji} ${Validation.sanitizeHTML(phase.name)}</span>
                            ${badgeHtml}
                        </div>
                        <div class="journey-phase-duration">${Validation.sanitizeHTML(phase.duration)}</div>
                        <div class="journey-phase-desc">${Validation.sanitizeHTML(phase.desc)}</div>
                        ${actionHtml}
                    </div>
                </div>
            `;
        }).join('');
    },

    async _advancePhase(phaseNum, newStatus) {
        if (!this.currentUser) return;
        try {
            await Diagnostic.updatePhaseStatus(this.currentUser.id, phaseNum, newStatus);

            // Initialize preparation tasks when starting phase 2
            if (phaseNum === 2 && newStatus === 'in_progress') {
                const diag = await Diagnostic.loadLatest(this.currentUser.id);
                await Preparation.initializeTasks(this.currentUser.id, diag);
            }

            const label = newStatus === 'completed' ? 'Fase concluída!' : 'Fase iniciada!';
            ErrorHandler.showToast(label, 'success');
            this._loadJourneyStatus();
        } catch (err) {
            console.error('Error updating phase:', err);
            ErrorHandler.showToast('Erro ao atualizar fase. Tente novamente.', 'error');
        }
    },

    _openDiagnosticModal() {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para iniciar o diagnóstico', 'info');
            return;
        }
        this._diagState = { step: 0, heritage: [], contact: [], financial: {} };
        document.getElementById('diagnosticModal').style.display = 'flex';
        this._renderDiagStep();
    },

    _renderDiagStep() {
        const body = document.getElementById('diagnosticModalBody');
        const prevBtn = document.getElementById('diagPrevBtn');
        const nextBtn = document.getElementById('diagNextBtn');
        const skipBtn = document.getElementById('diagSkipBtn');
        const indicator = document.getElementById('diagStepIndicator');
        const step = this._diagState.step;
        const totalSteps = 5;

        // Step indicator dots
        indicator.innerHTML = Array.from({ length: totalSteps }, (_, i) => {
            let cls = 'diag-step-dot';
            if (i === step) cls += ' active';
            else if (i < step) cls += ' done';
            return `<div class="${cls}"></div>`;
        }).join('');

        // Prev/Next/Skip visibility
        prevBtn.style.display = step === 0 ? 'none' : '';
        skipBtn.style.display = (step >= 1 && step <= 3) ? '' : 'none';
        nextBtn.textContent = step === totalSteps - 1 ? 'Confirmar' : 'Próximo';

        if (step === 0) {
            body.innerHTML = `
                <div class="diag-intro">
                    <h4>Diagnóstico de Prontidão para Intercâmbio</h4>
                    <p>Este diagnóstico avalia duas dimensões essenciais:</p>
                    <p><strong>Cultural</strong> — Baseado no Modelo de Aculturação de Berry, medimos sua relação com sua cultura de origem e abertura à cultura anfitriã.</p>
                    <p><strong>Financeira</strong> — Baseado no método DSOP, avaliamos sua viabilidade financeira para o intercâmbio.</p>
                    <p>Leva cerca de <strong>5 minutos</strong>. Suas respostas são confidenciais.</p>
                </div>
            `;
        } else if (step === 1) {
            body.innerHTML = `
                <h4 style="margin-bottom:var(--space-md);color:var(--text-primary)">Herança Cultural</h4>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-md)">Indique o quanto você concorda com cada afirmação (1 = Discordo totalmente, 5 = Concordo totalmente)</p>
                ${this._renderLikertQuestions(Diagnostic.culturalHeritage, 'heritage')}
            `;
            this._bindLikertEvents('heritage');
        } else if (step === 2) {
            body.innerHTML = `
                <h4 style="margin-bottom:var(--space-md);color:var(--text-primary)">Contato com Cultura Anfitriã</h4>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-md)">Indique o quanto você concorda com cada afirmação</p>
                ${this._renderLikertQuestions(Diagnostic.culturalContact, 'contact')}
            `;
            this._bindLikertEvents('contact');
        } else if (step === 3) {
            body.innerHTML = `
                <h4 style="margin-bottom:var(--space-md);color:var(--text-primary)">Diagnóstico Financeiro (DSOP)</h4>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-md)">Preencha os campos abaixo para avaliarmos sua viabilidade financeira</p>
                <div class="diag-financial-grid">
                    ${Diagnostic.financialFields.map(f => {
                        const val = this._diagState.financial[f.id] || '';
                        const req = f.required ? ' <span class="required-mark">*</span>' : '';
                        if (f.type === 'select') {
                            return `
                                <div class="diag-field-group">
                                    <label for="diag_${f.id}">${f.label}${req}</label>
                                    <select id="diag_${f.id}">
                                        ${f.options.map((o, i) => `<option value="${i}" ${val == i ? 'selected' : ''}>${Validation.sanitizeHTML(o)}</option>`).join('')}
                                    </select>
                                </div>
                            `;
                        }
                        return `
                            <div class="diag-field-group">
                                <label for="diag_${f.id}">${f.label}${req}</label>
                                <input type="number" id="diag_${f.id}" placeholder="${f.placeholder}" value="${val}" min="0" step="0.01" inputmode="decimal">
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else if (step === 4) {
            // Review
            const h = this._diagState.heritage;
            const c = this._diagState.contact;
            const fin = this._diagState.financial;
            const hScore = h.reduce((a, b) => a + b, 0);
            const cScore = c.reduce((a, b) => a + b, 0);
            const strategy = Diagnostic.calcAcculturationStrategy(hScore, cScore);
            const fResult = Diagnostic.calcFinancialViability(fin);
            const culturalReadiness = Math.min(100, Math.round(((hScore + cScore) / 50) * 100));
            const overall = Diagnostic.calcOverallReadiness(culturalReadiness, fResult.readiness);
            const classification = Diagnostic.getClassification(overall);

            body.innerHTML = `
                <div class="diag-review-section">
                    <h4>Cultural</h4>
                    <div class="diag-review-item"><span>Herança Cultural</span><span>${hScore}/25</span></div>
                    <div class="diag-review-item"><span>Contato c/ Cultura Anfitriã</span><span>${cScore}/25</span></div>
                    <div class="diag-review-item"><span>Estratégia</span><span>${Diagnostic.getStrategyLabel(strategy)}</span></div>
                    <div class="diag-review-item"><span>Prontidão Cultural</span><span>${culturalReadiness}%</span></div>
                </div>
                <div class="diag-review-section">
                    <h4>Financeiro</h4>
                    <div class="diag-review-item"><span>Viabilidade</span><span>${Diagnostic.getViabilityLabel(fResult.viability)}</span></div>
                    <div class="diag-review-item"><span>Prontidão Financeira</span><span>${fResult.readiness}%</span></div>
                    ${fResult.gap > 0 ? `<div class="diag-review-item"><span>Gap Financeiro</span><span>R$ ${fResult.gap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
                    ${fResult.mesesNecessarios > 0 ? `<div class="diag-review-item"><span>Meses extras necessários</span><span>${fResult.mesesNecessarios}</span></div>` : ''}
                </div>
                <div class="diag-review-section">
                    <h4>Resultado Estimado</h4>
                    <div class="diag-review-item"><span>Prontidão Geral</span><span style="font-size:1.1rem;color:var(--primary)">${overall}%</span></div>
                    <div class="diag-review-item"><span>Classificação</span><span>${Diagnostic.getClassificationLabel(classification)}</span></div>
                </div>
                <p style="font-size:0.82rem;color:var(--text-muted);text-align:center;margin-top:var(--space-md)">Clique em "Confirmar" para salvar seu diagnóstico.</p>
            `;
        }
    },

    _renderLikertQuestions(questions, dimension) {
        const answers = this._diagState[dimension];
        return questions.map((q, idx) => {
            return `
                <div class="likert-group" data-dimension="${dimension}" data-index="${idx}">
                    <div class="likert-question">${idx + 1}. ${Validation.sanitizeHTML(q.text)} <span class="required-mark">*</span></div>
                    <div class="likert-options">
                        ${Diagnostic.likertLabels.map((label, val) => {
                            const selected = answers[idx] === (val + 1) ? 'selected' : '';
                            return `<div class="likert-option ${selected}" data-value="${val + 1}" title="${label}">${val + 1}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    _bindLikertEvents(dimension) {
        document.querySelectorAll(`.likert-group[data-dimension="${dimension}"] .likert-option`).forEach(opt => {
            opt.addEventListener('click', () => {
                const group = opt.closest('.likert-group');
                const idx = parseInt(group.dataset.index);
                const val = parseInt(opt.dataset.value);

                group.querySelectorAll('.likert-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this._diagState[dimension][idx] = val;
            });
        });
    },

    _diagNext() {
        const step = this._diagState.step;

        // Validate current step
        if (step === 1) {
            if (this._diagState.heritage.length < 5 || this._diagState.heritage.some(v => !v)) {
                ErrorHandler.showToast('Responda todas as 5 perguntas antes de continuar', 'warning');
                return;
            }
        } else if (step === 2) {
            if (this._diagState.contact.length < 5 || this._diagState.contact.some(v => !v)) {
                ErrorHandler.showToast('Responda todas as 5 perguntas antes de continuar', 'warning');
                return;
            }
        } else if (step === 3) {
            // Save financial fields
            Diagnostic.financialFields.forEach(f => {
                const el = document.getElementById(`diag_${f.id}`);
                if (el) this._diagState.financial[f.id] = el.value;
            });

            const fin = this._diagState.financial;
            if (!fin.custoTotal || parseFloat(fin.custoTotal) <= 0) {
                ErrorHandler.showToast('Informe o custo total estimado do intercâmbio', 'warning');
                return;
            }
        } else if (step === 4) {
            // Submit
            this._submitDiagnostic();
            return;
        }

        this._diagState.step = Math.min(4, step + 1);
        this._renderDiagStep();
    },

    _diagPrev() {
        // Save financial fields before going back if on step 3
        if (this._diagState.step === 3) {
            Diagnostic.financialFields.forEach(f => {
                const el = document.getElementById(`diag_${f.id}`);
                if (el) this._diagState.financial[f.id] = el.value;
            });
        }
        this._diagState.step = Math.max(0, this._diagState.step - 1);
        this._renderDiagStep();
    },

    _diagSkip() {
        const step = this._diagState.step;
        // Fill defaults for skipped step
        if (step === 1) {
            this._diagState.heritage = [3, 3, 3, 3, 3];
        } else if (step === 2) {
            this._diagState.contact = [3, 3, 3, 3, 3];
        } else if (step === 3) {
            // Keep whatever was filled, zeros for the rest
            Diagnostic.financialFields.forEach(f => {
                if (!this._diagState.financial[f.id]) {
                    this._diagState.financial[f.id] = f.type === 'select' ? '0' : '0';
                }
            });
        }
        this._diagState.step = Math.min(4, step + 1);
        this._renderDiagStep();
        ErrorHandler.showToast('Etapa pulada — você pode refazer o diagnóstico depois', 'info');
    },

    async _submitDiagnostic() {
        const nextBtn = document.getElementById('diagNextBtn');
        nextBtn.disabled = true;
        nextBtn.textContent = 'Salvando...';

        try {
            const result = await Diagnostic.submitDiagnostic(
                this._diagState.heritage,
                this._diagState.contact,
                this._diagState.financial,
            );

            document.getElementById('diagnosticModal').style.display = 'none';
            this._showDiagnosticResults(result);
        } catch (err) {
            console.error('Error submitting diagnostic:', err);
            ErrorHandler.showToast('Erro ao salvar diagnóstico. Tente novamente.', 'error');
            nextBtn.disabled = false;
            nextBtn.textContent = 'Confirmar';
        }
    },

    _showDiagnosticResults(result) {
        const body = document.getElementById('diagResultsBody');
        if (!body) return;

        const overall = result.overall_readiness;
        const classification = result.classification;
        const strategy = result.acculturation_strategy;

        body.innerHTML = `
            <div class="diag-result-overall">
                <div class="diag-result-overall-score">${overall}%</div>
                <div class="diag-result-overall-label">Prontidão Geral</div>
                <div class="diag-result-classification">${Diagnostic.getClassificationLabel(classification)}</div>
            </div>

            <div class="diag-result-scores">
                <div class="diag-score-card">
                    <div class="diag-score-card-title">Cultural</div>
                    <div class="diag-score-card-value">${result.cultural_readiness}%</div>
                    <div class="diag-score-card-sub">${result.heritage_score + result.contact_score}/50 pontos</div>
                </div>
                <div class="diag-score-card">
                    <div class="diag-score-card-title">Financeiro</div>
                    <div class="diag-score-card-value">${result.financial_readiness}%</div>
                    <div class="diag-score-card-sub">${Diagnostic.getViabilityLabel(result.financial_viability)}</div>
                </div>
            </div>

            <div style="text-align:center;margin-top:var(--space-lg)">
                <div class="diag-strategy-badge ${strategy}">${Diagnostic.getStrategyLabel(strategy)}</div>
                <div class="diag-strategy-desc">${Diagnostic.getStrategyDescription(strategy)}</div>
            </div>

            ${result.gap_financeiro > 0 ? `
                <div class="diag-financial-detail">
                    Gap financeiro: <strong>R$ ${parseFloat(result.gap_financeiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    ${result.meses_necessarios > 0 ? ` · ${result.meses_necessarios} meses extras necessários` : ''}
                </div>
            ` : ''}
        `;

        document.getElementById('diagnosticResultsModal').style.display = 'flex';
    },

    // ── Preparation (Phase 2) ──

    _setupPreparation() {
        document.getElementById('closePrepDimModal')?.addEventListener('click', () => {
            document.getElementById('prepDimensionModal').style.display = 'none';
        });
        // Close modal on backdrop click
        document.getElementById('prepDimensionModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'prepDimensionModal') {
                e.target.style.display = 'none';
            }
        });
    },

    async _loadPreparationDashboard(progress) {
        if (!this.currentUser) return;

        const tasks = await Preparation.loadTasks(this.currentUser.id);
        if (!tasks.length) return;

        // Cache tasks for modal use
        this._prepTasks = tasks;
        this._prepProgress = progress;

        // Overall progress
        const overall = Preparation.calcOverallProgress(tasks);
        const percentEl = document.getElementById('prepProgressPercent');
        const barEl = document.getElementById('prepProgressBar');
        if (percentEl) percentEl.textContent = overall + '%';
        if (barEl) barEl.style.width = overall + '%';

        // Render dimension cards
        this._renderPrepDimensions(tasks);

        // Weekly exercises
        const startDate = progress.phase_2_completed_at ? null : (progress.updated_at || progress.created_at);
        const weekNum = Preparation.getCurrentWeek(startDate);
        this._renderPrepWeekly(weekNum);

        // Check 100% completion
        if (overall === 100) {
            ErrorHandler.showToast('Preparação completa! Parabéns!', 'success');
        }
    },

    _renderPrepDimensions(tasks) {
        const grid = document.getElementById('prepDimensionsGrid');
        if (!grid) return;

        const dims = Preparation.dimensions;
        grid.innerHTML = Object.entries(dims).map(([key, dim]) => {
            const prog = Preparation.calcDimensionProgress(tasks, key);
            return `
                <div class="prep-dimension-card" onclick="app._openPrepDimension('${key}')">
                    <div class="prep-dim-header">
                        <span class="prep-dim-emoji">${dim.emoji}</span>
                        <span class="prep-dim-label">${Validation.sanitizeHTML(dim.label)}</span>
                    </div>
                    <div class="prep-dim-counter">${prog.completed}/${prog.total}</div>
                    <div class="prep-dim-progress-track">
                        <div class="prep-dim-progress-fill" style="width:${prog.percent}%;background:${dim.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    _openPrepDimension(dimensionKey) {
        const tasks = (this._prepTasks || []).filter(t => t.dimension === dimensionKey);
        const dim = Preparation.dimensions[dimensionKey];
        if (!dim) return;

        const titleEl = document.getElementById('prepDimTitle');
        const bodyEl = document.getElementById('prepDimBody');
        if (titleEl) titleEl.textContent = dim.emoji + ' ' + dim.label;

        if (bodyEl) {
            // Sort: incomplete first, then by priority rank desc, then sort_order
            const sorted = [...tasks].sort((a, b) => {
                if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
                const pa = Preparation._priorityRank(a.priority);
                const pb = Preparation._priorityRank(b.priority);
                if (pa !== pb) return pb - pa;
                return a.sort_order - b.sort_order;
            });

            bodyEl.innerHTML = `<div class="prep-task-list">` + sorted.map(t => `
                <div class="prep-task-item ${t.is_completed ? 'completed' : ''}" onclick="app._togglePrepTask('${t.id}', ${!t.is_completed})">
                    <div class="prep-task-check">${t.is_completed ? '\u2713' : ''}</div>
                    <div class="prep-task-content">
                        <div class="prep-task-title-row">
                            <span class="prep-task-title">${Validation.sanitizeHTML(t.title)}</span>
                            <span class="prep-task-priority ${t.priority}">${Preparation.getPriorityLabel(t.priority)}</span>
                        </div>
                        ${t.description ? `<div class="prep-task-desc">${Validation.sanitizeHTML(t.description)}</div>` : ''}
                    </div>
                </div>
            `).join('') + `</div>`;
        }

        document.getElementById('prepDimensionModal').style.display = 'flex';
    },

    async _togglePrepTask(taskId, newState) {
        try {
            await Preparation.toggleTask(taskId, newState);

            // Update local cache
            const task = (this._prepTasks || []).find(t => t.id === taskId);
            if (task) {
                task.is_completed = newState;
                task.completed_at = newState ? new Date().toISOString() : null;
            }

            // Re-render dimension modal
            if (task) this._openPrepDimension(task.dimension);

            // Re-render dashboard
            const tasks = this._prepTasks || [];
            const overall = Preparation.calcOverallProgress(tasks);
            const percentEl = document.getElementById('prepProgressPercent');
            const barEl = document.getElementById('prepProgressBar');
            if (percentEl) percentEl.textContent = overall + '%';
            if (barEl) barEl.style.width = overall + '%';
            this._renderPrepDimensions(tasks);

            if (overall === 100) {
                ErrorHandler.showToast('Preparação completa! Parabéns!', 'success');
            }
        } catch (err) {
            console.error('Error toggling preparation task:', err);
            ErrorHandler.showToast('Erro ao atualizar tarefa.', 'error');
        }
    },

    async _renderPrepWeekly(weekNum) {
        const label = document.getElementById('prepWeekLabel');
        const list = document.getElementById('prepWeeklyList');
        if (!list) return;
        if (label) label.textContent = `Exercícios da Semana ${weekNum}`;

        const diag = await Diagnostic.loadLatest(this.currentUser?.id);
        const exercises = await Preparation.ensureWeeklyExercises(this.currentUser.id, weekNum, diag);

        const dims = Preparation.dimensions;
        list.innerHTML = exercises.map(ex => {
            const dim = dims[ex.dimension] || {};
            return `
                <div class="prep-exercise-card ${ex.is_completed ? 'completed' : ''}" onclick="app._completePrepExercise('${ex.id}', this)">
                    <span class="prep-exercise-emoji">${dim.emoji || ''}</span>
                    <span class="prep-exercise-title">${Validation.sanitizeHTML(ex.title)}</span>
                    <div class="prep-exercise-check">${ex.is_completed ? '\u2713' : ''}</div>
                </div>
            `;
        }).join('');
    },

    async _completePrepExercise(exerciseId, el) {
        if (!exerciseId || el?.classList.contains('completed')) return;
        try {
            await Preparation.completeExercise(exerciseId);
            if (el) {
                el.classList.add('completed');
                const check = el.querySelector('.prep-exercise-check');
                if (check) check.textContent = '\u2713';
                const title = el.querySelector('.prep-exercise-title');
                if (title) title.style.textDecoration = 'line-through';
            }
            ErrorHandler.showToast('Exercício concluído!', 'success');
        } catch (err) {
            console.error('Error completing exercise:', err);
            ErrorHandler.showToast('Erro ao salvar exercício.', 'error');
        }
    },

    // ── Search ──

    _setupSearch() {
        const input = document.getElementById('globalSearchInput');
        const results = document.getElementById('globalSearchResults');
        if (!input || !results) return;

        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = input.value.trim();
            if (query.length < 2) {
                results.style.display = 'none';
                return;
            }
            debounceTimer = setTimeout(() => this._performSearch(query), 300);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                results.style.display = 'none';
            }
        });

        // Close on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                results.style.display = 'none';
                input.blur();
            }
        });
    },

    async _performSearch(query) {
        const results = document.getElementById('globalSearchResults');
        if (!results) return;

        results.innerHTML = '<div class="search-loading">Buscando...</div>';
        results.style.display = '';

        const [mentors, posts, events] = await Promise.all([
            Search.searchMentors(query),
            Search.searchPosts(query),
            Search.searchEvents(query),
        ]);

        if (!mentors.length && !posts.length && !events.length) {
            results.innerHTML = '<div class="search-empty">Nenhum resultado encontrado</div>';
            return;
        }

        let html = '';

        if (mentors.length) {
            html += '<div class="search-section-title">Mentores</div>';
            html += mentors.slice(0, 3).map(m => `
                <div class="search-result-item" onclick="app._viewMentorProfile('${m.id}'); document.getElementById('globalSearchResults').style.display='none';">
                    <span class="search-result-icon">👤</span>
                    <div>
                        <div class="search-result-name">${Validation.sanitizeHTML(m.name)}</div>
                        <div class="search-result-meta">${m.specialty || 'Profissional'}</div>
                    </div>
                </div>
            `).join('');
        }

        if (posts.length) {
            html += '<div class="search-section-title">Posts</div>';
            html += posts.slice(0, 3).map(p => `
                <div class="search-result-item" onclick="app._switchTab('tabComunidadeContent'); document.getElementById('globalSearchResults').style.display='none';">
                    <span class="search-result-icon">💬</span>
                    <div>
                        <div class="search-result-name">${Validation.sanitizeHTML(p.content.substring(0, 60))}...</div>
                        <div class="search-result-meta">${p.profiles?.name || 'Anônimo'}</div>
                    </div>
                </div>
            `).join('');
        }

        if (events.length) {
            html += '<div class="search-section-title">Eventos</div>';
            html += events.slice(0, 3).map(ev => `
                <div class="search-result-item" onclick="app._switchTab('tabEncontrosContent'); document.getElementById('globalSearchResults').style.display='none';">
                    <span class="search-result-icon">📅</span>
                    <div>
                        <div class="search-result-name">${Validation.sanitizeHTML(ev.title)}</div>
                        <div class="search-result-meta">${new Date(ev.event_date).toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>
            `).join('');
        }

        results.innerHTML = html;
    },

    // ── Mentor Profile Modal ──

    _setupMentorProfileModal() {
        document.getElementById('closeMentorProfileModal')?.addEventListener('click', () => {
            document.getElementById('mentorProfileModal').style.display = 'none';
        });
    },

    // ── Admin Panel ──

    _setupAdminPanel() {
        // Sub-tabs
        this._setupAdminSubtabs();

        // Event modal
        document.getElementById('adminNewEventBtn')?.addEventListener('click', () => this._openEventForm());
        document.getElementById('closeAdminEventModal')?.addEventListener('click', () => this._closeAdminEventModal());
        document.getElementById('adminEventCancelBtn')?.addEventListener('click', () => this._closeAdminEventModal());
        document.getElementById('adminEventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitEventForm();
        });

        // Group modal
        document.getElementById('adminNewGroupBtn')?.addEventListener('click', () => this._openGroupForm());
        document.getElementById('closeAdminGroupModal')?.addEventListener('click', () => this._closeAdminGroupModal());
        document.getElementById('adminGroupCancelBtn')?.addEventListener('click', () => this._closeAdminGroupModal());
        document.getElementById('adminGroupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitGroupForm();
        });

        // Escape to close admin modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const eventModal = document.getElementById('adminEventModal');
                if (eventModal && eventModal.style.display !== 'none') this._closeAdminEventModal();
                const groupModal = document.getElementById('adminGroupModal');
                if (groupModal && groupModal.style.display !== 'none') this._closeAdminGroupModal();
            }
        });
    },

    _adminPanels: ['adminDashboard', 'adminEvents', 'adminGroups', 'adminUsers', 'adminFeed', 'adminNotifications', 'adminCheckins', 'adminMetrics'],

    _setupAdminSubtabs() {
        document.querySelectorAll('#adminSubtabs .admin-subtab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#adminSubtabs .admin-subtab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const panel = tab.dataset.panel;
                this._adminPanels.forEach(p => {
                    const el = document.getElementById(p);
                    if (el) el.style.display = p === panel ? '' : 'none';
                });
                // Load content for the selected panel
                if (panel === 'adminDashboard') this._loadAdminDashboard();
                if (panel === 'adminEvents') this._loadAdminEvents();
                if (panel === 'adminGroups') this._loadAdminGroups();
                if (panel === 'adminUsers') this._loadAdminUsers();
                if (panel === 'adminFeed') this._loadAdminFeed();
                if (panel === 'adminCheckins') this._loadAdminCheckins();
                if (panel === 'adminMetrics') this._loadAdminMetrics();
            });
        });
    },

    async _loadAdminPanel() {
        if (!this._isAdmin()) return;
        this._loadAdminDashboard();
        this._loadAdminEvents();
        this._loadAdminGroups();
        this._setupAdminNotifications();
    },

    // ── Admin Events ──

    async _loadAdminEvents() {
        const list = document.getElementById('adminEventsList');
        if (!list) return;

        list.innerHTML = '<p class="empty-state">Carregando eventos...</p>';
        const events = await Admin.loadEvents();

        if (!events.length) {
            list.innerHTML = '<p class="empty-state">Nenhum evento ainda. Crie o primeiro!</p>';
            return;
        }

        list.innerHTML = events.map(ev => {
            const date = new Date(ev.event_date).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
            });
            const typeLabels = { roda: 'Roda', workshop: 'Workshop', jornada: 'Jornada', live: 'Live' };
            return `
                <div class="admin-list-item" data-event-id="${ev.id}">
                    <div class="admin-item-info">
                        <div class="admin-item-title">${Validation.sanitizeHTML(ev.title)}</div>
                        <div class="admin-item-meta">${typeLabels[ev.event_type] || ev.event_type} · ${date} · R$ ${ev.price || 0} · ${ev.max_spots || 0} vagas</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="admin-edit-btn" onclick="app._viewEventAttendees('${ev.id}')">Inscritos</button>
                        <button class="admin-edit-btn" onclick="app._editEvent('${ev.id}')">Editar</button>
                        <button class="admin-delete-btn" onclick="app._deleteEvent('${ev.id}')">Excluir</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    _openEventForm(event) {
        const modal = document.getElementById('adminEventModal');
        const title = document.getElementById('adminEventModalTitle');
        const submitBtn = document.getElementById('adminEventSubmitBtn');

        if (event) {
            title.textContent = 'Editar Evento';
            submitBtn.textContent = 'Salvar Alterações';
            document.getElementById('adminEventId').value = event.id;
            document.getElementById('adminEventTitle').value = event.title || '';
            document.getElementById('adminEventDesc').value = event.description || '';
            document.getElementById('adminEventType').value = event.event_type || 'roda';
            document.getElementById('adminEventDate').value = event.event_date ? event.event_date.slice(0, 16) : '';
            document.getElementById('adminEventDuration').value = event.duration_minutes || 60;
            document.getElementById('adminEventPrice').value = event.price || 0;
            document.getElementById('adminEventSpots').value = event.max_spots || 30;
            document.getElementById('adminEventPayLink').value = event.payment_link || '';
            document.getElementById('adminEventMeetLink').value = event.meeting_link || '';
        } else {
            title.textContent = 'Novo Evento';
            submitBtn.textContent = 'Criar Evento';
            document.getElementById('adminEventForm').reset();
            document.getElementById('adminEventId').value = '';
        }

        modal.style.display = 'flex';
    },

    _closeAdminEventModal() {
        document.getElementById('adminEventModal').style.display = 'none';
    },

    async _submitEventForm() {
        const id = document.getElementById('adminEventId').value;
        const data = {
            title: document.getElementById('adminEventTitle').value.trim(),
            description: document.getElementById('adminEventDesc').value.trim(),
            event_type: document.getElementById('adminEventType').value,
            event_date: document.getElementById('adminEventDate').value,
            duration_minutes: parseInt(document.getElementById('adminEventDuration').value) || 60,
            price: parseFloat(document.getElementById('adminEventPrice').value) || 0,
            max_spots: parseInt(document.getElementById('adminEventSpots').value) || 30,
            payment_link: document.getElementById('adminEventPayLink').value.trim() || null,
            meeting_link: document.getElementById('adminEventMeetLink').value.trim() || null,
        };

        if (!data.title) {
            ErrorHandler.showToast('Título é obrigatório', 'warning');
            return;
        }
        if (!data.event_date) {
            ErrorHandler.showToast('Data é obrigatória', 'warning');
            return;
        }
        if (data.payment_link && !this._isValidURL(data.payment_link)) {
            ErrorHandler.showToast('Link de pagamento inválido', 'warning');
            return;
        }
        if (data.meeting_link && !this._isValidURL(data.meeting_link)) {
            ErrorHandler.showToast('Link da reunião inválido', 'warning');
            return;
        }

        let result;
        if (id) {
            result = await Admin.updateEvent(id, data);
        } else {
            result = await Admin.createEvent(data);
        }

        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        this._closeAdminEventModal();
        ErrorHandler.showToast(id ? 'Evento atualizado!' : 'Evento criado!', 'success');
        this._loadAdminEvents();
        if (document.getElementById('paEvents')) this._loadPAEvents();
    },

    async _editEvent(eventId) {
        const events = await Admin.loadEvents();
        const ev = events.find(e => e.id === eventId);
        if (ev) this._openEventForm(ev);
    },

    async _viewEventAttendees(eventId) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { data: regs, error } = await sb
            .from('event_registrations')
            .select('created_at, profiles(name, email)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (error) {
            ErrorHandler.showToast('Erro ao carregar inscritos', 'error');
            return;
        }

        const { data: ev } = await sb.from('events').select('title, current_spots, max_spots').eq('id', eventId).single();
        const title = ev ? Validation.sanitizeHTML(ev.title) : 'Evento';
        const count = regs ? regs.length : 0;

        let content;
        if (!count) {
            content = '<p class="empty-state">Nenhum inscrito ainda.</p>';
        } else {
            content = `<table class="admin-users-table" style="width:100%">
                <thead><tr><th>#</th><th>Nome</th><th>Email</th><th>Data Inscrição</th></tr></thead>
                <tbody>${regs.map((r, i) => {
                    const name = Validation.sanitizeHTML(r.profiles?.name || '—');
                    const email = Validation.sanitizeHTML(r.profiles?.email || '—');
                    const date = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                    return `<tr><td>${i + 1}</td><td>${name}</td><td>${email}</td><td>${date}</td></tr>`;
                }).join('')}</tbody>
            </table>`;
        }

        // Show in a simple modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:600px;max-height:80vh;overflow-y:auto">
                <h3>${title} — Inscritos (${count}/${ev?.max_spots || '∞'})</h3>
                ${content}
                <button class="form-btn" style="margin-top:var(--space-md)" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async _deleteEvent(eventId) {
        if (!confirm('Tem certeza que deseja excluir este evento?')) return;

        const result = await Admin.deleteEvent(eventId);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }
        ErrorHandler.showToast('Evento excluído!', 'success');
        this._loadAdminEvents();
        if (document.getElementById('paEvents')) this._loadPAEvents();
    },

    // ── Admin Groups ──

    async _loadAdminGroups() {
        const list = document.getElementById('adminGroupsList');
        if (!list) return;

        list.innerHTML = '<p class="empty-state">Carregando grupos...</p>';
        const groups = await Admin.loadGroups();

        if (!groups.length) {
            list.innerHTML = '<p class="empty-state">Nenhum grupo ainda. Crie o primeiro!</p>';
            return;
        }

        const platformIcons = { whatsapp: '💬', telegram: '✈️', discord: '🎮', other: '🔗' };

        list.innerHTML = groups.map(g => `
            <div class="admin-list-item" data-group-id="${g.id}">
                <div class="admin-item-info">
                    <div class="admin-item-title">${g.emoji || '🌍'} ${Validation.sanitizeHTML(g.name)}</div>
                    <div class="admin-item-meta">${platformIcons[g.platform] || '🔗'} ${g.platform} · ${g.continent || 'Global'} · ${g.country_code || '-'}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-edit-btn" onclick="app._editGroup('${g.id}')">Editar</button>
                    <button class="admin-delete-btn" onclick="app._deleteGroup('${g.id}')">Excluir</button>
                </div>
            </div>
        `).join('');
    },

    _openGroupForm(group) {
        const modal = document.getElementById('adminGroupModal');
        const title = document.getElementById('adminGroupModalTitle');
        const submitBtn = document.getElementById('adminGroupSubmitBtn');

        if (group) {
            title.textContent = 'Editar Grupo';
            submitBtn.textContent = 'Salvar Alterações';
            document.getElementById('adminGroupId').value = group.id;
            document.getElementById('adminGroupName').value = group.name || '';
            document.getElementById('adminGroupDesc').value = group.description || '';
            document.getElementById('adminGroupContinent').value = group.continent || '';
            document.getElementById('adminGroupCountry').value = group.country_code || '';
            document.getElementById('adminGroupPlatform').value = group.platform || 'whatsapp';
            document.getElementById('adminGroupEmoji').value = group.emoji || '🌍';
            document.getElementById('adminGroupLink').value = group.invite_link || '';
            document.getElementById('adminGroupOrder').value = group.display_order || 0;
        } else {
            title.textContent = 'Novo Grupo';
            submitBtn.textContent = 'Criar Grupo';
            document.getElementById('adminGroupForm').reset();
            document.getElementById('adminGroupId').value = '';
            document.getElementById('adminGroupEmoji').value = '🌍';
        }

        modal.style.display = 'flex';
    },

    _closeAdminGroupModal() {
        document.getElementById('adminGroupModal').style.display = 'none';
    },

    async _submitGroupForm() {
        const id = document.getElementById('adminGroupId').value;
        const data = {
            name: document.getElementById('adminGroupName').value.trim(),
            description: document.getElementById('adminGroupDesc').value.trim() || null,
            continent: document.getElementById('adminGroupContinent').value || null,
            country_code: document.getElementById('adminGroupCountry').value.trim().toUpperCase() || null,
            platform: document.getElementById('adminGroupPlatform').value,
            emoji: document.getElementById('adminGroupEmoji').value || '🌍',
            invite_link: document.getElementById('adminGroupLink').value.trim() || null,
            display_order: parseInt(document.getElementById('adminGroupOrder').value) || 0,
        };

        if (!data.name) {
            ErrorHandler.showToast('Nome do grupo é obrigatório', 'warning');
            return;
        }
        if (data.invite_link && !this._isValidURL(data.invite_link)) {
            ErrorHandler.showToast('Link do convite inválido', 'warning');
            return;
        }

        let result;
        if (id) {
            result = await Admin.updateGroup(id, data);
        } else {
            result = await Admin.createGroup(data);
        }

        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }

        this._closeAdminGroupModal();
        ErrorHandler.showToast(id ? 'Grupo atualizado!' : 'Grupo criado!', 'success');
        this._loadAdminGroups();
        if (document.getElementById('paGroups')) this._loadPAGroups();
    },

    async _editGroup(groupId) {
        const groups = await Admin.loadGroups();
        const g = groups.find(gr => gr.id === groupId);
        if (g) this._openGroupForm(g);
    },

    async _deleteGroup(groupId) {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

        const result = await Admin.deleteGroup(groupId);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }
        ErrorHandler.showToast('Grupo excluído!', 'success');
        this._loadAdminGroups();
        if (document.getElementById('paGroups')) this._loadPAGroups();
    },

    // ── Admin Dashboard ──

    async _loadAdminDashboard() {
        const container = document.getElementById('adminDashboardGrid');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">Carregando estatísticas...</p>';
        const stats = await Admin.getStats();

        const items = [
            { label: 'Usuários', value: stats.users, icon: '👥' },
            { label: 'Mentores', value: stats.mentors, icon: '🧠' },
            { label: 'Posts', value: stats.posts, icon: '💬' },
            { label: 'Eventos', value: stats.events, icon: '📅' },
            { label: 'Grupos', value: stats.groups, icon: '🌍' },
            { label: 'Check-ins', value: stats.checkins, icon: '😊' },
        ];

        container.innerHTML = items.map(s => `
            <div class="admin-stat-card">
                <div class="admin-stat-icon">${s.icon}</div>
                <div class="admin-stat-number">${s.value}</div>
                <div class="admin-stat-label">${s.label}</div>
            </div>
        `).join('');
    },

    // ── Admin Users ──

    async _loadAdminUsers() {
        const list = document.getElementById('adminUsersList');
        if (!list) return;

        list.innerHTML = '<p class="empty-state">Carregando usuários...</p>';
        const users = await Admin.loadAllProfiles();

        if (!users.length) {
            list.innerHTML = '<p class="empty-state">Nenhum usuário encontrado.</p>';
            return;
        }

        list.innerHTML = users.map(u => {
            const name = u.name || u.email || 'Sem nome';
            const roleOptions = ['user', 'mentor', 'admin'].map(r =>
                `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
            ).join('');

            return `
                <div class="admin-list-item">
                    <div class="admin-item-info">
                        <div class="admin-item-title">${Validation.sanitizeHTML(name)}</div>
                        <div class="admin-item-meta">${u.email || ''} · ${u.role || 'user'} · ${new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="admin-item-actions">
                        <select class="form-select-sm" onchange="app._changeUserRole('${u.id}', this.value)">
                            ${roleOptions}
                        </select>
                    </div>
                </div>
            `;
        }).join('');
    },

    async _changeUserRole(userId, role) {
        const roleLabels = { user: 'Usuário', admin: 'Administrador', moderator: 'Moderador' };
        if (!confirm(`Confirma alterar o papel para "${roleLabels[role] || role}"?`)) {
            // Reset the select to previous value
            this._loadAdminUsers();
            return;
        }
        const result = await Admin.updateUserRole(userId, role);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }
        ErrorHandler.showToast(`Papel atualizado para ${roleLabels[role] || role}!`, 'success');
    },

    // ── Admin Feed Moderation ──

    async _loadAdminFeed() {
        const list = document.getElementById('adminFeedList');
        if (!list) return;

        list.innerHTML = '<p class="empty-state">Carregando posts...</p>';
        const posts = await Admin.loadAllPosts();

        if (!posts.length) {
            list.innerHTML = '<p class="empty-state">Nenhum post encontrado.</p>';
            return;
        }

        list.innerHTML = posts.map(p => {
            const name = p.is_anonymous ? 'Anônimo' : (p.profiles?.name || 'Usuário');
            const time = this._timeAgo(p.created_at);
            return `
                <div class="admin-list-item" data-post-id="${p.id}">
                    <div class="admin-item-info">
                        <div class="admin-item-title">${Validation.sanitizeHTML(name)} · ${time}</div>
                        <div class="admin-item-meta">${Validation.sanitizeHTML(p.content.substring(0, 100))}${p.content.length > 100 ? '...' : ''}</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="admin-delete-btn" onclick="app._adminDeletePost('${p.id}')">Excluir</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async _adminDeletePost(postId) {
        if (!confirm('Excluir este post e todas as suas respostas?')) return;

        const result = await Admin.deletePost(postId);
        if (result.error) {
            ErrorHandler.showToast(result.error, 'error');
            return;
        }
        ErrorHandler.showToast('Post excluído!', 'success');
        this._loadAdminFeed();
    },

    // ── Admin Notifications ──

    _setupAdminNotifications() {
        const form = document.getElementById('adminNotifForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('adminNotifTitle')?.value.trim();
            const body = document.getElementById('adminNotifBody')?.value.trim();
            const target = document.getElementById('adminNotifTarget')?.value;

            if (!title || !body) {
                ErrorHandler.showToast('Preencha título e mensagem', 'warning');
                return;
            }

            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            const result = await Admin.sendBroadcastNotification(title, body, target);
            btn.disabled = false;
            btn.textContent = 'Enviar Notificação';

            if (result.error) {
                ErrorHandler.showToast(result.error, 'error');
                return;
            }

            ErrorHandler.showToast(`Notificação enviada para ${result.count} usuário(s)!`, 'success');
            form.reset();
        });
    },

    // ── Admin Check-ins ──

    async _loadAdminCheckins() {
        const container = document.getElementById('adminCheckinsGrid');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">Carregando check-ins...</p>';
        const checkins = await Admin.loadCheckinStats();

        if (!checkins.length) {
            container.innerHTML = '<p class="empty-state">Nenhum check-in nos últimos 7 dias.</p>';
            return;
        }

        const moodCounts = {};
        const moodLabels = {
            otimo: '😄 Ótimo', bem: '🙂 Bem', neutro: '😐 Neutro',
            triste: '😢 Triste', ansioso: '😰 Ansioso',
        };

        checkins.forEach(c => {
            moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
        });

        const total = checkins.length;

        container.innerHTML = `
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">Últimos 7 dias · ${total} check-ins</p>
            <div class="admin-stats-grid">
                ${Object.entries(moodCounts).map(([mood, count]) => `
                    <div class="admin-stat-card">
                        <div class="admin-stat-number">${count}</div>
                        <div class="admin-stat-label">${moodLabels[mood] || mood}</div>
                        <div class="admin-stat-pct">${Math.round(count / total * 100)}%</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ── Admin Engagement Metrics ──

    _metricsDays: 30,
    _metricsPage: 0,
    _metricsPageSize: 20,

    async _loadAdminMetrics() {
        this._setupMetricsPeriodSelector();
        await Promise.all([
            this._loadMetricsOverview(this._metricsDays),
            this._loadMetricsContentChart(this._metricsDays),
            this._loadMetricsMoodChart(this._metricsDays),
            this._loadMetricsConnections(this._metricsDays),
            this._loadMetricsJourney(),
            this._loadMetricsUserList(this._metricsDays),
        ]);
    },

    _setupMetricsPeriodSelector() {
        const selector = document.getElementById('metricsPeriodSelector');
        if (!selector || selector._bound) return;
        selector._bound = true;

        selector.addEventListener('click', (e) => {
            const btn = e.target.closest('.metrics-period-btn');
            if (!btn) return;
            selector.querySelectorAll('.metrics-period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this._metricsDays = parseInt(btn.dataset.days, 10);
            this._metricsPage = 0;
            this._loadAdminMetrics();
        });
    },

    async _loadMetricsOverview(days) {
        const data = await Admin.getEngagementOverview(days);
        if (!data) return;

        this._renderTemperatureGauge(data.global_temperature);
        this._renderKpiCards(data);
    },

    _renderTemperatureGauge(temp) {
        const wrap = document.getElementById('metricsGlobalTemp');
        if (!wrap) return;

        const { label, cssClass } = this._getTemperatureLabel(temp);
        // Needle rotation: -90deg = 0, 0deg = 50, 90deg = 100
        const angle = -90 + (temp / 100) * 180;

        wrap.innerHTML = `
            <div class="metrics-temp-gauge">
                <div class="metrics-temp-gauge-bg"></div>
                <div class="metrics-temp-needle" style="transform: rotate(${angle}deg)"></div>
            </div>
            <div class="metrics-temp-value ${cssClass}">${Math.round(temp)}</div>
            <div class="metrics-temp-label-text ${cssClass}">${label}</div>
        `;
    },

    _renderKpiCards(data) {
        const grid = document.getElementById('metricsKpiGrid');
        if (!grid) return;

        const kpis = [
            { value: data.active_users_period, label: 'Ativos', sub: `de ${data.total_users} total` },
            { value: data.new_users_period, label: 'Novos', sub: `no período` },
            { value: data.total_posts, label: 'Posts', sub: `${data.total_reactions} reações` },
            { value: data.total_checkins, label: 'Check-ins', sub: `${data.total_replies} respostas` },
            { value: data.total_event_registrations, label: 'Inscrições', sub: 'em eventos' },
            { value: data.total_messages, label: 'Mensagens', sub: 'diretas' },
            { value: `${data.profiles_completed_pct}%`, label: 'Perfis Completos', sub: '' },
            { value: `${data.connection_accept_rate}%`, label: 'Taxa Conexão', sub: `${data.total_connections_accepted} aceitas` },
        ];

        grid.innerHTML = kpis.map(k => `
            <div class="metrics-kpi-card">
                <div class="metrics-kpi-value">${k.value}</div>
                <div class="metrics-kpi-label">${k.label}</div>
                ${k.sub ? `<div class="metrics-kpi-sub">${k.sub}</div>` : ''}
            </div>
        `).join('');
    },

    async _loadMetricsContentChart(days) {
        const container = document.getElementById('metricsContentChart');
        if (!container) return;

        const data = await Admin.getContentActivity(days);
        if (!data.length) {
            container.innerHTML = '<p class="empty-state">Nenhuma atividade no período.</p>';
            return;
        }

        const maxVal = Math.max(...data.map(d => (d.posts || 0) + (d.reactions || 0) + (d.replies || 0)), 1);

        container.innerHTML = `
            <div class="metrics-bar-chart" style="height:140px">
                ${data.map(d => {
                    const total = (d.posts || 0) + (d.reactions || 0) + (d.replies || 0);
                    const ph = Math.max((d.posts || 0) / maxVal * 100, 2);
                    const rh = Math.max((d.reactions || 0) / maxVal * 100, 0);
                    const rrh = Math.max((d.replies || 0) / maxVal * 100, 0);
                    const dt = new Date(d.day);
                    const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
                    return `
                        <div class="metrics-bar-group" title="${label}: ${total} atividades">
                            <div class="metrics-bar-stack">
                                <div class="metrics-bar metrics-bar--replies" style="height:${rrh}%"></div>
                                <div class="metrics-bar metrics-bar--reactions" style="height:${rh}%"></div>
                                <div class="metrics-bar metrics-bar--posts" style="height:${ph}%"></div>
                            </div>
                            <span class="metrics-bar-date">${label}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="metrics-bar-legend">
                <span class="metrics-bar-legend-item"><span class="metrics-bar-legend-dot" style="background:var(--primary)"></span>Posts</span>
                <span class="metrics-bar-legend-item"><span class="metrics-bar-legend-dot" style="background:#a78bfa"></span>Reações</span>
                <span class="metrics-bar-legend-item"><span class="metrics-bar-legend-dot" style="background:#60a5fa"></span>Respostas</span>
            </div>
        `;
    },

    async _loadMetricsMoodChart(days) {
        const container = document.getElementById('metricsMoodChart');
        if (!container) return;

        const data = await Admin.getMoodDistribution(days);
        if (!data.length) {
            container.innerHTML = '<p class="empty-state">Nenhum check-in no período.</p>';
            return;
        }

        const moodColors = {
            otimo: '#22c55e', bem: '#86efac', neutro: '#fbbf24',
            ansioso: '#f97316', triste: '#60a5fa', saudade: '#a78bfa',
        };
        const moodEmoji = {
            otimo: '😄', bem: '🙂', neutro: '😐',
            ansioso: '😰', triste: '😢', saudade: '💜',
        };

        // Build conic-gradient stops
        let cumPct = 0;
        const stops = data.map(d => {
            const start = cumPct;
            cumPct += parseFloat(d.pct);
            return `${moodColors[d.mood] || '#9ca3af'} ${start}% ${cumPct}%`;
        });

        container.innerHTML = `
            <div class="metrics-donut-wrap">
                <div class="metrics-donut" style="background: conic-gradient(${stops.join(', ')})"></div>
                <div class="metrics-donut-legend">
                    ${data.map(d => `
                        <div class="metrics-donut-legend-item">
                            <span class="metrics-donut-legend-dot" style="background:${moodColors[d.mood] || '#9ca3af'}"></span>
                            ${moodEmoji[d.mood] || ''} ${d.mood}
                            <span class="metrics-donut-legend-pct">${d.count} (${d.pct}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async _loadMetricsConnections(days) {
        const container = document.getElementById('metricsConnections');
        if (!container) return;

        const data = await Admin.getConnectionMetrics(days);
        if (!data) {
            container.innerHTML = '<p class="empty-state">Sem dados de conexões.</p>';
            return;
        }

        container.innerHTML = `
            <div class="metrics-conn-grid">
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.sent}</div>
                    <div class="metrics-conn-stat-label">Enviadas</div>
                </div>
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.accepted}</div>
                    <div class="metrics-conn-stat-label">Aceitas</div>
                </div>
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.rejected}</div>
                    <div class="metrics-conn-stat-label">Rejeitadas</div>
                </div>
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.pending}</div>
                    <div class="metrics-conn-stat-label">Pendentes</div>
                </div>
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.accept_rate}%</div>
                    <div class="metrics-conn-stat-label">Taxa Aceite</div>
                </div>
                <div class="metrics-conn-stat">
                    <div class="metrics-conn-stat-value">${data.avg_compatibility_score}</div>
                    <div class="metrics-conn-stat-label">Score Médio</div>
                </div>
            </div>
            ${data.top_countries && data.top_countries.length ? `
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:var(--space-xs)">
                    Top países: ${data.top_countries.map(c => `${c.country} (${c.count})`).join(', ')}
                </div>
            ` : ''}
        `;
    },

    async _loadMetricsJourney() {
        const container = document.getElementById('metricsJourney');
        if (!container) return;

        const data = await Admin.getJourneyProgressSummary();
        if (!data) {
            container.innerHTML = '<p class="empty-state">Sem dados de jornada.</p>';
            return;
        }

        const phaseNames = ['', 'Diagnóstico', 'Preparação', 'Pré-Partida', 'No Exterior', 'Retorno'];

        container.innerHTML = `
            <div class="metrics-journey-phases">
                ${(data.phase_distribution || []).map(p => `
                    <div class="metrics-journey-phase">
                        <div class="metrics-journey-phase-num">${p.count}</div>
                        <div class="metrics-journey-phase-label">Fase ${p.phase}${phaseNames[p.phase] ? '<br>' + phaseNames[p.phase] : ''}</div>
                    </div>
                `).join('')}
            </div>
            <div class="metrics-journey-stats">
                <div class="metrics-journey-stat">
                    <span class="metrics-journey-stat-label">Jornadas iniciadas</span>
                    <span class="metrics-journey-stat-value">${data.total_journeys}</span>
                </div>
                <div class="metrics-journey-stat">
                    <span class="metrics-journey-stat-label">Diagnósticos</span>
                    <span class="metrics-journey-stat-value">${data.total_diagnostics}</span>
                </div>
                <div class="metrics-journey-stat">
                    <span class="metrics-journey-stat-label">Tarefas concluídas</span>
                    <span class="metrics-journey-stat-value">${data.tasks_completed}/${data.tasks_total}</span>
                </div>
                <div class="metrics-journey-stat">
                    <span class="metrics-journey-stat-label">Exercícios concluídos</span>
                    <span class="metrics-journey-stat-value">${data.exercises_completed}/${data.exercises_total}</span>
                </div>
                ${data.avg_readiness && data.avg_readiness.overall ? `
                    <div class="metrics-journey-stat">
                        <span class="metrics-journey-stat-label">Prontidão média</span>
                        <span class="metrics-journey-stat-value">${data.avg_readiness.overall}%</span>
                    </div>
                ` : ''}
            </div>
            ${(data.classification_distribution || []).length ? `
                <div style="margin-top:var(--space-sm);font-size:0.78rem;color:var(--text-muted)">
                    Classificações: ${data.classification_distribution.map(c => `${c.classification} (${c.count})`).join(', ')}
                </div>
            ` : ''}
        `;
    },

    async _loadMetricsUserList(days) {
        const container = document.getElementById('metricsUserList');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">Carregando...</p>';
        const data = await Admin.getUserEngagementList(days, this._metricsPageSize, this._metricsPage * this._metricsPageSize);
        if (!data.length) {
            container.innerHTML = '<p class="empty-state">Nenhum usuário encontrado.</p>';
            return;
        }

        const totalCount = data[0]?.total_count || 0;
        const totalPages = Math.ceil(totalCount / this._metricsPageSize);

        container.innerHTML = data.map(u => {
            const { label, cssClass } = this._getTemperatureLabel(u.temperature);
            const fillClass = cssClass.replace('metrics-temp-label', 'metrics-temp-fill');
            const name = u.user_name || u.user_email || 'Sem nome';
            const avatar = u.user_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=32&background=random`;
            return `
                <div class="metrics-user-row">
                    <div class="metrics-user-info">
                        <img class="metrics-user-avatar" src="${avatar}" alt="" loading="lazy">
                        <div>
                            <div class="metrics-user-name">${Validation.sanitizeHTML(name)}</div>
                            <div class="metrics-user-email">${u.user_email || ''}</div>
                        </div>
                    </div>
                    <div>
                        <div class="metrics-temp-bar">
                            <div class="metrics-temp-fill ${fillClass}" style="width:${u.temperature}%"></div>
                        </div>
                    </div>
                    <div class="metrics-user-temp-val ${cssClass}">${Math.round(u.temperature)}</div>
                </div>
            `;
        }).join('');

        this._renderMetricsPagination(totalPages);
    },

    _renderMetricsPagination(totalPages) {
        const container = document.getElementById('metricsUserPagination');
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        container.innerHTML = Array.from({ length: totalPages }, (_, i) => `
            <button class="metrics-page-btn ${i === this._metricsPage ? 'active' : ''}"
                    onclick="app._metricsGoToPage(${i})">${i + 1}</button>
        `).join('');
    },

    _metricsGoToPage(page) {
        this._metricsPage = page;
        this._loadMetricsUserList(this._metricsDays);
    },

    _getTemperatureLabel(temp) {
        if (temp >= 80) return { label: 'Fervendo', cssClass: 'metrics-temp-label--fervendo' };
        if (temp >= 60) return { label: 'Quente', cssClass: 'metrics-temp-label--quente' };
        if (temp >= 40) return { label: 'Morno', cssClass: 'metrics-temp-label--morno' };
        if (temp >= 20) return { label: 'Frio', cssClass: 'metrics-temp-label--frio' };
        return { label: 'Gelado', cssClass: 'metrics-temp-label--gelado' };
    },

    // ── Notification Panel ──

    _setupNotifPanel() {
        const btn = document.getElementById('notifBtn');
        if (!btn || btn._notifBound) return;
        btn._notifBound = true;

        // Create panel element
        const panel = document.createElement('div');
        panel.className = 'notif-panel';
        panel.id = 'notifPanel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="notif-panel-header">
                <h4>Notificações</h4>
                <button class="notif-mark-all-btn" id="notifMarkAllBtn">Marcar todas como lidas</button>
            </div>
            <div class="notif-panel-list" id="notifPanelList"></div>
        `;
        btn.parentElement.style.position = 'relative';
        btn.parentElement.appendChild(panel);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleNotifPanel();
        });

        document.getElementById('notifMarkAllBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this._markAllNotifsRead();
        });

        // Close on click outside
        this._notifOutsideHandler = (e) => {
            const p = document.getElementById('notifPanel');
            if (p && p.style.display !== 'none' && !p.contains(e.target) && e.target.id !== 'notifBtn' && !e.target.closest('#notifBtn')) {
                p.style.display = 'none';
            }
        };
        document.addEventListener('click', this._notifOutsideHandler);

        // Realtime: prepend new notification if panel is open
        Notifications.onNew((notif) => {
            const p = document.getElementById('notifPanel');
            if (p && p.style.display !== 'none') {
                const list = document.getElementById('notifPanelList');
                const empty = list.querySelector('.notif-empty');
                if (empty) empty.remove();
                list.insertAdjacentHTML('afterbegin', this._renderNotifItem(notif));
            }
        });
    },

    _destroyNotifPanel() {
        const panel = document.getElementById('notifPanel');
        if (panel) panel.remove();
        if (this._notifOutsideHandler) {
            document.removeEventListener('click', this._notifOutsideHandler);
            this._notifOutsideHandler = null;
        }
        const btn = document.getElementById('notifBtn');
        if (btn) btn._notifBound = false;
    },

    async _toggleNotifPanel() {
        const panel = document.getElementById('notifPanel');
        if (!panel) return;
        const isHidden = panel.style.display === 'none';
        if (isHidden) {
            panel.style.display = '';
            await this._renderNotifPanel();
        } else {
            panel.style.display = 'none';
        }
    },

    async _renderNotifPanel() {
        const list = document.getElementById('notifPanelList');
        if (!list) return;
        list.innerHTML = '<div class="notif-loading">Carregando...</div>';

        const notifs = await Notifications.loadAll();
        if (!notifs.length) {
            list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
            return;
        }
        list.innerHTML = notifs.map(n => this._renderNotifItem(n)).join('');
    },

    _renderNotifItem(n) {
        const unread = !n.read_at;
        const time = this._timeAgo(n.created_at);
        const title = this.escapeHTML(n.title || 'Notificação');
        const body = this.escapeHTML(n.body || '');
        return `<div class="notif-item${unread ? ' notif-unread' : ''}" data-notif-id="${n.id}" onclick="app._markNotifRead('${n.id}', this)">
            <div class="notif-item-title">${title}</div>
            ${body ? `<div class="notif-item-body">${body}</div>` : ''}
            <div class="notif-item-time">${time}</div>
        </div>`;
    },

    async _markNotifRead(notifId, el) {
        if (el && !el.classList.contains('notif-unread')) return;
        await Notifications.markAsRead(notifId);
        if (el) el.classList.remove('notif-unread');
    },

    async _markAllNotifsRead() {
        if (!this.currentUser) return;
        await Notifications.markAllRead(this.currentUser.id);
        const items = document.querySelectorAll('.notif-item.notif-unread');
        items.forEach(item => item.classList.remove('notif-unread'));
    },

    // ── Utilities ──

    _translateAuthError(msg) {
        const map = {
            'Invalid login credentials': 'Email ou senha incorretos',
            'Email not confirmed': 'Verifique seu email antes de entrar',
            'User already registered': 'Este email já está cadastrado',
            'Signup requires a valid password': 'A senha deve ter pelo menos 6 caracteres',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
            'Unable to validate email address: invalid format': 'Formato de email inválido',
            'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
            'For security purposes, you can only request this once every 60 seconds': 'Aguarde 60 segundos antes de tentar novamente',
            'New password should be different from the old password': 'A nova senha deve ser diferente da senha atual',
            'Auth session missing': 'Sessão expirada. Faça login novamente.',
        };
        for (const [en, pt] of Object.entries(map)) {
            if (msg.includes(en)) return pt;
        }
        return msg;
    },

    _timeAgo(dateStr) {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = Math.floor((now - then) / 1000);

        if (diff < 60) return 'agora';
        if (diff < 3600) return `${Math.floor(diff / 60)}min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return new Date(dateStr).toLocaleDateString('pt-BR');
    },

    escapeHTML(str) {
        return Validation.sanitizeHTML(str);
    },

    _isValidURL(str) {
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    },

    // ── Scroll to Top ──

    _setupScrollToTop() {
        const btn = document.createElement('button');
        btn.className = 'scroll-top-btn';
        btn.innerHTML = '↑';
        btn.setAttribute('aria-label', 'Voltar ao topo');
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        document.body.appendChild(btn);

        window.addEventListener('scroll', () => {
            btn.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
    },

    // ── Connections / Matching ──

    _cachedMatches: null,
    _activeConnFilter: 'all',
    _activeConnView: 'discover',

    _setupConnections() {
        // Sub-tab switching
        document.querySelectorAll('.conexoes-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.conexoes-view-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this._activeConnView = tab.dataset.connView;

                document.getElementById('connDiscoverView').style.display = this._activeConnView === 'discover' ? '' : 'none';
                document.getElementById('connPendingView').style.display = this._activeConnView === 'pending' ? '' : 'none';
                document.getElementById('connAcceptedView').style.display = this._activeConnView === 'accepted' ? '' : 'none';

                if (this._activeConnView === 'discover') this._loadDiscoverProfiles();
                if (this._activeConnView === 'pending') this._loadPendingRequests();
                if (this._activeConnView === 'accepted') this._loadMyConnections();
            });
        });

        // Filter chips
        document.querySelectorAll('.conn-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.conn-filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this._activeConnFilter = chip.dataset.connFilter;
                this._applyConnectionFilters();
            });
        });
    },

    _loadConnections() {
        if (this._activeConnView === 'discover') this._loadDiscoverProfiles();
        else if (this._activeConnView === 'pending') this._loadPendingRequests();
        else if (this._activeConnView === 'accepted') this._loadMyConnections();
    },

    async _loadDiscoverProfiles() {
        const grid = document.getElementById('conexoesGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
        document.getElementById('noConexoesMsg').style.display = 'none';

        const profiles = await Connections.getMatchingProfiles(40, 0);
        this._cachedMatches = profiles;
        this._applyConnectionFilters();
    },

    _applyConnectionFilters() {
        const grid = document.getElementById('conexoesGrid');
        if (!grid || !this._cachedMatches) return;

        const myProfile = this._userProfile;
        let filtered = this._cachedMatches;

        if (this._activeConnFilter === 'country' && myProfile?.destination_country) {
            filtered = filtered.filter(p => p.destination_country === myProfile.destination_country);
        } else if (this._activeConnFilter === 'status' && myProfile?.exchange_status) {
            filtered = filtered.filter(p => p.exchange_status === myProfile.exchange_status);
        } else if (this._activeConnFilter === 'language' && myProfile?.target_language) {
            filtered = filtered.filter(p => p.target_language === myProfile.target_language);
        }

        if (!filtered.length) {
            grid.innerHTML = '';
            document.getElementById('noConexoesMsg').style.display = '';
            return;
        }

        document.getElementById('noConexoesMsg').style.display = 'none';
        grid.innerHTML = filtered.map(p => this._renderMatchCard(p)).join('');
    },

    _renderMatchCard(profile) {
        const initials = (profile.name || '?').substring(0, 2).toUpperCase();
        const statusLabels = {
            planejando: 'Planejando',
            preparando: 'Preparando',
            no_exterior: 'No Exterior',
            retornou: 'Retornou',
        };

        const tags = [];
        if (profile.destination_country) tags.push(profile.destination_country);
        if (profile.exchange_status) tags.push(statusLabels[profile.exchange_status] || profile.exchange_status);
        if (profile.target_language) tags.push(profile.target_language.toUpperCase());

        const bioSnippet = profile.bio ? Validation.sanitizeHTML(profile.bio).substring(0, 80) + (profile.bio.length > 80 ? '...' : '') : '';

        return `
            <div class="match-card">
                <span class="match-score-badge">${profile.score}%</span>
                ${profile.photo_url
                    ? `<img class="match-photo" src="${Validation.sanitizeURL(profile.photo_url)}" alt="${Validation.sanitizeHTML(profile.name)}">`
                    : `<div class="match-photo-placeholder">${initials}</div>`
                }
                <div class="match-name">${Validation.sanitizeHTML(profile.name || 'Intercambista')}</div>
                ${tags.length ? `
                    <div class="match-meta-tags">
                        ${tags.map(t => `<span class="match-meta-tag">${Validation.sanitizeHTML(t)}</span>`).join('')}
                    </div>
                ` : ''}
                ${bioSnippet ? `<div class="match-bio">${bioSnippet}</div>` : ''}
                <button class="match-connect-btn" onclick="app._sendConnectionRequest('${profile.id}', ${profile.score}, this)">Conectar</button>
            </div>
        `;
    },

    async _sendConnectionRequest(userId, score, btnEl) {
        if (!this.currentUser) {
            ErrorHandler.showToast('Faça login para enviar solicitações', 'warning');
            return;
        }

        btnEl.disabled = true;
        btnEl.textContent = 'Enviando...';

        const result = await Connections.sendRequest(userId, score);
        if (result) {
            btnEl.textContent = 'Enviado';
            btnEl.classList.add('sent');
            ErrorHandler.showToast('Solicitação enviada!', 'success');
        } else {
            btnEl.disabled = false;
            btnEl.textContent = 'Conectar';
        }
    },

    async _loadPendingRequests() {
        const receivedList = document.getElementById('connReceivedList');
        const sentList = document.getElementById('connSentList');
        if (!receivedList || !sentList) return;

        receivedList.innerHTML = '<div class="skeleton skeleton-card"></div>';
        sentList.innerHTML = '<div class="skeleton skeleton-card"></div>';

        const [received, sent] = await Promise.all([
            Connections.getPendingReceived(),
            Connections.getPendingSent(),
        ]);

        // Update inline badge
        const pendingBadge = document.getElementById('connPendingBadge');
        if (pendingBadge) {
            if (received.length > 0) {
                pendingBadge.textContent = received.length;
                pendingBadge.style.display = '';
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        // Received
        if (!received.length) {
            receivedList.innerHTML = '';
            document.getElementById('noReceivedMsg').style.display = '';
        } else {
            document.getElementById('noReceivedMsg').style.display = 'none';
            receivedList.innerHTML = received.map(c => this._renderPendingItem(c, 'received')).join('');
        }

        // Sent
        if (!sent.length) {
            sentList.innerHTML = '';
            document.getElementById('noSentMsg').style.display = '';
        } else {
            document.getElementById('noSentMsg').style.display = 'none';
            sentList.innerHTML = sent.map(c => this._renderPendingItem(c, 'sent')).join('');
        }
    },

    _renderPendingItem(conn, direction) {
        const profile = direction === 'received' ? conn.requester : conn.addressee;
        if (!profile) return '';

        const initials = (profile.name || '?').substring(0, 2).toUpperCase();
        const detail = [profile.destination_country, profile.target_language?.toUpperCase()].filter(Boolean).join(' · ');

        if (direction === 'received') {
            return `
                <div class="conn-list-item" id="conn-item-${conn.id}">
                    ${profile.photo_url
                        ? `<img class="conn-list-photo" src="${Validation.sanitizeURL(profile.photo_url)}" alt="${Validation.sanitizeHTML(profile.name)}">`
                        : `<div class="conn-list-photo-placeholder">${initials}</div>`
                    }
                    <div class="conn-list-info">
                        <div class="conn-list-name">${Validation.sanitizeHTML(profile.name || 'Intercambista')}</div>
                        <div class="conn-list-detail">${detail}</div>
                    </div>
                    <span class="conn-score-sm">${conn.compatibility_score}%</span>
                    <div class="conn-list-actions">
                        <button class="conn-accept-btn" onclick="app._respondConnectionRequest('${conn.id}', true, this.closest('.conn-list-item'))">Aceitar</button>
                        <button class="conn-reject-btn" onclick="app._respondConnectionRequest('${conn.id}', false, this.closest('.conn-list-item'))">Recusar</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="conn-list-item" id="conn-item-${conn.id}">
                ${profile.photo_url
                    ? `<img class="conn-list-photo" src="${Validation.sanitizeURL(profile.photo_url)}" alt="${Validation.sanitizeHTML(profile.name)}">`
                    : `<div class="conn-list-photo-placeholder">${initials}</div>`
                }
                <div class="conn-list-info">
                    <div class="conn-list-name">${Validation.sanitizeHTML(profile.name || 'Intercambista')}</div>
                    <div class="conn-list-detail">${detail}</div>
                </div>
                <span class="conn-score-sm">${conn.compatibility_score}%</span>
                <span style="font-size:0.75rem;color:var(--text-muted)">Aguardando...</span>
            </div>
        `;
    },

    async _respondConnectionRequest(connId, accept, listItemEl) {
        const buttons = listItemEl.querySelectorAll('button');
        buttons.forEach(b => { b.disabled = true; });

        const ok = await Connections.respondRequest(connId, accept);
        if (ok) {
            listItemEl.classList.add('removing');
            setTimeout(() => {
                listItemEl.remove();
                // Check if lists are now empty
                const receivedList = document.getElementById('connReceivedList');
                const sentList = document.getElementById('connSentList');
                if (receivedList && !receivedList.children.length) {
                    document.getElementById('noReceivedMsg').style.display = '';
                }
                if (sentList && !sentList.children.length) {
                    document.getElementById('noSentMsg').style.display = '';
                }
            }, 300);
            ErrorHandler.showToast(accept ? 'Conexão aceita!' : 'Solicitação recusada.', accept ? 'success' : 'info');
        } else {
            buttons.forEach(b => { b.disabled = false; });
        }
    },

    async _loadMyConnections() {
        const list = document.getElementById('connAcceptedList');
        if (!list) return;

        list.innerHTML = '<div class="skeleton skeleton-card"></div>';

        const connections = await Connections.getAccepted();

        if (!connections.length) {
            list.innerHTML = '';
            document.getElementById('noAcceptedMsg').style.display = '';
            return;
        }

        document.getElementById('noAcceptedMsg').style.display = 'none';
        list.innerHTML = connections.map(c => {
            const otherProfile = c.requester_id === this.currentUser.id ? c.addressee : c.requester;
            if (!otherProfile) return '';

            const initials = (otherProfile.name || '?').substring(0, 2).toUpperCase();
            const detail = [otherProfile.destination_country, otherProfile.target_language?.toUpperCase()].filter(Boolean).join(' · ');

            return `
                <div class="conn-list-item">
                    ${otherProfile.photo_url
                        ? `<img class="conn-list-photo" src="${Validation.sanitizeURL(otherProfile.photo_url)}" alt="${Validation.sanitizeHTML(otherProfile.name)}">`
                        : `<div class="conn-list-photo-placeholder">${initials}</div>`
                    }
                    <div class="conn-list-info">
                        <div class="conn-list-name">${Validation.sanitizeHTML(otherProfile.name || 'Intercambista')}</div>
                        <div class="conn-list-detail">${detail}</div>
                    </div>
                    <div class="conn-list-actions">
                        <button class="conn-dm-btn" onclick="app.openDMWith('${otherProfile.id}', '${Validation.sanitizeHTML(otherProfile.name || '')}')">Mensagem</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    _onRealtimeConnection(payload) {
        // Refresh whichever view is active
        if (this.currentTab === 'tabConexoesContent') {
            this._loadConnections();
        }
    },

    // ── Offline Indicator ──

    _setupOfflineIndicator() {
        const bar = document.createElement('div');
        bar.className = 'offline-bar';
        bar.id = 'offlineBar';
        bar.textContent = 'Sem conexão — verifique sua internet';
        document.body.prepend(bar);

        const update = () => {
            bar.classList.toggle('visible', !navigator.onLine);
        };
        window.addEventListener('online', () => {
            update();
            ErrorHandler.showToast('Conexão restaurada!', 'success');
        });
        window.addEventListener('offline', update);
        update();
    },
};

// Global reference
window.app = App;
window.icApp = App;

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
