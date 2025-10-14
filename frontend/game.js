const API_URL = "http://localhost:5000/api"

let gameState = null
let canvas = null
let ctx = null
let mapImage = null
const playerSprite = null
let updateInterval = null

const rewards = []
let currentQuiz = null
const quizQuestions = [
  {
    question: "¿Qué fuente de energía es renovable?",
    options: ["Energía Solar", "Carbón", "Petróleo", "Gas Natural"],
    correct: 0,
  },
  {
    question: "¿Cuál es el principal gas de efecto invernadero?",
    options: ["Oxígeno", "Nitrógeno", "Dióxido de Carbono", "Hidrógeno"],
    correct: 2,
  },
  {
    question: "¿Qué electrodoméstico consume más energía?",
    options: ["Bombilla LED", "Refrigerador", "Cargador de celular", "Ventilador"],
    correct: 1,
  },
  {
    question: "¿Cuál NO es una energía renovable?",
    options: ["Solar", "Eólica", "Nuclear", "Hidroeléctrica"],
    correct: 2,
  },
  {
    question: "¿Qué porcentaje de energía se puede ahorrar con LED?",
    options: ["10%", "30%", "50%", "80%"],
    correct: 3,
  },
]

// Coordenadas de las zonas en el mapa (porcentajes)
const zoneCoordinates = {
  casa: { x: 15, y: 60, radius: 8 },
  solar: { x: 45, y: 35, radius: 10 },
  fabrica: { x: 75, y: 30, radius: 10 },
  rio: { x: 70, y: 70, radius: 8 },
  ciudad: { x: 50, y: 50, radius: 8 },
}

// Inicializar el juego
async function initGame() {
  console.log("[v0] Iniciando EcoMission...")

  canvas = document.getElementById("game-canvas")
  ctx = canvas.getContext("2d")

  // Configurar canvas responsive
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  // Cargar imagen del mapa
  mapImage = new Image()
  mapImage.src = "assets/map.png"
  mapImage.onload = () => {
    console.log("[v0] Mapa cargado")
    drawGame()
  }

  // Cargar estado del juego
  await updateGameState()

  // Configurar controles
  setupControls()

  // Actualizar cada 2 segundos
  updateInterval = setInterval(updateGameState, 2000)

  console.log("[v0] EcoMission inicializado")
}

function resizeCanvas() {
  const container = canvas.parentElement
  const width = container.clientWidth - 40
  canvas.width = width
  canvas.height = width * 0.6 // Mantener aspect ratio
  drawGame()
}

function setupControls() {
  // Controles de teclado
  document.addEventListener("keydown", handleKeyPress)

  // Click en canvas
  canvas.addEventListener("click", handleCanvasClick)

  // Botones
  document.getElementById("reset-btn").addEventListener("click", resetGame)
  document.getElementById("close-mission-btn").addEventListener("click", closeMissionModal)
  document.getElementById("play-again-btn").addEventListener("click", resetGame)

  document.getElementById("start-mission-btn").addEventListener("click", startMissionGameplay)

  document.getElementById("continue-btn").addEventListener("click", closeCompletionModal)

  setupQuiz()
}

function setupQuiz() {
  loadNewQuiz()

  const options = document.querySelectorAll(".quiz-option")
  options.forEach((option) => {
    option.addEventListener("click", handleQuizAnswer)
  })
}

function loadNewQuiz() {
  if (quizQuestions.length === 0) return

  currentQuiz = quizQuestions[Math.floor(Math.random() * quizQuestions.length)]

  document.getElementById("quiz-question").textContent = currentQuiz.question
  document.getElementById("quiz-feedback").textContent = ""
  document.getElementById("quiz-feedback").className = "quiz-feedback"

  const options = document.querySelectorAll(".quiz-option")
  options.forEach((option, index) => {
    option.textContent = currentQuiz.options[index]
    option.className = "quiz-option"
    option.disabled = false
    option.dataset.index = index
  })
}

function handleQuizAnswer(e) {
  const selectedIndex = Number.parseInt(e.target.dataset.index)
  const options = document.querySelectorAll(".quiz-option")

  options.forEach((option) => {
    option.disabled = true
    const index = Number.parseInt(option.dataset.index)

    if (index === currentQuiz.correct) {
      option.classList.add("correct")
    } else if (index === selectedIndex) {
      option.classList.add("wrong")
    }
  })

  const feedback = document.getElementById("quiz-feedback")

  if (selectedIndex === currentQuiz.correct) {
    feedback.textContent = "¡Correcto! +10 Eco Puntos"
    feedback.className = "quiz-feedback correct"
    gameState.eco_points += 10
    updateUI()
  } else {
    feedback.textContent = "Incorrecto. ¡Sigue aprendiendo!"
    feedback.className = "quiz-feedback wrong"
  }

  setTimeout(loadNewQuiz, 3000)
}

