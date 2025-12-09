# 🚀 Desplegar Frontend en Producción

## Opciones de Hosting Estático

### Opción 1: Netlify (Recomendado - Más Fácil) ⭐

**Ventajas:**
- ✅ Gratis
- ✅ Muy fácil de usar
- ✅ Deploy automático desde GitHub
- ✅ HTTPS automático
- ✅ Dominio personalizado gratis

**Pasos:**
1. Ve a: https://app.netlify.com
2. Crea cuenta (puedes usar GitHub)
3. Clic en "Add new site" → "Import an existing project"
4. Conecta tu repositorio: `Nixooo/likering-backend`
5. Configuración:
   - **Build command**: (deja vacío - no necesitas build)
   - **Publish directory**: `/` (raíz)
6. Clic en "Deploy site"
7. Netlify te dará una URL como: `https://likering-backend.netlify.app`

**Actualizar config.js:**
Una vez tengas la URL de Netlify, actualiza `config.js` para que use la URL de Render siempre (ya no detectará localhost).

### Opción 2: Vercel

**Pasos:**
1. Ve a: https://vercel.com
2. Crea cuenta con GitHub
3. "Add New Project"
4. Importa tu repositorio
5. Deploy automático

### Opción 3: GitHub Pages

**Pasos:**
1. En GitHub, ve a tu repositorio
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main` / `/` (root)
5. Save
6. Tu sitio estará en: `https://nixooo.github.io/likering-backend`

### Opción 4: Render (Static Site)

**Pasos:**
1. En Render, "New +" → "Static Site"
2. Conecta tu repositorio
3. Build command: (vacío)
4. Publish directory: `/`
5. Deploy

---

## ⚙️ Actualizar config.js para Producción

Una vez desplegado, actualiza `config.js` para que siempre use la URL de Render:

```javascript
// En lugar de detectar localhost, siempre usar Render
const API_BASE_URL = 'https://likering-backend.onrender.com/api';
```

O mantener la detección pero asegurarte de que funcione correctamente.

---

## 🎯 Recomendación

**Netlify** es la opción más fácil y rápida:
- Deploy en 2 minutos
- HTTPS automático
- URL profesional
- Deploy automático en cada push a GitHub

