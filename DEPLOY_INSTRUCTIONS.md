# 🚀 Instrucciones para Deploy en Render.com

## Problema: Auto-deploy no funciona

Si los cambios se suben a GitHub pero Render.com no hace deploy automático, sigue estos pasos:

## ✅ Solución Rápida: Deploy Manual

1. Ve a: https://dashboard.render.com
2. Busca tu servicio: `likering-backend`
3. Haz clic en el servicio
4. En la parte superior, busca "Manual Deploy"
5. Haz clic en "Deploy latest commit"
6. Espera a que termine el deploy (1-2 minutos)

## 🔧 Habilitar Auto-Deploy Permanente

### Paso 1: Verificar Conexión del Repositorio

1. Ve a tu servicio en Render.com
2. Ve a la pestaña **"Settings"**
3. En la sección **"Build & Deploy"** verifica:
   - **Repository:** Debe mostrar: `Nixooo/likering-backend`
   - **Branch:** Debe ser `main`
   - **Root Directory:** (dejar vacío)
   - **Auto-Deploy:** Debe estar en **"Yes"**

### Paso 2: Si el Repositorio no está conectado

1. En la parte superior de Settings, busca **"Repository"**
2. Haz clic en **"Connect Repository"**
3. Selecciona: `Nixooo/likering-backend`
4. Selecciona branch: `main`
5. Guarda los cambios

### Paso 3: Activar Auto-Deploy

1. En **"Build & Deploy"**
2. Cambia **"Auto-Deploy"** a **"Yes"**
3. Guarda los cambios

## 📋 Configuración Recomendada en Render.com

```
Service Name: likering-backend
Environment: Node
Build Command: npm install
Start Command: npm start
Root Directory: (vacío)
Branch: main
Auto-Deploy: Yes
```

## 🔍 Verificar que Funciona

Después de hacer push a GitHub:

1. Ve a Render.com → Tu servicio
2. Ve a la pestaña **"Events"** o **"Logs"**
3. Deberías ver un nuevo deploy iniciándose automáticamente
4. Si no aparece, haz un deploy manual

## ⚠️ Notas Importantes

- Render.com puede tardar 30-60 segundos en detectar cambios en GitHub
- Si el servicio está "dormido", puede tardar ~30 segundos en despertar
- Los servicios gratuitos de Render se duermen después de 15 minutos de inactividad

## 🆘 Si Nada Funciona

1. **Verifica los logs de Render:**
   - Ve a "Logs" en tu servicio
   - Busca errores de build o runtime

2. **Verifica las variables de entorno:**
   - Settings → Environment
   - Asegúrate de que todas las variables de BD estén configuradas

3. **Revisa el webhook de GitHub:**
   - GitHub → Settings → Webhooks
   - Debe haber un webhook de render.com

4. **Contacta soporte de Render:**
   - Si el problema persiste, contacta a Render.com support

## 📞 URLs Útiles

- Dashboard Render: https://dashboard.render.com
- Tu repositorio: https://github.com/Nixooo/likering-backend
- Tu servicio (probablemente): https://likering-backend.onrender.com

