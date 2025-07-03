"""
Backend Flask modificado para usar Supabase con variables de entorno
Versión mejorada que usa python-dotenv para cargar variables de entorno
"""
from flask import Flask, request, jsonify, render_template, g, send_from_directory
from flask_cors import CORS
from datetime import datetime
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Cargar variables de entorno desde archivo .env
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Habilitar CORS para todas las rutas

# Configuración desde variables de entorno
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ujibmyclnhouogevzxcl.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaWJteWNsbmhvdW9nZXZ6eGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTMyODksImV4cCI6MjA2NzA2OTI4OX0.GrKEUV6HOSmBauj1lHu3z_l8rqmfWZuSVi1mIREB22I')
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL no está configurada en las variables de entorno")
    print("Por favor, configura tu archivo .env con la URL de conexión a Supabase")
    exit(1)

def get_db():
    """Obtiene una conexión a la base de datos"""
    if 'db' not in g:
        try:
            g.db = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        except Exception as e:
            print(f"Error conectando a Supabase: {e}")
            return None
    return g.db

@app.teardown_appcontext
def close_db(error):
    """Cierra la conexión a la base de datos"""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Inicializa las tablas de la base de datos (opcional, ya las creaste en Supabase)"""
    db = get_db()
    if db is None:
        return False
    
    cursor = db.cursor()
    try:
        # Verificar si las tablas existen
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('orders', 'order_accessories')
        """)
        tables = cursor.fetchall()
        
        print(f"Tablas encontradas: {len(tables)}")
        
        if len(tables) < 2:
            print("Creando tablas...")
            # Crear tabla orders
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    order_number TEXT NOT NULL UNIQUE,
                    extra_accessory BOOLEAN NOT NULL,
                    selected BOOLEAN NOT NULL,
                    order_date TEXT NOT NULL,
                    is_closed BOOLEAN DEFAULT FALSE,
                    accessories_added BOOLEAN DEFAULT FALSE
                )
            ''')
            
            # Crear tabla order_accessories
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS order_accessories (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
                    accessory_type TEXT NOT NULL,
                    quantity INTEGER NOT NULL
                )
            ''')
            
            db.commit()
            print("Tablas creadas exitosamente")
        else:
            print("Las tablas ya existen")
        
        return True
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")
        db.rollback()
        return False
    finally:
        cursor.close()

