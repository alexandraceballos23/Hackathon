from flask import Flask, jsonify, request
from flask_cors import CORS
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

game_state = {
    "energy": 100,
    "eco_points": 0,
    "level": 1,
    "player_position": {"x": 50, "y": 50},  # Posición de EcoBot en el mapa
    "zones": {
        "casa": {"unlocked": True, "completed": False, "name": "Casa Eficiente"},
        "solar": {"unlocked": False, "completed": False, "name": "Parque Solar"},
        "fabrica": {"unlocked": False, "completed": False, "name": "Fábrica Sostenible"},
        "rio": {"unlocked": False, "completed": False, "name": "Planta Hidroeléctrica"},
        "ciudad": {"unlocked": False, "completed": False, "name": "Ciudad Verde"}
    },
    "current_mission": None,
    "missions_completed": 0,
    "ecobot_message": "¡Bienvenido, guardián del planeta! Haz clic en la Casa para comenzar tu primera misión."
}

zone_missions = {
    "casa": {
        "title": "Apaga las Luces",
        "description": "Apaga 5 luces que están encendidas innecesariamente",
        "type": "click_game",
        "target": 5,
        "time_limit": 30,
        "reward": 100,
        "next_zone": "solar"
    },
    "solar": {
        "title": "Recicla Correctamente",
        "description": "Arrastra cada residuo al contenedor correcto",
        "type": "drag_drop",
        "target": 5,
        "time_limit": 45,
        "reward": 150,
        "next_zone": "fabrica"
    },
    "fabrica": {
        "title": "Quiz de Eficiencia",
        "description": "Responde correctamente las preguntas sobre energía",
        "type": "multiple_choice",
        "target": 3,
        "time_limit": 60,
        "reward": 200,
        "next_zone": "rio"
    },
    "rio": {
        "title": "Conecta los Paneles",
        "description": "Conecta los paneles solares en el orden correcto",
        "type": "sequence_game",
        "target": 4,
        "time_limit": 45,
        "reward": 250,
        "next_zone": "ciudad"
    },
    "ciudad": {
        "title": "Optimiza la Ciudad",
        "description": "Ajusta los sistemas de la ciudad para máxima eficiencia",
        "type": "slider_game",
        "target": 3,
        "time_limit": 60,
        "reward": 300,
        "next_zone": None
    }
}

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    """Obtener el estado actual del juego"""
    return jsonify(game_state)

@app.route('/api/player/move', methods=['POST'])
def move_player():
    """Mover al jugador (EcoBot) en el mapa"""
    data = request.json
    direction = data.get('direction')
    
    # Movimiento con teclas
    if direction == 'left':
        game_state["player_position"]["x"] = max(0, game_state["player_position"]["x"] - 5)
    elif direction == 'right':
        game_state["player_position"]["x"] = min(100, game_state["player_position"]["x"] + 5)
    elif direction == 'up':
        game_state["player_position"]["y"] = max(0, game_state["player_position"]["y"] - 5)
    elif direction == 'down':
        game_state["player_position"]["y"] = min(100, game_state["player_position"]["y"] + 5)
    
    return jsonify({"position": game_state["player_position"]})

@app.route('/api/zone/start', methods=['POST'])
def start_zone():
    """Iniciar una misión en una zona"""
    data = request.json
    zone_id = data.get('zone_id')
    
    if zone_id not in game_state["zones"]:
        return jsonify({"error": "Zona no encontrada"}), 404
    
    if not game_state["zones"][zone_id]["unlocked"]:
        return jsonify({"error": "Zona bloqueada"}), 403
    
    if game_state["zones"][zone_id]["completed"]:
        return jsonify({"error": "Zona ya completada"}), 400
    
    mission = zone_missions[zone_id]
    game_state["current_mission"] = {
        "zone_id": zone_id,
        **mission
    }
    
    messages = {
        "casa": "🏠 ¡Bienvenido, EcoHéroe! Esta es tu primera misión. Veo muchas luces encendidas sin necesidad. ¿Sabías que apagar las luces cuando no las usas puede reducir tu factura hasta un 20%? Cada bombilla apagada es un paso hacia un planeta más verde. ¡Ayúdame a apagarlas todas! 💡",
        "solar": "♻️ ¡Excelente trabajo hasta ahora! Llegamos al Centro de Reciclaje. Aquí aprenderás a separar correctamente los residuos. El reciclaje reduce la contaminación y ahorra energía en la producción de nuevos materiales. Arrastra cada elemento al contenedor correcto: plástico, papel, vidrio, metal y orgánico. ¡Cada residuo en su lugar! 🌍",
        "fabrica": "🏭 ¡Impresionante progreso! Estamos en la Fábrica Sostenible. Es hora de poner a prueba tus conocimientos sobre eficiencia energética. Responde correctamente las preguntas y demuestra que eres un verdadero experto en energía limpia. ¡El conocimiento es poder! 📚",
        "rio": "💧 ¡Casi lo logras! Llegamos a la Planta Hidroeléctrica. El agua en movimiento genera energía limpia y renovable. Conecta los paneles en el orden correcto para maximizar la producción sin dañar el ecosistema. ¡Cada conexión cuenta! ⚡",
        "ciudad": "🌆 ¡Última misión, campeón! Bienvenido a la Ciudad Verde. Las ciudades del futuro son eficientes y sostenibles. Ajusta los sistemas de iluminación, transporte y energía para crear la ciudad perfecta. ¡Tú eres el arquitecto del cambio! 🌳"
    }
    
    game_state["ecobot_message"] = messages.get(zone_id, "¡Adelante!")
    
    return jsonify({
        "mission": game_state["current_mission"],
        "message": messages.get(zone_id, "¡Adelante!")
    })

