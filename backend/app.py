from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'orders.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # ✅ ACTUALIZADO: Crear tabla con columna 'celda' como TEXT para almacenar nombres de celda
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL,
                accessory_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                extra_accessory BOOLEAN NOT NULL,
                celda TEXT NOT NULL,
                order_date TEXT NOT NULL,
                is_closed BOOLEAN DEFAULT FALSE,
                accessories_added BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # ✅ NUEVO: Verificar si existe la columna 'selected' y migrar datos si es necesario
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'selected' in columns and 'celda' not in columns:
            # Migrar de 'selected' a 'celda'
            cursor.execute('ALTER TABLE orders ADD COLUMN celda TEXT DEFAULT "No especificada"')
            cursor.execute('UPDATE orders SET celda = CASE WHEN selected = 1 THEN "Celda 10" ELSE "No especificada" END')
            print("✅ Migración completada: columna 'selected' → 'celda'")
        
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/add_order', methods=['POST'])
def add_order():
    data = request.get_json()
    try:
        # ✅ ACTUALIZADO: Validar datos requeridos con nueva estructura
        required_fields = ['order_number', 'accessories', 'extra_accessory', 'celda']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Faltan campos requeridos'}), 400

        # ✅ NUEVO: Validar que celda sea una de las opciones válidas
        valid_celdas = ['Celda 10', 'Celda 11', 'Celda 15', 'Celda 16']
        if data['celda'] not in valid_celdas:
            return jsonify({'error': f'Celda inválida. Opciones válidas: {", ".join(valid_celdas)}'}), 400

        db = get_db()
        cursor = db.cursor()
        
        # ✅ ACTUALIZADO: Insertar múltiples accesorios de una orden
        for accessory in data['accessories']:
            cursor.execute(
                "INSERT INTO orders (order_number, accessory_type, quantity, extra_accessory, celda, order_date) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    data['order_number'],
                    accessory['accessory_type'],
                    accessory['quantity'],
                    data['extra_accessory'],
                    data['celda'],  # ✅ CAMBIADO: usar 'celda' en lugar de 'selected'
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                )
            )
        
        db.commit()
        return jsonify({'message': 'Orden agregada exitosamente'}), 201
        
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/get_orders', methods=['GET'])
def get_orders():
    search_term = request.args.get('search', '')
    date_filter = request.args.get('date', '')
    
    db = get_db()
    cursor = db.cursor()
    
    # ✅ ACTUALIZADO: Agrupar accesorios por número de orden
    query = """
        SELECT 
            MIN(id) as id,
            order_number,
            GROUP_CONCAT(accessory_type || ' (x' || quantity || ')') as accessories,
            MAX(extra_accessory) as extra_accessory,
            MAX(celda) as celda,
            MAX(order_date) as order_date,
            MAX(is_closed) as is_closed,
            MAX(accessories_added) as accessories_added
        FROM orders 
        WHERE 1=1
    """
    params = []
    
    if search_term:
        query += " AND (order_number LIKE ? OR accessory_type LIKE ? OR celda LIKE ?)"
        params.extend([f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"])
    
    if date_filter:
        query += " AND order_date LIKE ?"
        params.append(f"%{date_filter}%")
    
    query += " GROUP BY order_number ORDER BY MAX(order_date) DESC"
    
    cursor.execute(query, params)
    orders = cursor.fetchall()
    
    # ✅ NUEVO: Formatear respuesta para compatibilidad con frontend
    formatted_orders = []
    for order in orders:
        formatted_order = dict(order)
        # Convertir string de accesorios a lista para compatibilidad
        if formatted_order['accessories']:
            accessories_list = []
            for acc_str in formatted_order['accessories'].split(','):
                # Parsear "bolsa (x2)" → {"accessory_type": "bolsa", "quantity": 2}
                if '(x' in acc_str and ')' in acc_str:
                    acc_type = acc_str.split(' (x')[0].strip()
                    quantity = int(acc_str.split('(x')[1].split(')')[0])
                    accessories_list.append({"accessory_type": acc_type, "quantity": quantity})
            formatted_order['accessories'] = accessories_list
        else:
            formatted_order['accessories'] = []
        
        formatted_orders.append(formatted_order)
    
    return jsonify(formatted_orders)

@app.route('/api/close_order', methods=['POST'])
def close_order():
    data = request.get_json()
    try:
        order_id = data.get('order_id')
        accessories_added = data.get('accessories_added', True)
        
        if not order_id:
            return jsonify({'error': 'ID de orden requerido'}), 400

        db = get_db()
        cursor = db.cursor()
        
        # ✅ ACTUALIZADO: Cerrar todas las entradas de la misma orden
        cursor.execute(
            "UPDATE orders SET is_closed = ?, accessories_added = ? WHERE order_number = (SELECT order_number FROM orders WHERE id = ?)",
            (True, accessories_added, order_id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Orden no encontrada'}), 404
            
        db.commit()
        return jsonify({'message': 'Orden cerrada exitosamente'}), 200
        
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/search_orders', methods=['GET'])
def search_orders():
    search_term = request.args.get('q', '')
    date_filter = request.args.get('date', '')
    
    # ✅ REUTILIZAR: Usar la misma lógica que get_orders
    return get_orders()

@app.route('/api/export_excel', methods=['GET'])
def export_excel():
    db = get_db()
    cursor = db.cursor()
    
    # ✅ ACTUALIZADO: Exportar con nueva estructura
    cursor.execute("""
        SELECT 
            order_number as 'Número de Orden',
            GROUP_CONCAT(accessory_type || ' (x' || quantity || ')') as 'Accesorios',
            CASE WHEN MAX(extra_accessory) = 1 THEN 'Sí' ELSE 'No' END as 'Accesorio Extra',
            MAX(celda) as 'Celda',
            MAX(order_date) as 'Fecha de Orden',
            CASE 
                WHEN MAX(is_closed) = 1 THEN 
                    CASE WHEN MAX(accessories_added) = 1 THEN 'Cerrada - Agregados' ELSE 'Cerrada - No Agregados' END
                ELSE 'Abierta'
            END as 'Estado'
        FROM orders 
        GROUP BY order_number 
        ORDER BY MAX(order_date) DESC
    """)
    orders = cursor.fetchall()
    
    # Convert to DataFrame
    df = pd.DataFrame([dict(row) for row in orders])
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Ordenes_Accesorios', index=False)
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'ordenes_accesorios_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    )

@app.route('/api/export_pdf', methods=['GET'])
def export_pdf():
    db = get_db()
    cursor = db.cursor()
    
    # ✅ ACTUALIZADO: Exportar con nueva estructura
    cursor.execute("""
        SELECT 
            order_number,
            GROUP_CONCAT(accessory_type || ' (x' || quantity || ')') as accessories,
            MAX(extra_accessory) as extra_accessory,
            MAX(celda) as celda,
            MAX(order_date) as order_date,
            MAX(is_closed) as is_closed,
            MAX(accessories_added) as accessories_added
        FROM orders 
        GROUP BY order_number 
        ORDER BY MAX(order_date) DESC
    """)
    orders = cursor.fetchall()
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    # ✅ ACTUALIZADO: Create table data con nueva estructura
    data = [['Número de Orden', 'Accesorios', 'Accesorio Extra', 'Celda', 'Fecha', 'Estado']]
    
    for order in orders:
        estado = 'Abierta'
        if order['is_closed']:
            estado = 'Cerrada - Agregados' if order['accessories_added'] else 'Cerrada - No Agregados'
            
        data.append([
            order['order_number'],
            order['accessories'] or '',
            'Sí' if order['extra_accessory'] else 'No',
            order['celda'] or 'No especificada',  # ✅ CAMBIADO: mostrar celda
            order['order_date'],
            estado
        ])
    
    # Create table
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    # Build PDF
    elements = []
    styles = getSampleStyleSheet()
    title = Paragraph("Reporte de Órdenes de Accesorios", styles['Title'])
    elements.append(title)
    elements.append(table)
    
    doc.build(elements)
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'ordenes_accesorios_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    )

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, host='0.0.0.0')

