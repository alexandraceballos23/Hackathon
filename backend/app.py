from flask import Flask, jsonify, request
from flask_cors import CORS
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Estado del juego
game_state = {
    "energy": 100,
    "pollution": 0,
    "health": 100,
    "level": 1,
    "score": 0,
    "missions_completed": 0,
    "current_mission": None,
    "buildings": {
        "solar_panels": {"active": True, "efficiency": 80},
        "wind_turbines": {"active": True, "efficiency": 70},
        "coal_plant": {"active": False, "efficiency": 90},
        "data_center": {"active": True, "consumption": 30},
        "city_lights": {"active": True, "consumption": 20},
        "factories": {"active": True, "consumption": 40}
    }
}

# Misiones disponibles
missions = [
    {
        "id": 1,
        "title": "Optimizar Paneles Solares",
        "description": "Ajusta la eficiencia de los paneles solares para maximizar la energía limpia",
        "energy_reward": 20,
        "pollution_penalty": -5,
        "difficulty": "easy"
    },
    {
        "id": 2,
        "title": "Apagar Luces Innecesarias",
        "description": "Reduce el consumo energético de la ciudad apagando luces no esenciales",
        "energy_reward": 15,
        "pollution_penalty": -3,
        "difficulty": "easy"
    },
    {
        "id": 3,
        "title": "Reparar Turbinas Eólicas",
        "description": "Las turbinas necesitan mantenimiento para funcionar al máximo",
        "energy_reward": 25,
        "pollution_penalty": -7,
        "difficulty": "medium"
    },
    {
        "id": 4,
        "title": "Optimizar Centro de Datos",
        "description": "Reduce el consumo del centro de datos sin afectar su rendimiento",
        "energy_reward": 30,
        "pollution_penalty": -10,
        "difficulty": "hard"
    },
    {
        "id": 5,
        "title": "Cerrar Planta de Carbón",
        "description": "Desactiva la planta de carbón y compensa con energías renovables",
        "energy_reward": 40,
        "pollution_penalty": -20,
        "difficulty": "hard"
    }
]

def get_ecobot_advice():
    """IA simple que analiza el estado y da consejos"""
    advice = []
    
    if game_state["pollution"] > 70:
        advice.append("⚠️ Nivel de contaminación crítico! Desactiva fuentes contaminantes inmediatamente.")
    elif game_state["pollution"] > 40:
        advice.append("🌍 La contaminación está aumentando. Considera usar más energías renovables.")
    
    if game_state["energy"] < 30:
        advice.append("⚡ Energía baja! Activa más fuentes de energía o reduce el consumo.")
    elif game_state["energy"] > 80:
        advice.append("✅ Excelente gestión energética! El planeta está prosperando.")
    
    if game_state["buildings"]["coal_plant"]["active"]:
        advice.append("🏭 La planta de carbón está activa. Intenta usar energías limpias.")
    
    if game_state["health"] < 50:
        advice.append("💔 La salud del planeta está en peligro. Equilibra energía y medio ambiente.")
    
    if not advice:
        advice.append("🤖 Todo está bajo control. Sigue así, guardián del planeta!")
    
    return random.choice(advice)