@app.route('/api/mission/complete', methods=['POST'])
def complete_mission():
    """Completar la misión actual"""
    if not game_state["current_mission"]:
        return jsonify({"error": "No hay misión activa"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Datos inválidos"}), 400
        
    success = data.get('success', False)
    
    if not success:
        game_state["current_mission"] = None
        game_state["ecobot_message"] = "No te preocupes, inténtalo de nuevo. ¡Tú puedes!"
        return jsonify({"message": "Misión fallida", "state": game_state})
    
    mission = game_state["current_mission"]
    zone_id = mission["zone_id"]
    
    # Marcar zona como completada
    game_state["zones"][zone_id]["completed"] = True
    game_state["eco_points"] += mission["reward"]
    game_state["missions_completed"] += 1
    
    # Desbloquear siguiente zona
    next_zone = mission.get("next_zone")
    if next_zone and next_zone in game_state["zones"]:
        game_state["zones"][next_zone]["unlocked"] = True
    
    # Subir de nivel cada 2 misiones
    if game_state["missions_completed"] % 2 == 0:
        game_state["level"] += 1
    
    # Mensajes de EcoBot al completar
    completion_messages = {
        "casa": "¡Excelente trabajo! Has reducido el consumo energético un 20%. Dato curioso: Si todos apagáramos las luces innecesarias, ahorraríamos suficiente energía para iluminar una ciudad entera durante un año. 🌎💡",
        "solar": "¡Perfecto! Has clasificado correctamente todos los residuos. Dato curioso: Reciclar una tonelada de papel salva 17 árboles y ahorra 4,000 kWh de energía. ♻️🌳",
        "fabrica": "¡Increíble! Demuestras un gran conocimiento sobre energía sostenible. Dato curioso: La industria representa el 40% del consumo energético mundial, pero con optimización podemos reducirlo significativamente. 🏭♻️",
        "rio": "¡Fantástico! El sistema hidroeléctrico está funcionando perfectamente. Dato curioso: La energía hidroeléctrica es la fuente renovable más utilizada en el mundo, generando el 16% de la electricidad global. 💧🌊",
        "ciudad": "¡Maravilloso! Has creado una ciudad sostenible modelo. Dato curioso: Las ciudades verdes con más árboles y menos contaminación tienen habitantes más saludables y felices. 🌆🌳"
    }
    
    game_state["ecobot_message"] = completion_messages.get(zone_id, "¡Misión completada!")
    
    # Verificar si completó todas las misiones
    all_completed = all(zone["completed"] for zone in game_state["zones"].values())
    if all_completed:
        game_state["ecobot_message"] = "¡Felicidades, Guardián del Planeta! Has completado todas las misiones. Ahora sabes que cada acción cuenta para cuidar nuestro mundo. ¡Sigue aplicando lo aprendido en tu vida diaria! 🌍✨"
    
    completed_mission = game_state["current_mission"]
    game_state["current_mission"] = None
    
    return jsonify({
        "message": completion_messages.get(zone_id, "¡Misión completada!"),
        "completed_mission": completed_mission,
        "state": game_state,
        "all_completed": all_completed
    })

@app.route('/api/game/reset', methods=['POST'])
def reset_game():
    """Reiniciar el juego"""
    global game_state
    game_state = {
        "energy": 100,
        "eco_points": 0,
        "level": 1,
        "player_position": {"x": 50, "y": 50},
        "zones": {
            "casa": {"unlocked": True, "completed": False, "name": "Casa Eficiente"},
            "solar": {"unlocked": False, "completed": False, "name": "Parque Solar"},
            "fabrica": {"unlocked": False, "completed": False, "name": "Fábrica Sostenible"},
            "rio": {"unlocked": False, "completed": False, "name": "Planta Hidroeléctrica"},
            "ciudad": {"unlocked": False, "completed": False, "name": "Ciudad Verde"}
        },
        "current_mission": None,
        "missions_completed": 0,
        "ecobot_message": "¡Bienvenido, guardián del planeta! Haz clic en la Casa para comenzar tu primera misión."
    }
    return jsonify({"message": "Juego reiniciado", "state": game_state})

@app.route('/api/ecobot/message', methods=['GET'])
def get_ecobot_message():
    """Obtener mensaje actual de EcoBot"""
    return jsonify({"message": game_state["ecobot_message"]})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

