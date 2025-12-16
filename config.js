// Configuración de la API para Likering
// Backend: Node.js + Express + PostgreSQL (Aiven) - Desplegado en Render.com

// Detectar si estamos en desarrollo local
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ============================================
// ⚠️ CONFIGURACIÓN DEL BACKEND - IMPORTANTE ⚠️
// ============================================
// Si cambiaste el nombre del servicio en Render.com, actualiza esta URL:
// 1. Ve a tu dashboard de Render.com
// 2. Busca tu servicio Web (backend)
// 3. Copia la URL que aparece (ej: https://tu-servicio.onrender.com)
// 4. Reemplaza la URL abajo con tu URL real
// ============================================

const RENDER_BACKEND_URL = 'https://likering-backend.onrender.com'; // ⚠️ CAMBIA ESTA URL SI ES NECESARIO
const LOCAL_BACKEND_URL = 'http://localhost:3000';

const API_BASE_URL = isLocalhost 
    ? `${LOCAL_BACKEND_URL}/api`
    : `${RENDER_BACKEND_URL}/api`;

// Log para debugging (solo en desarrollo)
if (isLocalhost) {
    console.log('🔧 Modo desarrollo - API URL:', API_BASE_URL);
} else {
    console.log('🌐 Modo producción - API URL:', API_BASE_URL);
}

const API = {
    // ==================== AUTENTICACIÓN ====================
    
    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
                console.error(`📍 URL intentada: ${API_BASE_URL}/login`);
                return { 
                    success: false, 
                    message: `Error del servidor (${response.status}). Verifica que el backend esté funcionando en: ${API_BASE_URL}` 
                };
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Error en login:', error);
            console.error(`📍 URL intentada: ${API_BASE_URL}/login`);
            return { 
                success: false, 
                message: `Error de conexión. No se pudo conectar a: ${API_BASE_URL}. Verifica que el backend esté desplegado y funcionando.` 
            };
        }
    },

    async register(username, password, imageUrl) {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, imageUrl })
            });
            return await response.json();
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    // ==================== VIDEOS ====================
    
    async getAllVideos(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/all?username=${encodeURIComponent(username)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener videos:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async getComments(videoId) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments?videoId=${encodeURIComponent(videoId)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener comentarios:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async addComment(videoId, username, commentText) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId, username, commentText })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al agregar comentario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async editComment(commentId, newText, username) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ commentId, newText, username })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al editar comentario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async deleteComment(commentId, username) {
        try {
            const response = await fetch(`${API_BASE_URL}/comments/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ commentId, username })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al eliminar comentario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async likeVideo(videoId, username) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId, username })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al dar like:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async recordView(videoId, username) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId, username })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al registrar visualización:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async checkFollow(followerUsername, targetUsername) {
        try {
            const response = await fetch(`${API_BASE_URL}/follow/check?followerUsername=${encodeURIComponent(followerUsername)}&targetUsername=${encodeURIComponent(targetUsername)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al verificar seguimiento:', error);
            return { success: false, isFollowing: false };
        }
    },

    async followUser(followerUsername, targetUsername) {
        try {
            const response = await fetch(`${API_BASE_URL}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ followerUsername, targetUsername })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al seguir usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async unfollowUser(followerUsername, targetUsername) {
        try {
            const response = await fetch(`${API_BASE_URL}/unfollow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ followerUsername, targetUsername })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al dejar de seguir usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    // ==================== USUARIOS ====================
    
    async getUserProfile(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/profile?user=${encodeURIComponent(username)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async updateProfilePicture(username, imageUrl) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/update-profile-picture`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, imageUrl })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al actualizar foto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async updatePassword(username, newPassword) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, newPassword })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async updateFollowCounters() {
        try {
            const response = await fetch(`${API_BASE_URL}/user/update-follow-counters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al actualizar contadores:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    // ==================== MENSAJERÍA ====================
    
    async getConversations(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/conversations?user=${encodeURIComponent(username)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener conversaciones:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async getMessages(user1, user2) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async sendMessage(from, to, message) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ from, to, message })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async deleteMessage(messageId, username) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messageId, username })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al eliminar mensaje:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async markAsRead(from, to) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ from, to })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al marcar como leído:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    // ==================== EDITOR DE VIDEOS ====================
    
    async getVideosForUser(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/user?user=${encodeURIComponent(username)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener videos del usuario:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async getLikedVideosForUser(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/liked-by-user?username=${encodeURIComponent(username)}`);
            return await response.json();
        } catch (error) {
            console.error('Error al obtener videos que le gustaron al usuario:', error);
            return { success: false, message: 'Error de conexión', data: [] };
        }
    },

    async saveVideoData(usuario, titulo, descripcion, videoUrl, thumbnailUrl, musicUrl) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, titulo, descripcion, videoUrl, thumbnailUrl, musicUrl })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al guardar video:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async editVideoDetails(videoId, newTitle, newDescription) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId, newTitle, newDescription })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al editar video:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    async deleteVideo(videoId) {
        try {
            const response = await fetch(`${API_BASE_URL}/videos/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ videoId })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al eliminar video:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }
};

// Función para verificar que el backend esté disponible
async function checkBackendHealth() {
    try {
        const healthUrl = API_BASE_URL.replace('/api', '/api/health');
        const response = await fetch(healthUrl, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend disponible:', data);
            return true;
        } else {
            console.warn('⚠️ Backend respondió con error:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ No se pudo conectar al backend:', error.message);
        console.error('📍 URL intentada:', API_BASE_URL.replace('/api', '/api/health'));
        console.error('💡 Verifica que:');
        console.error('   1. El backend esté desplegado en Render.com');
        console.error('   2. La URL en config.js sea correcta');
        console.error('   3. El servicio no esté dormido (puede tardar ~30 segundos en despertar)');
        return false;
    }
}

// Verificar salud del backend al cargar (solo en producción)
if (typeof window !== 'undefined' && !isLocalhost) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            checkBackendHealth().then(isHealthy => {
                if (!isHealthy) {
                    console.warn('⚠️ El backend no está disponible. Algunas funciones pueden no funcionar.');
                }
            });
        }, 1000); // Esperar 1 segundo después de cargar
    });
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.API = API;
    window.checkBackendHealth = checkBackendHealth;
}