function drawGame() {
  if (!ctx || !canvas) return

  // Limpiar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Dibujar mapa
  if (mapImage && mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)
  } else {
    // Fondo de respaldo
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Dibujar zonas
  if (gameState) {
    for (const [zoneId, coords] of Object.entries(zoneCoordinates)) {
      const zone = gameState.zones[zoneId]
      const x = (coords.x / 100) * canvas.width
      const y = (coords.y / 100) * canvas.height
      const radius = (coords.radius / 100) * canvas.width

      // Círculo de zona
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)

      if (zone.completed) {
        ctx.fillStyle = "rgba(23, 162, 184, 0.3)"
      } else if (zone.unlocked) {
        ctx.fillStyle = "rgba(40, 167, 69, 0.3)"
      } else {
        ctx.fillStyle = "rgba(108, 117, 125, 0.3)"
      }

      ctx.fill()
      ctx.strokeStyle = zone.unlocked ? "#28a745" : "#6c757d"
      ctx.lineWidth = 3
      ctx.stroke()

      // Icono de zona
      ctx.font = `${radius}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const icons = {
        casa: "🏠",
        solar: "☀️",
        fabrica: "🏭",
        rio: "💧",
        ciudad: "🏙️",
      }

      ctx.fillText(icons[zoneId] || "❓", x, y)
    }

    // Dibujar jugador (EcoBot)
    const playerX = (gameState.player_position.x / 100) * canvas.width
    const playerY = (gameState.player_position.y / 100) * canvas.height

    ctx.font = "40px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("🤖", playerX, playerY)
  }
}

async function updateGameState() {
  try {
    const response = await fetch(`${API_URL}/game/state`)
    gameState = await response.json()

    updateUI()
    drawGame()
  } catch (error) {
    console.error("[v0] Error al actualizar estado:", error)
  }
}

function updateUI() {
  if (!gameState) return

  // Actualizar stats
  document.getElementById("level-value").textContent = gameState.level
  document.getElementById("eco-points-value").textContent = gameState.eco_points
  document.getElementById("missions-completed-value").textContent = `${gameState.missions_completed}/5`

  // Actualizar mensaje de EcoBot
  document.getElementById("ecobot-message").textContent = gameState.ecobot_message

  // Actualizar lista de zonas
  updateZonesList()

  updateRewards()
}

function updateZonesList() {
  const zonesList = document.getElementById("zones-list")
  zonesList.innerHTML = ""

  for (const [zoneId, zone] of Object.entries(gameState.zones)) {
    const zoneItem = document.createElement("div")
    zoneItem.className = "zone-item"
    zoneItem.textContent = `${zoneId.charAt(0).toUpperCase() + zoneId.slice(1)}: ${zone.completed ? "Completada" : zone.unlocked ? "Desbloqueada" : "Bloqueada"}`
    zonesList.appendChild(zoneItem)
  }
}

function updateRewards() {
  const rewardsList = document.getElementById("rewards-list")

  if (rewards.length === 0) {
    rewardsList.innerHTML = '<p class="empty-state">Completa misiones para desbloquear premios</p>'
    return
  }

  rewardsList.innerHTML = ""

  rewards.forEach((reward) => {
    const rewardItem = document.createElement("div")
    rewardItem.className = "reward-item"
    rewardItem.innerHTML = `
      <div class="reward-icon-display">${reward.icon}</div>
      <div class="reward-info">
        <h4>${reward.name}</h4>
        <p>${reward.description}</p>
      </div>
    `
    rewardsList.appendChild(rewardItem)
  })
}

async function handleKeyPress(e) {
  const directions = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  }

  if (directions[e.key]) {
    e.preventDefault()
    await movePlayer(directions[e.key])
  }
}

async function movePlayer(direction) {
  try {
    const response = await fetch(`${API_URL}/player/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    })

    const data = await response.json()
    gameState.player_position = data.position
    drawGame()
    checkZoneProximity()
  } catch (error) {
    console.error("[v0] Error al mover jugador:", error)
  }
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / canvas.width) * 100
  const y = ((e.clientY - rect.top) / canvas.height) * 100

  // Verificar si hizo click en una zona
  for (const [zoneId, coords] of Object.entries(zoneCoordinates)) {
    const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2))

    if (distance < coords.radius) {
      handleZoneClick(zoneId)
      break
    }
  }
}

