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
        
        # Crear tabla si no existe con la estructura correcta
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL,
                accessory_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                extra_accessory BOOLEAN NOT NULL,
                celda BOOLEAN NOT NULL,
                order_date TEXT NOT NULL,
                is_closed BOOLEAN DEFAULT FALSE,
                accessories_added BOOLEAN DEFAULT FALSE
            )
        ''')
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/add_order', methods=['POST'])
def add_order():
    data = request.get_json()
    try:
        # Validar datos requeridos
        required_fields = ['order_number', 'accessory_type', 'quantity', 'extra_accessory', 'celda']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Faltan campos requeridos'}), 400

        # Convertir valor de celda a booleano si es necesario
        celda_value = bool(data['celda']) if isinstance(data['celda'], (bool, int)) else data['celda'].lower() in ('true', '1', 'celda 10', 'celda 11')

        db = get_db()
        cursor = db.cursor()
        
        cursor.execute(
            "INSERT INTO orders (order_number, accessory_type, quantity, extra_accessory, celda, order_date) VALUES (?, ?, ?, ?, ?, ?)",
            (
                data['order_number'],
                data['accessory_type'],
                data['quantity'],
                data['extra_accessory'],
                celda_value,
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
    
    query = "SELECT * FROM orders WHERE 1=1"
    params = []
    
    if search_term:
        query += " AND order_number LIKE ?"
        params.append(f"%{search_term}%")
    
    if date_filter:
        query += " AND order_date LIKE ?"
        params.append(f"%{date_filter}%")
    
    cursor.execute(query, params)
    orders = cursor.fetchall()
    return jsonify([dict(row) for row in orders])

@app.route('/api/export_excel', methods=['GET'])
def export_excel():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders")
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
    cursor.execute("SELECT * FROM orders")
    orders = cursor.fetchall()
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    # Create table data
    data = [['ID', 'Número de Orden', 'Tipo de Accesorio', 'Cantidad', 'Accesorio Extra', 'Celda', 'Fecha']]
    
    for order in orders:
        data.append([
            str(order['id']),
            order['order_number'],
            order['accessory_type'],
            str(order['quantity']),
            'Sí' if order['extra_accessory'] else 'No',
            'Sí' if order['celda'] else 'No',
            order['order_date']
        ])
    
    # Create table
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
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
