# backend/ml/optimizer.py
import mysql.connector
import math
import os
from dotenv import load_dotenv
from collections import defaultdict

# Cargar variables de entorno
load_dotenv()

# Configuración de la base de datos desde .env
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', '12345Paez'),
    'database': os.getenv('DB_NAME', 'smartpath')
}

# Función para calcular distancia Haversine
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Radio de la Tierra en km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# Algoritmo del vecino más cercano
def nearest_neighbor(points):
    if not points:
        return []
    unvisited = list(points.keys())
    current = unvisited.pop(0)
    route = [current]
    while unvisited:
        nearest = min(unvisited, key=lambda p: haversine(points[current][0], points[current][1], points[p][0], points[p][1]))
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    return route

# Calcular distancia total de una ruta
def calculate_total_distance(route, points):
    total = 0
    for i in range(len(route) - 1):
        lat1, lon1 = points[route[i]]
        lat2, lon2 = points[route[i+1]]
        total += haversine(lat1, lon1, lat2, lon2)
    return total

# Calcular tiempo total estimado
def calculate_total_time(route, store_times):
    return sum(store_times.get(store_id, 0) for store_id in route)

def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    try:
        # Crear tabla si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS optimization_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                route_id INT,
                advisor_id INT,
                original_distance FLOAT,
                optimized_distance FLOAT,
                original_time FLOAT,
                optimized_time FLOAT,
                distance_improvement FLOAT,
                time_improvement FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Obtener tiempos históricos por tienda
        cursor.execute("""
            SELECT store_id, AVG(actual_duration) as avg_time
            FROM route_stores
            WHERE status = 'completed' AND actual_duration > 0
            GROUP BY store_id
        """)
        store_times = {row['store_id']: row['avg_time'] for row in cursor.fetchall()}

        # Obtener rutas completadas
        cursor.execute("SELECT id, advisor_id FROM routes WHERE status = 'completed'")
        routes = cursor.fetchall()

        advisor_summary = defaultdict(lambda: {'routes': 0, 'dist_improv': 0, 'time_improv': 0})

        print("🚀 Iniciando optimización de rutas...")
        print(f"📊 Procesando {len(routes)} rutas completadas\n")

        for route in routes:
            route_id = route['id']
            advisor_id = route['advisor_id']

            # Obtener tiendas de la ruta con coordenadas
            cursor.execute("""
                SELECT s.id, s.latitude, s.longitude, rs.visit_order
                FROM route_stores rs
                JOIN stores s ON rs.store_id = s.id
                WHERE rs.route_id = %s
                ORDER BY rs.visit_order
            """, (route_id,))
            stores = cursor.fetchall()

            if len(stores) < 2:
                continue  # Necesita al menos 2 tiendas

            # Crear diccionario de puntos
            points = {store['id']: (store['latitude'], store['longitude']) for store in stores}
            original_route = [store['id'] for store in stores]

            # Calcular ruta original
            original_distance = calculate_total_distance(original_route, points)
            original_time = calculate_total_time(original_route, store_times)

            # Optimizar ruta
            optimized_route = nearest_neighbor(points)
            optimized_distance = calculate_total_distance(optimized_route, points)
            optimized_time = calculate_total_time(optimized_route, store_times)

            # Calcular mejoras
            distance_improvement = ((original_distance - optimized_distance) / original_distance) * 100 if original_distance > 0 else 0
            time_improvement = ((original_time - optimized_time) / original_time) * 100 if original_time > 0 else 0

            # Guardar en DB
            cursor.execute("""
                INSERT INTO optimization_results
                (route_id, advisor_id, original_distance, optimized_distance, original_time, optimized_time, distance_improvement, time_improvement)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (route_id, advisor_id, original_distance, optimized_distance, original_time, optimized_time, distance_improvement, time_improvement))

            # Actualizar resumen por asesor
            advisor_summary[advisor_id]['routes'] += 1
            advisor_summary[advisor_id]['dist_improv'] += distance_improvement
            advisor_summary[advisor_id]['time_improv'] += time_improvement

            print(f"✅ Ruta {route_id} (Asesor {advisor_id}):")
            print(f"   Distancia: {original_distance:.2f}km → {optimized_distance:.2f}km ({distance_improvement:.1f}%)")
            print(f"   Tiempo: {original_time:.1f}min → {optimized_time:.1f}min ({time_improvement:.1f}%)")

        conn.commit()

        # Imprimir resumen por asesor
        print("\n📈 Resumen de optimización por asesor:")
        for advisor_id, data in advisor_summary.items():
            if data['routes'] > 0:
                avg_dist_improv = data['dist_improv'] / data['routes']
                avg_time_improv = data['time_improv'] / data['routes']
                print(f"👤 Asesor {advisor_id}: {data['routes']} rutas, Mejora distancia: {avg_dist_improv:.2f}%, Mejora tiempo: {avg_time_improv:.2f}%")

        print("\n🎉 Optimización completada exitosamente!")

    except mysql.connector.Error as err:
        print(f"❌ Error de MySQL: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()