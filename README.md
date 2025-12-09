# Likering - Migración a PostgreSQL (Aiven)

## 📋 Descripción

Este proyecto ha sido migrado de Google Spreadsheets a PostgreSQL en Aiven. El backend ahora utiliza Node.js + Express + PostgreSQL.

## 🚀 Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración de PostgreSQL (Aiven)
DB_HOST=tu-host-aiven.a.aivencloud.com
DB_PORT=12345
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=tu-password-aqui
DB_SSL=true

# Puerto del servidor
PORT=3000

# Configuración de producción (opcional)
NODE_ENV=development
```

**Nota:** Obtén estas credenciales desde tu panel de Aiven PostgreSQL.

### 3. Crear la base de datos

Ejecuta el script SQL en tu base de datos PostgreSQL de Aiven:

```bash
psql -h tu-host-aiven.a.aivencloud.com -p 12345 -U avnadmin -d defaultdb -f database.sql
```

O copia y pega el contenido de `database.sql` en tu cliente SQL de Aiven.

### 4. Iniciar el servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

### 5. Configurar el frontend

El archivo `config.js` ya está configurado para usar el nuevo backend. Si estás en producción, actualiza la URL en `config.js`:

```javascript
const API_BASE_URL = 'https://tu-dominio.com/api';
```

## 📁 Estructura del Proyecto

```
├── server.js           # Servidor Express con todas las rutas API
├── config.js           # Cliente API para el frontend
├── database.sql        # Esquema de base de datos
├── package.json        # Dependencias del proyecto
├── .env.example        # Ejemplo de variables de entorno
└── [archivos HTML]     # Frontend de la aplicación
```

## 🔌 Endpoints API

### Autenticación
- `POST /api/login` - Iniciar sesión
- `POST /api/register` - Registrar usuario

### Usuarios
- `GET /api/user/profile?user=username` - Obtener perfil
- `POST /api/user/update-profile-picture` - Actualizar foto
- `POST /api/user/update-password` - Actualizar contraseña

### Videos
- `GET /api/videos/all?username=username` - Obtener todos los videos
- `GET /api/videos/user?user=username` - Videos de un usuario
- `POST /api/videos/save` - Guardar nuevo video
- `POST /api/videos/edit` - Editar video
- `POST /api/videos/delete` - Eliminar video
- `POST /api/videos/like` - Dar like
- `POST /api/videos/view` - Registrar visualización

### Comentarios
- `GET /api/comments?videoId=id` - Obtener comentarios
- `POST /api/comments/add` - Agregar comentario
- `POST /api/comments/edit` - Editar comentario
- `POST /api/comments/delete` - Eliminar comentario

### Seguidores
- `POST /api/follow` - Seguir usuario

### Mensajería
- `GET /api/messages/conversations?user=username` - Obtener conversaciones
- `GET /api/messages?user1=user1&user2=user2` - Obtener mensajes
- `POST /api/messages/send` - Enviar mensaje
- `POST /api/messages/delete` - Eliminar mensaje
- `POST /api/messages/mark-read` - Marcar como leído

## 🔄 Migración desde Google Spreadsheets

Los archivos HTML que usaban `SCRIPT_URL` directamente ahora usan el objeto `API` de `config.js`. Los siguientes archivos fueron actualizados automáticamente:

- ✅ `index.html` - Ya usa `API.login()` y `API.register()`
- ✅ `videos.html` - Ya usa métodos del objeto `API`
- ✅ `config.js` - Nuevo cliente API creado

**Archivos que aún necesitan actualización manual:**

Los siguientes archivos aún usan `SCRIPT_URL` directamente y deben ser actualizados para usar el objeto `API`:

- `editor.html` - Usa `SCRIPT_URL` para guardar videos
- `mensajes.html` - Usa `SCRIPT_URL` para conversaciones
- `chat.html` - Usa `SCRIPT_URL` para mensajes
- `perfil.html` - Usa `SCRIPT_URL` para perfil
- `streamer.html` - Usa `SCRIPT_URL` para perfil de otros usuarios

## 🐛 Solución de Problemas

### Error de conexión a la base de datos

1. Verifica que las credenciales en `.env` sean correctas
2. Asegúrate de que tu IP esté permitida en el firewall de Aiven
3. Verifica que `DB_SSL=true` si Aiven requiere SSL

### Error "relation does not exist"

Ejecuta el script `database.sql` para crear todas las tablas necesarias.

### CORS errors

El servidor ya tiene CORS habilitado. Si tienes problemas, verifica que el frontend esté apuntando a la URL correcta.

## 📝 Notas

- El sistema de planes (azul, rojo, etc.) se mantiene igual
- Los IDs de videos, comentarios y mensajes ahora usan UUIDs
- Las contraseñas se almacenan con hash bcrypt
- Los timestamps se manejan automáticamente con triggers de PostgreSQL

## 🔐 Seguridad

- Las contraseñas se hashean con bcrypt (10 rounds)
- Las consultas SQL usan parámetros preparados para prevenir SQL injection
- Los mensajes solo pueden ser eliminados si no han sido leídos
- Los comentarios solo pueden ser editados/eliminados por su autor

## 📞 Soporte

Si encuentras algún problema, verifica:
1. Los logs del servidor (`npm run dev`)
2. La consola del navegador para errores del frontend
3. La conexión a la base de datos PostgreSQL

