# 📝 Guía Paso a Paso: Crear Repositorio en GitHub

## ⚙️ Paso 1: Configurar Git (Primera vez)

Abre PowerShell y ejecuta estos comandos (reemplaza con tu información):

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

**Ejemplo:**
```powershell
git config --global user.name "Nicolas"
git config --global user.email "nicolas@ejemplo.com"
```

⚠️ **IMPORTANTE**: Usa el mismo email que usaste para crear tu cuenta en GitHub.

---

## 🌐 Paso 2: Crear Repositorio en GitHub

### 2.1 Ve a GitHub
1. Abre tu navegador
2. Ve a: **https://github.com/new**
3. Si no has iniciado sesión, hazlo primero

### 2.2 Llena el formulario
- **Repository name**: `likering-backend` (o el nombre que prefieras)
- **Description** (opcional): `Backend API para Likering - Node.js + Express + PostgreSQL`
- **Visibility**: 
  - ✅ **Public** (cualquiera puede verlo) - Recomendado para empezar
  - ⚠️ **Private** (solo tú puedes verlo) - Si quieres mantenerlo privado

### 2.3 NO marques estas opciones:
- ❌ Add a README file (ya tenemos README.md)
- ❌ Add .gitignore (ya tenemos .gitignore)
- ❌ Choose a license (opcional, puedes agregarlo después)

### 2.4 Clic en "Create repository"

---

## 💻 Paso 3: Conectar tu Proyecto Local con GitHub

Después de crear el repositorio, GitHub te mostrará una página con instrucciones. 

**NO sigas esas instrucciones todavía.** En su lugar, ejecuta estos comandos en PowerShell:

### 3.1 Inicializar Git en tu proyecto
```powershell
git init
```

### 3.2 Agregar todos los archivos
```powershell
git add .
```

### 3.3 Hacer el primer commit
```powershell
git commit -m "Initial commit - Likering backend"
```

### 3.4 Cambiar a rama main (si es necesario)
```powershell
git branch -M main
```

### 3.5 Conectar con GitHub
**Reemplaza `TU-USUARIO` y `TU-REPO` con tus datos reales:**

```powershell
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
```

**Ejemplo:**
```powershell
git remote add origin https://github.com/nicolas/likering-backend.git
```

### 3.6 Subir el código a GitHub
```powershell
git push -u origin main
```

**Si te pide usuario y contraseña:**
- Usuario: Tu nombre de usuario de GitHub
- Contraseña: **NO uses tu contraseña normal**, usa un **Personal Access Token**

---

## 🔑 Paso 4: Crear Personal Access Token (si te lo pide)

Si Git te pide autenticación:

1. Ve a: **https://github.com/settings/tokens**
2. Clic en **"Generate new token"** → **"Generate new token (classic)"**
3. Llena el formulario:
   - **Note**: `Render Deployment` (o cualquier nombre)
   - **Expiration**: Elige cuánto tiempo quieres que dure (90 días, 1 año, etc.)
   - **Select scopes**: Marca ✅ **`repo`** (esto da acceso completo a repositorios)
4. Clic en **"Generate token"**
5. **COPIA EL TOKEN** (solo lo verás una vez)
6. Cuando Git te pida contraseña, pega este token en lugar de tu contraseña

---

## ✅ Paso 5: Verificar que Funcionó

1. Ve a tu repositorio en GitHub: `https://github.com/TU-USUARIO/TU-REPO`
2. Deberías ver todos tus archivos ahí
3. ¡Listo! Tu código está en GitHub

---

## 🚀 Siguiente Paso: Desplegar en Render

Una vez que tu código esté en GitHub, puedes seguir con la guía `RENDER_DEPLOY.md` para desplegar en Render.com.

---

## 🆘 Solución de Problemas

### Error: "fatal: not a git repository"
- Ejecuta `git init` primero

### Error: "remote origin already exists"
- Ejecuta: `git remote remove origin`
- Luego vuelve a ejecutar: `git remote add origin https://github.com/TU-USUARIO/TU-REPO.git`

### Error: "authentication failed"
- Usa un Personal Access Token en lugar de tu contraseña
- Ve al Paso 4 para crear uno

### Error: "failed to push some refs"
- Ejecuta: `git pull origin main --allow-unrelated-histories`
- Luego: `git push -u origin main`

