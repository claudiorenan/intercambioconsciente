/**
 * Intercâmbio Consciente — Profile Module
 */

const Profile = {
    async getProfile(userId) {
        const sb = window.supabaseClient;
        if (!sb) return null;

        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            ErrorHandler.handle('Profile.getProfile', error, { silent: true });
            return null;
        }
        return data;
    },

    async updateProfile(userId, updates) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não configurado' };

        const { data, error } = await sb
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            ErrorHandler.handle('Profile.updateProfile', error);
            return { error: error.message };
        }
        return { data, error: null };
    },

    async getMentors(filters = {}) {
        const sb = window.supabaseClient;
        if (!sb) return [];

        let query = sb
            .from('profiles')
            .select('*')
            .eq('role', 'mentor')
            .eq('is_active', true);

        if (filters.specialty) {
            query = query.eq('specialty', filters.specialty);
        }
        if (filters.language) {
            query = query.contains('languages', [filters.language]);
        }

        const { data, error } = await query.order('name');

        if (error) {
            ErrorHandler.handle('Profile.getMentors', error, { silent: true });
            return [];
        }
        return data || [];
    },

    async uploadAvatar(userId, file) {
        const sb = window.supabaseClient;
        if (!sb) return { error: 'Supabase não configurado' };

        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        if (!file || !ALLOWED_TYPES.includes(file.type)) {
            return { error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' };
        }

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            return { error: 'ID de usuário inválido' };
        }

        try {
            const resized = await Profile._resizeImage(file, 400);
            const path = `${userId}/avatar.jpg`;

            const { error: uploadError } = await sb.storage
                .from('avatars')
                .upload(path, resized, { upsert: true, contentType: 'image/jpeg' });

            if (uploadError) {
                ErrorHandler.handle('Profile.uploadAvatar', uploadError);
                return { error: uploadError.message };
            }

            const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
            const photo_url = urlData.publicUrl + '?t=' + Date.now();

            const updateResult = await Profile.updateProfile(userId, { photo_url });
            if (updateResult.error) {
                return { error: 'Foto enviada, mas falha ao atualizar perfil: ' + updateResult.error };
            }

            return { url: photo_url, error: null };
        } catch (err) {
            ErrorHandler.handle('Profile.uploadAvatar', err);
            return { error: err.message };
        }
    },

    _resizeImage(file, maxSize) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;

                if (w > h) {
                    if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
                } else {
                    if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
                }

                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao converter imagem')), 'image/jpeg', 0.8);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Falha ao carregar imagem'));
            };

            img.src = url;
        });
    },

    getCompleteness(profile) {
        if (!profile) return { percent: 0, missing: [] };

        const fields = [
            { key: 'name', label: 'Nome' },
            { key: 'bio', label: 'Bio' },
            { key: 'birth_year', label: 'Ano de nascimento' },
            { key: 'city_origin', label: 'Cidade de origem' },
            { key: 'profession', label: 'Profissão' },
            { key: 'destination_country', label: 'País de destino' },
            { key: 'destination_city', label: 'Cidade de destino' },
            { key: 'planned_departure', label: 'Previsão de embarque' },
            { key: 'exchange_objective', label: 'Tipo de intercâmbio' },
            { key: 'exchange_goal', label: 'Objetivo do intercâmbio' },
            { key: 'exchange_duration', label: 'Duração do intercâmbio' },
            { key: 'exchange_status', label: 'Status do intercâmbio' },
            { key: 'target_language', label: 'Idioma alvo' },
            { key: 'language_level', label: 'Nível do idioma' },
            { key: 'interests', label: 'Interesses' },
            { key: 'looking_for', label: 'O que busca na comunidade' },
        ];

        const missing = [];
        let filled = 0;

        for (const f of fields) {
            const val = profile[f.key];
            const isFilled = Array.isArray(val) ? val.length > 0 : (val != null && val !== '');
            if (isFilled) {
                filled++;
            } else {
                missing.push(f.label);
            }
        }

        return {
            percent: Math.round((filled / fields.length) * 100),
            missing,
        };
    },
};

window.Profile = Profile;
