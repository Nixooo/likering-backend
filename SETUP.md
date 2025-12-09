# 🚀 Guía de Configuración Rápida - Likering

## Paso 1: Configurar Base de Datos (Aiven PostgreSQL)

### 1.1 Obtener credenciales de Aiven

Ve a tu panel de Aiven y obtén:
- **Host**: `tu-proyecto.a.aivencloud.com`
- **Port**: `12345` (o el puerto que te asignaron)
- **Database**: `defaultdb` (o el nombre de tu base de datos)
- **User**: `avnadmin` (o tu usuario)
- **Password**: Tu contraseña de Aiven
- **SSL**: Habilitado (true)

### 1.2 Crear archivo .env

Crea un archivo llamado `.env` en la raíz del proyecto con este contenido:

```env
DB_HOST=tu-host-aiven.a.aivencloud.com
DB_PORT=12345
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=tu-password-aqui
DB_SSL=true

PORT=3000
NODE_ENV=development
```

**⚠️ IMPORTANTE**: Reemplaza los valores con tus credenciales reales de Aiven.

### 1.3 Crear las tablas en PostgreSQL

Tienes 3 opciones:

#### Opción A: Desde el panel web de Aiven
1. Ve a tu proyecto en Aiven
2. Abre la consola SQL
3. Copia y pega el contenido completo del archivo `database.sql`
4. Ejecuta el script

#### Opción B: Desde psql (si lo tienes instalado)
```bash
psql "host=tu-host port=12345 dbname=defaultdb user=avnadmin password=tu-password sslmode=require" -f database.sql
```

#### Opción C: Desde un cliente SQL (DBeaver, pgAdmin, etc.)
1. Conéctate a tu base de datos Aiven
2. Abre el archivo `database.sql`
3. Ejecuta todo el script

## Paso 2: Iniciar el Servidor

Una vez configurado el `.env` y creadas las tablas:

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## Paso 3: Probar la API

Abre tu navegador y ve a:
```
http://localhost:3000/api/health
```

Deberías ver:
```json
{"success":true,"message":"API funcionando correctamente"}
```

## Paso 4: Usar la Aplicación

1. Abre `index.html` en tu navegador
2. El frontend se conectará automáticamente al backend en `http://localhost:3000`
3. Si estás en producción, actualiza `API_BASE_URL` en `config.js`

## 🔧 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que tu IP esté permitida en el firewall de Aiven
- Verifica que `DB_SSL=true` si Aiven requiere SSL

### Error: "relation does not exist"
- Ejecuta el script `database.sql` en tu base de datos

### Error: "npm no se reconoce"
- Reinicia PowerShell después de instalar Node.js
- O usa la ruta completa: `C:\Program Files\nodejs\npm.cmd`

## ✅ Checklist

- [ ] Node.js instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Dependencias instaladas (`node_modules` existe)
- [ ] Archivo `.env` creado con credenciales correctas
- [ ] Base de datos creada (tablas existentes)
- [ ] Servidor iniciado (`npm start`)
- [ ] API respondiendo (`/api/health`)

