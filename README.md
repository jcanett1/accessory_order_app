# Gestión de Órdenes de Accesorios

Este proyecto es una aplicación web para la gestión de órdenes de accesorios, que permite:

- Agregar nuevas órdenes con múltiples accesorios y sus cantidades.
- Marcar órdenes como cerradas (accesorios agregados/no agregados).
- Buscar y filtrar órdenes por número de orden y fecha.
- Exportar la lista de órdenes a Excel y PDF.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

- `backend/`: Contiene la aplicación Flask (Python) que actúa como API y sirve los archivos estáticos del frontend.
- `frontend/`: Contiene la aplicación React (JavaScript) que proporciona la interfaz de usuario.

## Configuración y Ejecución Local

### Requisitos Previos

- Python 3.x
- Node.js y npm (o pnpm)

### Backend (Flask)

1.  Navega al directorio `backend`:
    ```bash
    cd accessory_order_app/backend
    ```
2.  Instala las dependencias de Python:
    ```bash
    pip install -r requirements.txt
    ```
3.  Ejecuta la aplicación Flask:
    ```bash
    python src/main.py
    ```
    El backend se ejecutará en `http://localhost:5000` (o el puerto configurado en `src/main.py`).

### Frontend (React)

1.  Navega al directorio `frontend`:
    ```bash
    cd accessory_order_app/frontend
    ```
2.  Instala las dependencias de Node.js:
    ```bash
    npm install # o pnpm install
    ```
3.  Inicia la aplicación React en modo desarrollo:
    ```bash
    npm run dev # o pnpm run dev
    ```
    El frontend se ejecutará en `http://localhost:5173` (o un puerto similar).

## Integración con Supabase

Para integrar este proyecto con Supabase, necesitarás realizar los siguientes cambios:

### 1. Configuración de Supabase

1.  Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2.  En la sección "Database", crea una tabla llamada `orders` con la siguiente estructura:

    | Columna           | Tipo      | Restricciones         |
    | :---------------- | :-------- | :-------------------- |
    | `id`              | `int8`    | Primary Key           |
    | `order_number`    | `text`    | Unique, Not Null      |
    | `extra_accessory` | `boolean` | Not Null              |
    | `selected`        | `boolean` | Not Null              |
    | `order_date`      | `text`    | Not Null              |
    | `is_closed`       | `boolean` | Default: `false`      |
    | `accessories_added` | `boolean` | Default: `false`      |

3.  Crea una tabla llamada `order_accessories` con la siguiente estructura:

    | Columna         | Tipo   | Restricciones                               |
    | :-------------- | :----- | :------------------------------------------ |
    | `id`            | `int8` | Primary Key                                 |
    | `order_id`      | `int8` | Not Null, Foreign Key to `orders(id)`       |
    | `accessory_type` | `text` | Not Null                                    |
    | `quantity`      | `int4` | Not Null                                    |

### 2. Modificaciones en el Backend (Flask)

Actualmente, el backend utiliza SQLite. Para conectarlo a Supabase (PostgreSQL), necesitarás:

1.  **Instalar un conector PostgreSQL**: Desinstala `sqlite3` (si lo tenías como dependencia explícita) e instala `psycopg2-binary`.
    ```bash
    pip uninstall sqlite3 # Si aplica
    pip install psycopg2-binary
    ```
    Asegúrate de añadir `psycopg2-binary` a `requirements.txt`.

