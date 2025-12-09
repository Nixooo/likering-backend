# 🌐 Cómo Ejecutar el Frontend Localmente

## ⚠️ Problema

Si abres los archivos HTML directamente desde el explorador de archivos (doble clic), verás errores de CORS porque el navegador bloquea las peticiones desde `file://`.

## ✅ Solución: Usar un Servidor HTTP Local

### Opción 1: Usar Python (Más Fácil)

Si tienes Python instalado:

```powershell
# Python 3
python -m http.server 8000

# O Python 2
python -m SimpleHTTPServer 8000
```

Luego abre: `http://localhost:8000`

### Opción 2: Usar Node.js (http-server)

```powershell
# Instalar globalmente (solo una vez)
npm install -g http-server

# Ejecutar en la carpeta del proyecto
http-server -p 8000
```

Luego abre: `http://localhost:8000`

### Opción 3: Usar Live Server en VS Code

1. Instala la extensión "Live Server" en VS Code
2. Clic derecho en `index.html`
3. Selecciona "Open with Live Server"

### Opción 4: Usar PHP (si lo tienes instalado)

```powershell
php -S localhost:8000
```

## 🚀 Recomendación

**Para desarrollo local**, usa **Python** o **http-server**:
- Son simples y no requieren configuración
- Funcionan perfectamente para probar el frontend
- El frontend se conectará automáticamente a tu API en Render

## 📝 Nota

- El frontend detectará automáticamente si estás en `localhost` y usará `http://localhost:3000/api`
- Si estás en producción (servidor web), usará `https://likering-backend.onrender.com/api`
- El archivo `manifest.json` ahora existe y no causará errores