def update_game_state():
    """Actualiza el estado del juego basado en las decisiones"""
    buildings = game_state["buildings"]
    
    # Calcular producción de energía
    energy_production = 0
    if buildings["solar_panels"]["active"]:
        energy_production += buildings["solar_panels"]["efficiency"] * 0.3
    if buildings["wind_turbines"]["active"]:
        energy_production += buildings["wind_turbines"]["efficiency"] * 0.25
    if buildings["coal_plant"]["active"]:
        energy_production += buildings["coal_plant"]["efficiency"] * 0.5
    
    # Calcular consumo de energía
    energy_consumption = 0
    if buildings["data_center"]["active"]:
        energy_consumption += buildings["data_center"]["consumption"]
    if buildings["city_lights"]["active"]:
        energy_consumption += buildings["city_lights"]["consumption"]
    if buildings["factories"]["active"]:
        energy_consumption += buildings["factories"]["consumption"]
    
    # Actualizar energía
    energy_balance = energy_production - energy_consumption
    game_state["energy"] = max(0, min(100, game_state["energy"] + energy_balance * 0.1))
    
    # Calcular contaminación
    pollution_increase = 0
    if buildings["coal_plant"]["active"]:
        pollution_increase += 2
    if buildings["factories"]["active"]:
        pollution_increase += 1
    if buildings["city_lights"]["active"]:
        pollution_increase += 0.5
    
    pollution_decrease = 0
    if buildings["solar_panels"]["active"]:
        pollution_decrease += 0.5
    if buildings["wind_turbines"]["active"]:
        pollution_decrease += 0.5
    
    game_state["pollution"] = max(0, min(100, game_state["pollution"] + pollution_increase - pollution_decrease))
    
    # Calcular salud del planeta
    health_factor = (game_state["energy"] * 0.5) - (game_state["pollution"] * 0.5)
    game_state["health"] = max(0, min(100, game_state["health"] + health_factor * 0.05))
    
    # Actualizar puntuación
    if game_state["health"] > 70 and game_state["energy"] > 50:
        game_state["score"] += 10
    elif game_state["health"] < 30 or game_state["energy"] < 20:
        game_state["score"] = max(0, game_state["score"] - 5)

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    """Obtener el estado actual del juego"""
    update_game_state()
    return jsonify({
        **game_state,
        "ecobot_advice": get_ecobot_advice()
    })

@app.route('/api/game/reset', methods=['POST'])
def reset_game():
    """Reiniciar el juego"""
    global game_state
    game_state = {
        "energy": 100,
        "pollution": 0,
        "health": 100,
        "level": 1,
        "score": 0,
        "missions_completed": 0,
        "current_mission": None,
        "buildings": {
            "solar_panels": {"active": True, "efficiency": 80},
            "wind_turbines": {"active": True, "efficiency": 70},
            "coal_plant": {"active": False, "efficiency": 90},
            "data_center": {"active": True, "consumption": 30},
            "city_lights": {"active": True, "consumption": 20},
            "factories": {"active": True, "consumption": 40}
        }
    }
    return jsonify({"message": "Juego reiniciado", "state": game_state})

@app.route('/api/buildings/toggle', methods=['POST'])
def toggle_building():
    """Activar/desactivar un edificio"""
    data = request.json
    building_name = data.get('building')
    
    if building_name in game_state["buildings"]:
        game_state["buildings"][building_name]["active"] = not game_state["buildings"][building_name]["active"]
        update_game_state()
        return jsonify({
            "message": f"Estado de {building_name} cambiado",
            "state": game_state
        })
    
    return jsonify({"error": "Edificio no encontrado"}), 404

@app.route('/api/missions/available', methods=['GET'])
def get_available_missions():
    """Obtener misiones disponibles"""
    return jsonify({"missions": missions})

@app.route('/api/missions/start', methods=['POST'])
def start_mission():
    """Iniciar una misión"""
    data = request.json
    mission_id = data.get('mission_id')
    
    mission = next((m for m in missions if m["id"] == mission_id), None)
    
    if mission:
        game_state["current_mission"] = mission
        return jsonify({
            "message": "Misión iniciada",
            "mission": mission
        })
    
    return jsonify({"error": "Misión no encontrada"}), 404

@app.route('/api/missions/complete', methods=['POST'])
def complete_mission():
    """Completar la misión actual"""
    if game_state["current_mission"]:
        mission = game_state["current_mission"]
        
        # Aplicar recompensas
        game_state["energy"] = min(100, game_state["energy"] + mission["energy_reward"])
        game_state["pollution"] = max(0, game_state["pollution"] + mission["pollution_penalty"])
        game_state["score"] += mission["energy_reward"] * 10
        game_state["missions_completed"] += 1
        
        # Subir de nivel cada 3 misiones
        if game_state["missions_completed"] % 3 == 0:
            game_state["level"] += 1
        
        completed_mission = game_state["current_mission"]
        game_state["current_mission"] = None
        
        update_game_state()
        
        return jsonify({
            "message": "¡Misión completada!",
            "completed_mission": completed_mission,
            "state": game_state
        })
    
    return jsonify({"error": "No hay misión activa"}), 400

@app.route('/api/ecobot/advice', methods=['GET'])
def get_advice():
    """Obtener consejo de EcoBot"""
    return jsonify({
        "advice": get_ecobot_advice(),
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
