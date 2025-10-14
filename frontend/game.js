const API_URL = "http://localhost:5000/api"

let gameState = null
let updateInterval = null

// Inicializar el juego
async function initGame() {
  await updateGameState()
  await loadMissions()

  // Actualizar el estado cada 2 segundos
  updateInterval = setInterval(updateGameState, 2000)
}

// Actualizar el estado del juego
async function updateGameState() {
  try {
    const response = await fetch(`${API_URL}/game/state`)
    gameState = await response.json()

    // Actualizar UI
    updateStats()
    updateEcoBotAdvice()
    updateBuildingStatus()
    updateMapVisuals()
  } catch (error) {
    console.error("Error al actualizar el estado:", error)
  }
}

// Actualizar estadísticas
function updateStats() {
  if (!gameState) return

  // Energía
  document.getElementById("energy-value").textContent = Math.round(gameState.energy)
  document.getElementById("energy-bar").style.width = `${gameState.energy}%`

  // Contaminación
  document.getElementById("pollution-value").textContent = Math.round(gameState.pollution)
  document.getElementById("pollution-bar").style.width = `${gameState.pollution}%`

  // Salud
  document.getElementById("health-value").textContent = Math.round(gameState.health)
  document.getElementById("health-bar").style.width = `${gameState.health}%`

  // Puntuación y nivel
  document.getElementById("score-value").textContent = gameState.score
  document.getElementById("level-value").textContent = gameState.level

  // Actualizar misión actual
  if (gameState.current_mission) {
    document.getElementById("current-mission").classList.remove("d-none")
    document.getElementById("current-mission-title").textContent = gameState.current_mission.title
    document.getElementById("current-mission-description").textContent = gameState.current_mission.description
  } else {
    document.getElementById("current-mission").classList.add("d-none")
  }
}

// Actualizar consejo de EcoBot
function updateEcoBotAdvice() {
  if (!gameState) return

  const adviceElement = document.getElementById("ecobot-advice")
  adviceElement.textContent = gameState.ecobot_advice
}

// Actualizar estado de edificios
function updateBuildingStatus() {
  if (!gameState) return

  for (const [building, data] of Object.entries(gameState.buildings)) {
    const statusElement = document.getElementById(`${building}-status`)
    const buttonElement = statusElement.parentElement

    if (data.active) {
      statusElement.textContent = "Activo"
      buttonElement.classList.remove("btn-secondary")
      buttonElement.classList.add("btn-success")
    } else {
      statusElement.textContent = "Inactivo"
      buttonElement.classList.remove("btn-success")
      buttonElement.classList.add("btn-secondary")
    }
  }
}

// Actualizar visuales del mapa
function updateMapVisuals() {
  if (!gameState) return

  // Cambiar opacidad según estado activo/inactivo
  const buildings = gameState.buildings

  document.getElementById("map-solar").style.opacity = buildings.solar_panels.active ? 1 : 0.3
  document.getElementById("map-wind").style.opacity = buildings.wind_turbines.active ? 1 : 0.3
  document.getElementById("map-coal").style.opacity = buildings.coal_plant.active ? 1 : 0.3
  document.getElementById("map-data").style.opacity = buildings.data_center.active ? 1 : 0.3
  document.getElementById("map-city").style.opacity = buildings.city_lights.active ? 1 : 0.3
  document.getElementById("map-factory").style.opacity = buildings.factories.active ? 1 : 0.3
}

// Alternar estado de edificio
async function toggleBuilding(buildingName) {
  try {
    const response = await fetch(`${API_URL}/buildings/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ building: buildingName }),
    })

    const data = await response.json()
    gameState = data.state
    updateStats()
    updateBuildingStatus()
    updateMapVisuals()
  } catch (error) {
    console.error("Error al cambiar estado del edificio:", error)
  }
}

// Cargar misiones disponibles
async function loadMissions() {
  try {
    const response = await fetch(`${API_URL}/missions/available`)
    const data = await response.json()

    const missionsList = document.getElementById("missions-list")
    missionsList.innerHTML = ""

    data.missions.forEach((mission) => {
      const missionCard = document.createElement("div")
      missionCard.className = "card mission-card mb-2"
      missionCard.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title">${mission.title}</h6>
                    <p class="card-text small">${mission.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-info">+${mission.energy_reward} Energía</span>
                        <span class="badge difficulty-${mission.difficulty}">${mission.difficulty.toUpperCase()}</span>
                        <button class="btn btn-sm btn-primary" onclick="startMission(${mission.id})">
                            Iniciar
                        </button>
                    </div>
                </div>
            `
      missionsList.appendChild(missionCard)
    })
  } catch (error) {
    console.error("Error al cargar misiones:", error)
  }
}

// Iniciar misión
async function startMission(missionId) {
  try {
    const response = await fetch(`${API_URL}/missions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mission_id: missionId }),
    })

    const data = await response.json()
    await updateGameState()

    alert(`¡Misión iniciada! ${data.mission.title}`)
  } catch (error) {
    console.error("Error al iniciar misión:", error)
  }
}

// Completar misión
async function completeMission() {
  try {
    const response = await fetch(`${API_URL}/missions/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    await updateGameState()

    alert(`¡Misión completada! ${data.completed_mission.title}\n+${data.completed_mission.energy_reward} Energía`)
  } catch (error) {
    console.error("Error al completar misión:", error)
  }
}

// Reiniciar juego
async function resetGame() {
  if (!confirm("¿Estás seguro de que quieres reiniciar el juego?")) {
    return
  }

  try {
    const response = await fetch(`${API_URL}/game/reset`, {
      method: "POST",
    })

    await updateGameState()
    alert("¡Juego reiniciado!")
  } catch (error) {
    console.error("Error al reiniciar el juego:", error)
  }
}

// Iniciar el juego cuando se carga la página
document.addEventListener("DOMContentLoaded", initGame)