2.  **Actualizar la conexión a la base de datos**: Modifica `src/main.py` para usar `psycopg2` en lugar de `sqlite3` y conéctate a tu base de datos Supabase usando las credenciales proporcionadas en tu proyecto Supabase (Host, Port, Database, User, Password).

    ```python
    import psycopg2
    from flask import Flask, request, jsonify, render_template, g
    from datetime import datetime
    import pandas as pd
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    import os

    app = Flask(__name__, static_folder=\'src/static\', template_folder=\'src/templates\')
    app.config[\'DATABASE\'] = os.environ.get(\'DATABASE_URL\', \'postgresql://user:password@host:port/database\') # Reemplaza con tus credenciales de Supabase

    def get_db():
        if \'db\' not in g:
            g.db = psycopg2.connect(app.config[\'DATABASE\'])
        return g.db

    @app.teardown_appcontext
    def close_db(e=None):
        db = g.pop(\'db\', None)
        if db is not None:
            db.close()

    def init_db():
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute(\'\'\'
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    order_number TEXT NOT NULL UNIQUE,
                    extra_accessory BOOLEAN NOT NULL,
                    selected BOOLEAN NOT NULL,
                    order_date TEXT NOT NULL,
                    is_closed BOOLEAN DEFAULT FALSE,
                    accessories_added BOOLEAN DEFAULT FALSE
                )
            \'\'\')
            cursor.execute(\'\'\'
                CREATE TABLE IF NOT EXISTS order_accessories (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
                    accessory_type TEXT NOT NULL,
                    quantity INTEGER NOT NULL
                )
            \'\'\')
            db.commit()

    # ... (el resto de tus rutas y lógica de la aplicación)

    if __name__ == \'__main__\':
        init_db() # Asegúrate de inicializar la DB al inicio
        app.run(debug=True, host=\'0.0.0.0\')
    ```

3.  **Adaptar las consultas SQL**: Las consultas SQL en `src/main.py` deberán adaptarse ligeramente para PostgreSQL. Por ejemplo, `LAST_INSERT_ROWID()` en SQLite se reemplaza por `RETURNING id` en PostgreSQL para obtener el ID de la fila insertada.

    ```python
    # Ejemplo de inserción en orders
    cursor.execute(
        "INSERT INTO orders (order_number, extra_accessory, selected, order_date) VALUES (%s, %s, %s, %s) RETURNING id",
        (order_number, extra_accessory, selected, order_date)
    )
    order_id = cursor.fetchone()[0]

    # Ejemplo de inserción en order_accessories
    cursor.execute(
        "INSERT INTO order_accessories (order_id, accessory_type, quantity) VALUES (%s, %s, %s)",
        (order_id, accessory_type, quantity)
    )
    ```

### 3. Modificaciones en el Frontend (React)

Si el frontend está haciendo llamadas a la API de Flask usando rutas relativas (ej. `/api/add_order`), no necesitarás cambiar nada en el código del frontend, ya que el despliegue de Supabase/Vercel/Render se encargará de enrutar las peticiones correctamente. Si usaste `localhost` para pruebas, asegúrate de haber revertido a rutas relativas.

## Despliegue

### GitHub

1.  Crea un nuevo repositorio en GitHub.
2.  Inicializa un repositorio Git en la raíz de tu proyecto (`accessory_order_app`):
    ```bash
    cd accessory_order_app
    git init
    git add .
    git commit -m "Initial commit: Accessory Order Management App"
    ```
3.  Conecta tu repositorio local con el de GitHub y sube el código:
    ```bash
    git remote add origin <URL_DE_TU_REPOSITORIO_GITHUB>
    git push -u origin master
    ```

### Supabase (para el Backend/API)

Supabase no aloja directamente aplicaciones Flask. Puedes desplegar tu backend Flask en plataformas como [Render](https://render.com/), [Vercel](https://vercel.com/) (si lo configuras como Serverless Function), o [Heroku](https://www.heroku.com/).

**Pasos generales para Render (ejemplo):**

1.  Crea una cuenta en Render.
2.  Conecta tu repositorio de GitHub.
3.  Crea un nuevo "Web Service" y selecciona tu repositorio.
4.  Configura el "Build Command" (ej. `pip install -r requirements.txt`) y el "Start Command" (ej. `gunicorn main:app` o `python src/main.py`).
5.  Añade las variables de entorno de Supabase (DATABASE_URL) en la configuración de Render.

### Vercel (para el Frontend)

El frontend de React puede ser desplegado fácilmente en Vercel:

1.  Crea una cuenta en Vercel.
2.  Conecta tu repositorio de GitHub.
3.  Importa tu proyecto React.
4.  Vercel detectará automáticamente que es una aplicación React y la desplegará.

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, abre un issue o envía un pull request.

## Licencia

Este proyecto está bajo la licencia MIT. (Puedes cambiarla si lo deseas)

---

**Autor:** Manus AI


