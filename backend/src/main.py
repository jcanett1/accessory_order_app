from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
import json
import io
import os

app = Flask(__name__)
CORS(app)

# Use absolute path for database
DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'orders.db')

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Create new orders table with updated schema
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL UNIQUE,
                extra_accessory BOOLEAN NOT NULL,
                selected BOOLEAN NOT NULL,
                order_date TEXT NOT NULL,
                is_closed BOOLEAN DEFAULT FALSE,
                accessories_added BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # Create accessories table for multiple accessories per order
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_accessories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                accessory_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )
        ''')
        
        db.commit()
        db.close()
    except Exception as e:
        print(f"Database initialization error: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/add_order', methods=['POST'])
def add_order():
    try:
        data = request.get_json()
        order_number = data['order_number']
        accessories = data['accessories']  # List of {accessory_type, quantity}
        extra_accessory = data['extra_accessory']
        selected = data['selected']
        order_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        db = get_db()
        cursor = db.cursor()
        
        # Check if order already exists
        cursor.execute("SELECT id FROM orders WHERE order_number = ?", (order_number,))
        existing_order = cursor.fetchone()
        
        if existing_order:
            # Add accessories to existing order
            order_id = existing_order['id']
            for accessory in accessories:
                cursor.execute('''
                    INSERT INTO order_accessories (order_id, accessory_type, quantity)
                    VALUES (?, ?, ?)
                ''', (order_id, accessory['accessory_type'], accessory['quantity']))
        else:
            # Create new order
            cursor.execute('''
                INSERT INTO orders (order_number, extra_accessory, selected, order_date, is_closed, accessories_added)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (order_number, extra_accessory, selected, order_date, False, False))
            
            order_id = cursor.lastrowid
            
            # Add accessories to new order
            for accessory in accessories:
                cursor.execute('''
                    INSERT INTO order_accessories (order_id, accessory_type, quantity)
                    VALUES (?, ?, ?)
                ''', (order_id, accessory['accessory_type'], accessory['quantity']))
        
        db.commit()
        db.close()
        return jsonify({'message': 'Order added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/close_order', methods=['POST'])
def close_order():
    try:
        data = request.get_json()
        order_id = data['order_id']
        accessories_added = data['accessories_added']

        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE orders SET is_closed = ?, accessories_added = ? WHERE id = ?",
            (True, accessories_added, order_id)
        )
        db.commit()
        db.close()
        return jsonify({'message': 'Order closed successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_orders', methods=['GET'])
def get_orders():
    try:
        search_term = request.args.get('search', '')
        date_filter = request.args.get('date', '')
        
        db = get_db()
        cursor = db.cursor()
        
        # Get orders with their accessories
        query = '''
            SELECT o.*, 
                   GROUP_CONCAT(oa.accessory_type || ':' || oa.quantity) as accessories_data
            FROM orders o
            LEFT JOIN order_accessories oa ON o.id = oa.order_id
            WHERE 1=1
        '''
        params = []
        
        if search_term:
            query += " AND o.order_number LIKE ?"
            params.append(f"%{search_term}%")
        
        if date_filter:
            query += " AND o.order_date LIKE ?"
            params.append(f"%{date_filter}%")
        
        query += " GROUP BY o.id ORDER BY o.order_date DESC"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        # Process the results to include accessories
        result = []
        for order in orders:
            order_dict = dict(order)
            accessories = []
            
            if order['accessories_data']:
                for acc_data in order['accessories_data'].split(','):
                    if ':' in acc_data:
                        acc_type, quantity = acc_data.split(':')
                        accessories.append({
                            'accessory_type': acc_type,
                            'quantity': int(quantity)
                        })
            
            order_dict['accessories'] = accessories
            del order_dict['accessories_data']
            result.append(order_dict)
        
        db.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export_excel', methods=['GET'])
def export_excel():
    return jsonify({'message': 'Excel export not available in production'}), 501

@app.route('/api/export_pdf', methods=['GET'])
def export_pdf():
    return jsonify({'message': 'PDF export not available in production'}), 501

# Initialize database when module is imported
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')