function checkZoneProximity() {
  if (!gameState) return

  const playerX = gameState.player_position.x
  const playerY = gameState.player_position.y

  for (const [zoneId, coords] of Object.entries(zoneCoordinates)) {
    const distance = Math.sqrt(Math.pow(playerX - coords.x, 2) + Math.pow(playerY - coords.y, 2))

    if (distance < coords.radius + 5) {
      // Cerca de una zona
      if (gameState.zones[zoneId].unlocked && !gameState.zones[zoneId].completed) {
        // Mostrar indicador
        console.log(`[v0] Cerca de zona: ${zoneId}`)
      }
    }
  }
}

function showMissionModal(mission, introMessage) {
  const modal = document.getElementById("mission-modal")

  document.getElementById("mission-title").textContent = mission.title
  document.getElementById("mission-description").textContent = mission.description
  document.getElementById("mission-target").textContent = mission.target
  document.getElementById("mission-timer").textContent = mission.time_limit
  document.getElementById("mission-progress").textContent = "0"
  document.getElementById("mission-intro-text").textContent = introMessage

  // Mostrar intro, ocultar gameplay
  document.getElementById("mission-intro").classList.remove("hidden")
  document.getElementById("mission-gameplay").classList.add("hidden")

  modal.classList.remove("hidden")

  // Guardar misión actual
  window.currentMission = mission
}

function startMissionGameplay() {
  document.getElementById("mission-intro").classList.add("hidden")
  document.getElementById("mission-gameplay").classList.remove("hidden")

  const mission = window.currentMission

  // Generar juego según tipo
  const gameArea = document.getElementById("mission-game-area")
  gameArea.innerHTML = ""

  switch (mission.type) {
    case "click_game":
      generateClickGame(gameArea, mission)
      break
    case "sequence_game":
      generateSequenceGame(gameArea, mission)
      break
    case "slider_game":
      generateSliderGame(gameArea, mission)
      break
    case "balance_game":
      generateBalanceGame(gameArea, mission)
      break
  }

  // Iniciar temporizador
  startMissionTimer(mission)
}

function generateClickGame(container, mission) {
  // Juego de apagar luces o limpiar nubes
  const isLights = mission.zone_id === "casa"

  for (let i = 0; i < mission.target; i++) {
    const element = document.createElement("div")
    element.className = isLights ? "light-bulb" : "cloud"
    element.textContent = isLights ? "💡" : "☁️"
    element.dataset.index = i

    element.addEventListener("click", function () {
      if (isLights) {
        this.classList.add("off")
        this.textContent = "⚫"
      } else {
        this.style.opacity = "0"
      }
      this.style.pointerEvents = "none"
      updateMissionProgress()
    })

    container.appendChild(element)
  }
}

function generateSequenceGame(container, mission) {
  // Juego de conectar paneles en orden
  const sequence = []
  const playerSequence = []

  for (let i = 0; i < mission.target; i++) {
    const panel = document.createElement("div")
    panel.className = "solar-panel"
    panel.textContent = "☀️"
    panel.dataset.index = i

    panel.addEventListener("click", function () {
      if (playerSequence.includes(Number.parseInt(this.dataset.index))) return

      playerSequence.push(Number.parseInt(this.dataset.index))
      this.classList.add("active")

      if (playerSequence.length === mission.target) {
        // Verificar si es correcto (simplificado: cualquier orden es válido)
        updateMissionProgress(mission.target)
      } else {
        updateMissionProgress(playerSequence.length)
      }
    })

    container.appendChild(panel)
  }
}

function generateSliderGame(container, mission) {
  // Juego de ajustar máquinas
  for (let i = 0; i < mission.target; i++) {
    const sliderContainer = document.createElement("div")
    sliderContainer.className = "slider-container"

    sliderContainer.innerHTML = `
      <label>Máquina ${i + 1}: <span class="slider-value">50</span>%</label>
      <input type="range" min="0" max="100" value="50" class="machine-slider">
    `

    const slider = sliderContainer.querySelector("input")
    const valueSpan = sliderContainer.querySelector(".slider-value")

    slider.addEventListener("input", function () {
      valueSpan.textContent = this.value
      checkSliders()
    })

    container.appendChild(sliderContainer)
  }

  function checkSliders() {
    const sliders = container.querySelectorAll(".machine-slider")
    let correct = 0

    sliders.forEach((slider) => {
      const value = Number.parseInt(slider.value)
      if (value >= 40 && value <= 60) {
        correct++
      }
    })

    updateMissionProgress(correct)
  }
}

