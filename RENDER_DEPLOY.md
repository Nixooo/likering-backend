# 🚀 Guía de Despliegue en Render.com

## 📋 Requisitos Previos

1. ✅ Cuenta en Render.com (gratis): https://render.com
2. ✅ Base de datos PostgreSQL en Aiven configurada
3. ✅ Archivo `.env` con las credenciales de Aiven (solo para pruebas locales)

## 🔧 Paso 1: Preparar el Repositorio

### Opción A: Si usas Git (Recomendado)

1. Inicializa Git (si no lo has hecho):
```bash
git init
git add .
git commit -m "Initial commit - Likering backend"
```

2. Crea un repositorio en GitHub:
   - Ve a https://github.com/new
   - Crea un nuevo repositorio
   - Conecta tu proyecto local:
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

### Opción B: Subir directamente a Render

Render también permite subir archivos directamente, pero Git es más recomendado.

## 🌐 Paso 2: Crear Servicio Web en Render

1. **Ve a Render Dashboard**: https://dashboard.render.com

2. **Clic en "New +"** → **"Web Service"**

3. **Conecta tu repositorio**:
   - Si usas GitHub: Conecta tu cuenta y selecciona el repositorio
   - Si no usas Git: Usa "Manual Deploy" y sube los archivos

4. **Configuración del servicio**:
   - **Name**: `likering-backend` (o el nombre que prefieras)
   - **Environment**: `Node`
   - **Region**: Elige la más cercana a ti
   - **Branch**: `main` (o `master`)
   - **Root Directory**: (deja vacío si está en la raíz)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

## 🔐 Paso 3: Configurar Variables de Entorno en Render

En la sección **"Environment"** del servicio, agrega estas variables:

```
NODE_ENV=production
PORT=10000
DB_HOST=tu-host-aiven.a.aivencloud.com
DB_PORT=12345
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=tu-password-real-de-aiven
DB_SSL=true
```

**⚠️ IMPORTANTE**: 
- Reemplaza los valores con tus credenciales reales de Aiven
- Render encripta estas variables automáticamente
- NO subas el archivo `.env` al repositorio (agrégalo a `.gitignore`)

## 🗄️ Paso 4: Crear Base de Datos (si aún no lo hiciste)

1. Ve a tu proyecto en Aiven
2. Abre la consola SQL
3. Copia y pega el contenido completo del archivo `database.sql`
4. Ejecuta el script para crear todas las tablas

## 🚀 Paso 5: Desplegar

1. En Render, haz clic en **"Create Web Service"**
2. Render comenzará a construir y desplegar tu aplicación
3. Espera a que termine (puede tomar 2-5 minutos)
4. Una vez desplegado, Render te dará una URL como: `https://likering-backend.onrender.com`

## ✅ Paso 6: Actualizar config.js

1. Copia la URL que Render te dio (ej: `https://likering-backend.onrender.com`)
2. Abre `config.js` en tu proyecto
3. Actualiza esta línea:

```javascript
const API_BASE_URL = isDevelopment 
    ? 'http://localhost:3000/api' 
    : 'https://likering-backend.onrender.com/api'; // ⚠️ Cambia esta URL
```

4. Reemplaza `likering-backend.onrender.com` con tu URL real de Render

5. Si usas Git, haz commit y push:
```bash
git add config.js
git commit -m "Update API URL for Render deployment"
git push
```

Render detectará el cambio y redesplegará automáticamente.

## 🧪 Paso 7: Probar la API

1. Ve a: `https://tu-servicio.onrender.com/api/health`
2. Deberías ver:
```json
{"success":true,"message":"API funcionando correctamente"}
```

## 📱 Paso 8: Usar la Aplicación

1. Abre `index.html` en tu navegador
2. El frontend se conectará automáticamente al backend en Render
3. Si estás probando localmente, el frontend usará `localhost:3000`
4. Si abres el HTML desde un servidor web, usará la URL de Render

## 🔄 Actualizaciones Futuras

Cada vez que hagas cambios:

1. Haz commit y push a Git:
```bash
git add .
git commit -m "Descripción de los cambios"
git push
```

2. Render detectará automáticamente los cambios y redesplegará

## ⚙️ Configuración Avanzada

### Auto-deploy

Render tiene auto-deploy habilitado por defecto. Cada push a la rama principal redesplegará automáticamente.

### Logs

Puedes ver los logs en tiempo real en el dashboard de Render:
- Ve a tu servicio
- Clic en "Logs"
- Verás todos los logs del servidor

### Health Checks

Render verificará automáticamente que tu servicio esté funcionando. Puedes configurar un endpoint de health check en:
- Settings → Health Check Path: `/api/health`

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que las variables de entorno en Render sean correctas
- Asegúrate de que tu IP esté permitida en Aiven (o usa SSL)
- Verifica que `DB_SSL=true`

### Error: "Build failed"
- Revisa los logs de build en Render
- Verifica que `package.json` tenga todas las dependencias
- Asegúrate de que el build command sea `npm install`

### El servicio se "duerme" después de inactividad
- Render tiene un plan gratuito que "duerme" servicios después de 15 minutos de inactividad
- La primera petición después de dormir puede tardar ~30 segundos
- Para evitar esto, considera el plan de pago o usa un servicio de "ping" periódico

### CORS errors
- El servidor ya tiene CORS habilitado
- Si tienes problemas, verifica que el frontend esté usando la URL correcta

## 📝 Notas Importantes

- **Plan Gratuito**: Render tiene un plan gratuito que es perfecto para empezar
- **Sleep Mode**: Los servicios gratuitos se "duermen" después de inactividad
- **SSL**: Render proporciona SSL automáticamente (HTTPS)
- **Variables de Entorno**: Nunca subas credenciales al código, usa variables de entorno en Render

## 🔗 URLs Útiles

- Render Dashboard: https://dashboard.render.com
- Documentación de Render: https://render.com/docs
- Aiven Dashboard: https://console.aiven.io

