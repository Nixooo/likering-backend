// Configuración de la API para Likering
// Backend: Node.js + Express + PostgreSQL (Aiven) - Desplegado en Render.com

// Detectar si estamos en desarrollo o producción
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// URL del backend - Actualiza esta URL con la URL de tu servicio en Render.com
// Formato: https://tu-servicio.onrender.com/api
const API_BASE_URL = isDevelopment 
    ? 'http://localhost:3000/api' 
    : 'https://likering-backend.onrender.com/api'; // ⚠️ CAMBIA ESTA URL por la de tu servicio en Render

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
            return await response.json();
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error de conexión' };
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

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.API = API;
}