@app.route('/')
def index():
    """Ruta principal - sirve el frontend"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/add_order', methods=['POST'])
def add_order():
    """Agregar una nueva orden"""
    try:
        data = request.json
        order_number = data.get('order_number')
        extra_accessory = data.get('extra_accessory', False)
        selected = data.get('selected', False)
        accessories = data.get('accessories', [])
        order_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if not order_number:
            return jsonify({'error': 'Número de orden es requerido'}), 400
        
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        
        # Verificar si la orden ya existe
        cursor.execute("SELECT id FROM orders WHERE order_number = %s", (order_number,))
        if cursor.fetchone():
            return jsonify({'error': 'El número de orden ya existe'}), 400
        
        # Insertar orden
        cursor.execute(
            "INSERT INTO orders (order_number, extra_accessory, selected, order_date) VALUES (%s, %s, %s, %s) RETURNING id",
            (order_number, extra_accessory, selected, order_date)
        )
        order_id = cursor.fetchone()['id']
        
        # Insertar accesorios
        for accessory in accessories:
            if accessory.get('type') and accessory.get('quantity'):
                cursor.execute(
                    "INSERT INTO order_accessories (order_id, accessory_type, quantity) VALUES (%s, %s, %s)",
                    (order_id, accessory['type'], accessory['quantity'])
                )
        
        db.commit()
        cursor.close()
        
        return jsonify({'message': 'Orden agregada exitosamente', 'order_id': order_id}), 201
        
    except Exception as e:
        if 'db' in locals() and db:
            db.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Obtener todas las órdenes"""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        
        # Obtener órdenes con sus accesorios
        cursor.execute('''
            SELECT o.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'type', oa.accessory_type,
                               'quantity', oa.quantity
                           )
                       ) FILTER (WHERE oa.id IS NOT NULL), 
                       '[]'::json
                   ) as accessories
            FROM orders o
            LEFT JOIN order_accessories oa ON o.id = oa.order_id
            GROUP BY o.id
            ORDER BY o.order_date DESC
        ''')
        
        orders = cursor.fetchall()
        cursor.close()
        
        # Convertir a lista de diccionarios
        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append(order_dict)
        
        return jsonify(orders_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/close', methods=['PUT'])
def close_order(order_id):
    """Cerrar una orden"""
    try:
        data = request.json
        accessories_added = data.get('accessories_added', False)
        
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        
        cursor.execute(
            "UPDATE orders SET is_closed = TRUE, accessories_added = %s WHERE id = %s",
            (accessories_added, order_id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Orden no encontrada'}), 404
        
        db.commit()
        cursor.close()
        
        return jsonify({'message': 'Orden cerrada exitosamente'}), 200
        
    except Exception as e:
        if 'db' in locals() and db:
            db.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/search', methods=['GET'])
def search_orders():
    """Buscar órdenes por número o fecha"""
    try:
        query = request.args.get('q', '')
        date_filter = request.args.get('date', '')
        
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        
        sql = '''
            SELECT o.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'type', oa.accessory_type,
                               'quantity', oa.quantity
                           )
                       ) FILTER (WHERE oa.id IS NOT NULL), 
                       '[]'::json
                   ) as accessories
            FROM orders o
            LEFT JOIN order_accessories oa ON o.id = oa.order_id
            WHERE 1=1
        '''
        params = []
        
        if query:
            sql += " AND o.order_number ILIKE %s"
            params.append(f'%{query}%')
        
        if date_filter:
            sql += " AND DATE(o.order_date) = %s"
            params.append(date_filter)
        
        sql += " GROUP BY o.id ORDER BY o.order_date DESC"
        
        cursor.execute(sql, params)
        orders = cursor.fetchall()
        cursor.close()
        
        # Convertir a lista de diccionarios
        orders_list = []
        for order in orders:
            order_dict = dict(order)
            orders_list.append(order_dict)
        
        return jsonify(orders_list), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/excel', methods=['GET'])
def export_excel():
    """Exportar órdenes a Excel"""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        cursor.execute('''
            SELECT o.order_number, o.extra_accessory, o.selected, 
                   o.order_date, o.is_closed, o.accessories_added,
                   oa.accessory_type, oa.quantity
            FROM orders o
            LEFT JOIN order_accessories oa ON o.id = oa.order_id
            ORDER BY o.order_date DESC
        ''')
        
        data = cursor.fetchall()
        cursor.close()
        
        if not data:
            return jsonify({'error': 'No hay datos para exportar'}), 404
        
        # Convertir a DataFrame
        df = pd.DataFrame(data)
        
        # Guardar como Excel
        filename = f'orders_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        filepath = os.path.join('/tmp', filename)
        df.to_excel(filepath, index=False)
        
        return send_from_directory('/tmp', filename, as_attachment=True)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export/pdf', methods=['GET'])
def export_pdf():
    """Exportar órdenes a PDF"""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = db.cursor()
        cursor.execute('''
            SELECT o.order_number, o.extra_accessory, o.selected, 
                   o.order_date, o.is_closed, o.accessories_added
            FROM orders o
            ORDER BY o.order_date DESC
        ''')
        
        orders = cursor.fetchall()
        cursor.close()
        
        if not orders:
            return jsonify({'error': 'No hay datos para exportar'}), 404
        
        # Crear PDF
        filename = f'orders_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        filepath = os.path.join('/tmp', filename)
        
        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter
        
        # Título
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "Reporte de Órdenes")
        
        # Encabezados
        y = height - 100
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, "Número de Orden")
        c.drawString(150, y, "Accesorio Extra")
        c.drawString(250, y, "Seleccionado")
        c.drawString(350, y, "Fecha")
        c.drawString(450, y, "Cerrado")
        
        # Datos
        c.setFont("Helvetica", 9)
        y -= 20
        for order in orders:
            if y < 50:  # Nueva página si es necesario
                c.showPage()
                y = height - 50
            
            c.drawString(50, y, str(order['order_number']))
            c.drawString(150, y, "Sí" if order['extra_accessory'] else "No")
            c.drawString(250, y, "Sí" if order['selected'] else "No")
            c.drawString(350, y, str(order['order_date'])[:10])
            c.drawString(450, y, "Sí" if order['is_closed'] else "No")
            y -= 15
        
        c.save()
        
        return send_from_directory('/tmp', filename, as_attachment=True)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Verificar el estado de la aplicación y conexión a Supabase"""
    try:
        db = get_db()
        if db is None:
            return jsonify({'status': 'error', 'message': 'No se puede conectar a la base de datos'}), 500
        
        cursor = db.cursor()
        cursor.execute('SELECT 1')
        cursor.fetchone()
        cursor.close()
        
        return jsonify({
            'status': 'ok', 
            'message': 'Aplicación funcionando correctamente',
            'database': 'Supabase conectado',
            'supabase_url': SUPABASE_URL
        }), 200
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Inicializando aplicación...")
    print(f"Conectando a Supabase: {SUPABASE_URL}")
    print(f"DATABASE_URL configurada: {'Sí' if DATABASE_URL else 'No'}")
    
    # Inicializar base de datos
    with app.app_context():
        if init_db():
            print("Base de datos inicializada correctamente")
        else:
            print("Error inicializando base de datos")
    
    # Ejecutar aplicación
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)

