# Guía de Configuración para GitHub y Supabase

## ¿Qué archivos subir a GitHub?

### ✅ INCLUIR en GitHub:

**Archivos de código fuente:**
- `frontend/src/` - Todo el código React
- `backend/src/` - Código Python de la API
- `backend/app.py` - Archivo principal de Flask
- `backend/requirements.txt` - Dependencias de Python
- `frontend/package.json` - Dependencias de Node.js
- `frontend/pnpm-lock.yaml` - Lock file de dependencias

**Archivos de configuración:**
- `frontend/vite.config.js` - Configuración de Vite
- `frontend/eslint.config.js` - Configuración de ESLint
- `frontend/components.json` - Configuración de componentes
- `frontend/jsconfig.json` - Configuración de JavaScript
- `frontend/index.html` - Archivo HTML principal
- `backend/templates/` - Templates de Flask (si los hay)
- `.gitignore` - Archivo que creé para ignorar archivos innecesarios

**Documentación:**
- `README.md` - Documentación del proyecto
- `GITHUB_SETUP.md` - Esta guía

### ❌ NO INCLUIR en GitHub:

**Archivos generados automáticamente:**
- `frontend/dist/` - Build del frontend (se genera automáticamente)
- `backend/static/` - Archivos estáticos copiados del frontend
- `node_modules/` - Dependencias de Node.js (se instalan con npm/pnpm)
- `__pycache__/` - Cache de Python

**Archivos de base de datos:**
- `backend/orders.db` - Base de datos SQLite local (no necesaria con Supabase)

**Archivos sensibles:**
- `.env` - Variables de entorno (contienen credenciales)
- Cualquier archivo con credenciales o API keys

## Pasos para subir a GitHub:

### 1. Preparar el repositorio local:
```bash
cd accessory_order_app
git init
git add .
git commit -m "Initial commit: Accessory Order Management App"
```

### 2. Crear repositorio en GitHub:
1. Ve a GitHub.com
2. Clic en "New repository"
3. Nombra tu repositorio (ej: "accessory-order-app")
4. NO inicialices con README (ya tienes uno)
5. Crea el repositorio

### 3. Conectar y subir:
```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

## Configuración para Supabase:

### 1. Crear proyecto en Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Guarda las credenciales de conexión

### 2. Crear las tablas en Supabase:
Ejecuta este SQL en el editor de Supabase:

```sql
-- Tabla de órdenes
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    extra_accessory BOOLEAN NOT NULL,
    selected BOOLEAN NOT NULL,
    order_date TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    accessories_added BOOLEAN DEFAULT FALSE
);

-- Tabla de accesorios por orden
CREATE TABLE order_accessories (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    accessory_type TEXT NOT NULL,
    quantity INTEGER NOT NULL
);
```

### 3. Configurar variables de entorno:
Crea un archivo `.env` en la raíz del proyecto (NO lo subas a GitHub):

```env
# Credenciales de Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
DATABASE_URL=postgresql://postgres:[TU_PASSWORD]@db.[TU_PROJECT_REF].supabase.co:5432/postgres
```

### 4. Modificar el backend para Supabase:
- Instalar psycopg2: `pip install psycopg2-binary`
- Actualizar `requirements.txt`
- Modificar `backend/src/main.py` para usar PostgreSQL en lugar de SQLite

## Estructura final del repositorio en GitHub:

```
accessory_order_app/
├── .gitignore
├── README.md
├── GITHUB_SETUP.md
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── src/
│   │   └── main.py
│   └── templates/
└── frontend/
    ├── package.json
    ├── pnpm-lock.yaml
    ├── vite.config.js
    ├── eslint.config.js
    ├── components.json
    ├── jsconfig.json
    ├── index.html
    ├── public/
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        └── ...
```

## Comandos útiles para desarrollo:

### Frontend:
```bash
cd frontend
pnpm install          # Instalar dependencias
pnpm run dev          # Servidor de desarrollo
pnpm run build        # Build para producción
```

### Backend:
```bash
cd backend
pip install -r requirements.txt    # Instalar dependencias
python src/main.py                 # Ejecutar servidor Flask
```

## Notas importantes:

1. **No subas la base de datos SQLite** - Usarás Supabase como base de datos
2. **No subas archivos .env** - Contienen credenciales sensibles
3. **No subas la carpeta dist/** - Se genera automáticamente
4. **Mantén actualizado el .gitignore** - Para evitar subir archivos innecesarios
5. **Usa ramas para nuevas funcionalidades** - `git checkout -b nueva-funcionalidad`

¡Tu proyecto estará listo para desarrollo colaborativo y despliegue con Supabase!