function generateBalanceGame(container, mission) {
  // Juego de mantener balance (simplificado como slider)
  container.innerHTML = `
    <div class="slider-container">
      <label>Flujo de Agua: <span class="slider-value">50</span>%</label>
      <input type="range" min="0" max="100" value="50" class="balance-slider">
      <p>Mantén el flujo entre 45% y 55%</p>
    </div>
  `

  const slider = container.querySelector(".balance-slider")
  const valueSpan = container.querySelector(".slider-value")
  let correctTime = 0

  slider.addEventListener("input", function () {
    valueSpan.textContent = this.value
  })

  // Verificar cada segundo
  const balanceInterval = setInterval(() => {
    const value = Number.parseInt(slider.value)
    if (value >= 45 && value <= 55) {
      correctTime++
      updateMissionProgress(correctTime)

      if (correctTime >= mission.target) {
        clearInterval(balanceInterval)
      }
    }
  }, 1000)
}

let missionTimer = null
let missionProgress = 0

function startMissionTimer(mission) {
  let timeLeft = mission.time_limit
  missionProgress = 0

  missionTimer = setInterval(() => {
    timeLeft--
    document.getElementById("mission-timer").textContent = timeLeft

    if (timeLeft <= 0) {
      clearInterval(missionTimer)
      failMission()
    }
  }, 1000)
}

function updateMissionProgress(value) {
  if (value !== undefined) {
    missionProgress = value
  } else {
    missionProgress++
  }

  document.getElementById("mission-progress").textContent = missionProgress

  const target = Number.parseInt(document.getElementById("mission-target").textContent)

  if (missionProgress >= target) {
    clearInterval(missionTimer)
    completeMission(true)
  }
}

async function completeMission(success) {
  try {
    const response = await fetch(`${API_URL}/mission/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success }),
    })

    const data = await response.json()

    closeMissionModal()

    if (data.all_completed) {
      showVictoryModal()
    } else {
      showCompletionModal(data.completed_mission, data.message)

      addReward(data.completed_mission.zone_id)
    }

    await updateGameState()
  } catch (error) {
    console.error("[v0] Error al completar misión:", error)
  }
}

function showCompletionModal(mission, message) {
  document.getElementById("completion-message").textContent = message
  document.getElementById("reward-points").textContent = `+${mission.reward}`
  document.getElementById("completion-modal").classList.remove("hidden")
}

function closeCompletionModal() {
  document.getElementById("completion-modal").classList.add("hidden")
}

function addReward(zoneId) {
  const rewardData = {
    casa: { icon: "💡", name: "Experto en Eficiencia", description: "Dominas el ahorro energético en el hogar" },
    solar: { icon: "☀️", name: "Maestro Solar", description: "Conoces el poder del sol" },
    fabrica: { icon: "🏭", name: "Optimizador Industrial", description: "Haces la industria más verde" },
    rio: { icon: "💧", name: "Guardián del Agua", description: "Proteges los recursos hídricos" },
    ciudad: { icon: "🌆", name: "Arquitecto Verde", description: "Construyes ciudades sostenibles" },
  }

  if (rewardData[zoneId]) {
    rewards.push(rewardData[zoneId])
    updateRewards()
  }
}

async function handleZoneClick(zoneId) {
  const zone = gameState.zones[zoneId]

  if (!zone.unlocked) {
    alert("Esta zona está bloqueada. Completa las misiones anteriores primero.")
    return
  }

  if (zone.completed) {
    alert("Ya completaste esta zona.")
    return
  }

  try {
    const response = await fetch(`${API_URL}/zone/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone_id: zoneId }),
    })

    const data = await response.json()

    if (response.ok) {
      showMissionModal(data.mission, data.message)
    } else {
      alert(data.error)
    }
  } catch (error) {
    console.error("[v0] Error al iniciar zona:", error)
  }
}

function failMission() {
  alert("¡Se acabó el tiempo! Inténtalo de nuevo.")
  closeMissionModal()
}

function closeMissionModal() {
  if (missionTimer) {
    clearInterval(missionTimer)
  }
  document.getElementById("mission-modal").classList.add("hidden")
}

function showVictoryModal() {
  document.getElementById("final-level").textContent = gameState.level
  document.getElementById("final-points").textContent = gameState.eco_points
  document.getElementById("final-missions").textContent = gameState.missions_completed

  document.getElementById("victory-modal").classList.remove("hidden")
}

async function resetGame() {
  if (!confirm("¿Estás seguro de que quieres reiniciar el juego?")) {
    return
  }

  try {
    await fetch(`${API_URL}/game/reset`, { method: "POST" })

    document.getElementById("victory-modal").classList.add("hidden")

    await updateGameState()

    alert("¡Juego reiniciado!")
  } catch (error) {
    console.error("[v0] Error al reiniciar:", error)
  }
}

// Iniciar cuando carga la página
document.addEventListener("DOMContentLoaded", initGame)

