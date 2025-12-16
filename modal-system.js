// Sistema de modales para reemplazar alert() y confirm()
// Usar: showModal() y showConfirmModal()

(function() {
    'use strict';

    // Crear estilos de modales si no existen
    if (!document.getElementById('modal-system-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-system-styles';
        style.textContent = `
            .modal-system-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .modal-system-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .modal-system-container {
                background: rgba(20, 20, 32, 0.98);
                backdrop-filter: blur(30px) saturate(180%);
                -webkit-backdrop-filter: blur(30px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                width: 90%;
                max-width: 420px;
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
                position: relative;
            }

            .modal-system-overlay.show .modal-system-container {
                transform: scale(1) translateY(0);
            }

            .modal-system-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(135deg, #FF2D7A 0%, #00A8FF 100%);
            }

            .modal-system-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .modal-system-icon {
                font-size: 1.8rem;
                color: #00A8FF;
            }

            .modal-system-icon.warning {
                color: #ff4757;
            }

            .modal-system-icon.success {
                color: #28a745;
            }

            .modal-system-header h3 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 700;
                color: #FFFFFF;
                font-family: 'Inter', sans-serif;
            }

            .modal-system-body {
                padding: 24px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.95rem;
                line-height: 1.6;
                font-family: 'Inter', sans-serif;
            }

            .modal-system-footer {
                padding: 16px 24px 24px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .modal-system-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 12px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', sans-serif;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 100px;
                justify-content: center;
            }

            .modal-system-btn.primary {
                background: linear-gradient(135deg, #FF2D7A 0%, #00A8FF 100%);
                color: white;
                box-shadow: 0 4px 16px rgba(255, 45, 122, 0.3);
            }

            .modal-system-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(255, 45, 122, 0.5);
            }

            .modal-system-btn.secondary {
                background: rgba(255, 255, 255, 0.05);
                border: 1.5px solid rgba(255, 255, 255, 0.1);
                color: #FFFFFF;
            }

            .modal-system-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(0, 168, 255, 0.3);
            }

            .modal-system-btn.danger {
                background: linear-gradient(135deg, #ff4757 0%, #ff2d7a 100%);
                color: white;
                box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);
            }

            .modal-system-btn.danger:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(255, 71, 87, 0.5);
            }

            .modal-system-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Función para mostrar modal simple (reemplaza alert)
    window.showModal = function(message, title = 'Aviso', type = 'info') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-system-overlay';
            
            const iconClass = type === 'error' ? 'warning' : type === 'success' ? 'success' : '';
            const icon = type === 'error' ? 'fa-exclamation-triangle' : 
                        type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
            
            overlay.innerHTML = `
                <div class="modal-system-container">
                    <div class="modal-system-header">
                        <i class="fas ${icon} modal-system-icon ${iconClass}"></i>
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-system-body">
                        ${message}
                    </div>
                    <div class="modal-system-footer">
                        <button class="modal-system-btn primary" id="modal-ok-btn">Aceptar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            setTimeout(() => overlay.classList.add('show'), 10);
            
            const okBtn = overlay.querySelector('#modal-ok-btn');
            const closeModal = () => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 300);
            };
            
            okBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        });
    };

    // Función para mostrar modal de confirmación (reemplaza confirm)
    window.showConfirmModal = function(message, title = 'Confirmar', type = 'warning') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-system-overlay';
            
            const iconClass = type === 'danger' ? 'warning' : '';
            const icon = type === 'danger' ? 'fa-exclamation-triangle' : 'fa-question-circle';
            
            overlay.innerHTML = `
                <div class="modal-system-container">
                    <div class="modal-system-header">
                        <i class="fas ${icon} modal-system-icon ${iconClass}"></i>
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-system-body">
                        ${message}
                    </div>
                    <div class="modal-system-footer">
                        <button class="modal-system-btn secondary" id="modal-cancel-btn">Cancelar</button>
                        <button class="modal-system-btn ${type === 'danger' ? 'danger' : 'primary'}" id="modal-confirm-btn">Confirmar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            setTimeout(() => overlay.classList.add('show'), 10);
            
            const cancelBtn = overlay.querySelector('#modal-cancel-btn');
            const confirmBtn = overlay.querySelector('#modal-confirm-btn');
            
            const closeModal = (result) => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300);
            };
            
            cancelBtn.addEventListener('click', () => closeModal(false));
            confirmBtn.addEventListener('click', () => closeModal(true));
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(false);
            });
            
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', escHandler);
                }
            });
        });
    };

    // Reemplazar alert y confirm globalmente si se desea
    // window.alert = function(message) { return showModal(message, 'Aviso', 'info'); };
    // window.confirm = function(message) { return showConfirmModal(message, 'Confirmar', 'warning'); };
})();

