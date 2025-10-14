const API_URL = "http://localhost:5000/api"

let gameState = null
let canvas = null
let ctx = null
let mapImage = null
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
  mapImage.crossOrigin = "anonymous"
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
  canvas.height = width * 0.6
  drawGame()
}

function setupControls() {
  document.addEventListener("keydown", handleKeyPress)
  canvas.addEventListener("click", handleCanvasClick)

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
    if (gameState) {
      gameState.eco_points += 10
      updateUI()
    }
  } else {
    feedback.textContent = "Incorrecto. ¡Sigue aprendiendo!"
    feedback.className = "quiz-feedback wrong"
  }

  setTimeout(loadNewQuiz, 3000)
}

function drawGame() {
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (mapImage && mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)
  } else {
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  if (gameState) {
    let nextZoneId = null
    const zoneOrder = ["casa", "solar", "fabrica", "rio", "ciudad"]
    for (const zId of zoneOrder) {
      if (gameState.zones[zId].unlocked && !gameState.zones[zId].completed) {
        nextZoneId = zId
        break
      }
    }

    for (const [zoneId, coords] of Object.entries(zoneCoordinates)) {
      const zone = gameState.zones[zoneId]
      const x = (coords.x / 100) * canvas.width
      const y = (coords.y / 100) * canvas.height
      const radius = (coords.radius / 100) * canvas.width

      if (zoneId === nextZoneId) {
        ctx.save()
        ctx.shadowColor = "#FFD700"
        ctx.shadowBlur = 30
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        ctx.beginPath()
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 215, 0, 0.3)"
        ctx.fill()
        ctx.restore()
      }

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

      if (zoneId === nextZoneId) {
        ctx.strokeStyle = "#FFD700"
        ctx.lineWidth = 5
      } else {
        ctx.strokeStyle = zone.unlocked ? "#28a745" : "#6c757d"
        ctx.lineWidth = 3
      }
      ctx.stroke()

      const icons = {
        casa: "🏠",
        solar: "☀️",
        fabrica: "🏭",
        rio: "💧",
        ciudad: "🌆",
      }

      ctx.font = `${radius}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(icons[zoneId] || "❓", x, y)
    }

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

  document.getElementById("energy-value").textContent = gameState.energy
  document.getElementById("level-value").textContent = gameState.level
  document.getElementById("eco-points-value").textContent = gameState.eco_points
  document.getElementById("missions-completed-value").textContent = `${gameState.missions_completed}/5`
  document.getElementById("ecobot-message").textContent = gameState.ecobot_message

  updateRewards()
}

function updateRewards() {
  const rewardsList = document.getElementById("rewards-list")

  if (!rewardsList) return

  if (rewards.length === 0) {
    rewardsList.innerHTML = '<p class="empty-state">Completa misiones para ganar insignias</p>'
    return
  }

  rewardsList.innerHTML = ""

  rewards.forEach((reward) => {
    const badge = document.createElement("div")
    badge.className = "reward-badge"
    badge.innerHTML = `
      <span class="badge-icon">${reward.icon}</span>
      <div class="badge-name">${reward.name}</div>
      <div class="badge-description">${reward.description}</div>
    `
    rewardsList.appendChild(badge)
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
  } catch (error) {
    console.error("[v0] Error al mover jugador:", error)
  }
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / canvas.width) * 100
  const y = ((e.clientY - rect.top) / canvas.height) * 100

  for (const [zoneId, coords] of Object.entries(zoneCoordinates)) {
    const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2))

    if (distance < coords.radius) {
      handleZoneClick(zoneId)
      break
    }
  }
}

function showMissionModal(mission, introMessage) {
  const modal = document.getElementById("mission-modal")

  document.getElementById("mission-title").textContent = mission.title
  document.getElementById("mission-description").textContent = mission.description
  document.getElementById("mission-target").textContent = mission.target
  document.getElementById("mission-progress").textContent = "0"

  const welcomeMessages = {
    casa: "🏠 ¡Hola, EcoHéroe! Veo que estás listo para tu primera misión. Las pequeñas acciones hacen grandes cambios. ¿Sabías que apagar las luces puede ahorrar hasta 20% de energía? ¡Vamos a demostrarlo!",
    solar:
      "♻️ ¡Excelente progreso! Ahora aprenderemos sobre reciclaje. Separar correctamente los residuos es fundamental para un planeta limpio. ¡Cada elemento en su lugar correcto!",
    fabrica:
      "🏭 ¡Impresionante avance! Es momento de poner a prueba tu conocimiento. La información es poder, y tú estás acumulando mucho poder verde. ¡Demuestra lo que sabes!",
    rio: "💧 ¡Casi lo logras! El agua es vida y energía. Vamos a aprender cómo aprovecharla de forma sostenible. ¡Conecta todo correctamente!",
    ciudad:
      "🌆 ¡Última misión, campeón! Las ciudades del futuro dependen de decisiones inteligentes hoy. Tú tienes el poder de crear ese cambio. ¡Adelante!",
  }

  document.getElementById("mission-intro-text").textContent = welcomeMessages[mission.zone_id] || introMessage

  document.getElementById("mission-intro").classList.add("hidden")
  document.getElementById("mission-gameplay").classList.remove("hidden")

  modal.classList.remove("hidden")

  window.currentMission = mission

  const gameArea = document.getElementById("mission-game-area")
  gameArea.innerHTML = ""

  switch (mission.type) {
    case "click_game":
      generateClickGame(gameArea, mission)
      break
    case "drag_drop":
      generateDragDropGame(gameArea, mission)
      break
    case "multiple_choice":
      generateMultipleChoiceGame(gameArea, mission)
      break
    case "sequence_game":
      generateSequenceGame(gameArea, mission)
      break
    case "slider_game":
      generateSliderGame(gameArea, mission)
      break
  }
}

function startMissionGameplay() {
  document.getElementById("mission-intro").classList.add("hidden")
  document.getElementById("mission-gameplay").classList.remove("hidden")

  const mission = window.currentMission
  const gameArea = document.getElementById("mission-game-area")
  gameArea.innerHTML = ""

  switch (mission.type) {
    case "click_game":
      generateClickGame(gameArea, mission)
      break
    case "drag_drop":
      generateDragDropGame(gameArea, mission)
      break
    case "multiple_choice":
      generateMultipleChoiceGame(gameArea, mission)
      break
    case "sequence_game":
      generateSequenceGame(gameArea, mission)
      break
    case "slider_game":
      generateSliderGame(gameArea, mission)
      break
  }
}

function generateClickGame(container, mission) {
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

function generateDragDropGame(container, mission) {
  container.className = "mission-game-area recycling-game"

  const instructions = document.createElement("div")
  instructions.className = "game-instructions"
  instructions.innerHTML = `
    <h3>♻️ Juego de Reciclaje</h3>
    <p>Arrastra cada elemento al contenedor correcto. Debes clasificar todos los elementos para completar la misión.</p>
  `
  container.appendChild(instructions)

  const items = [
    { id: "plastic-bottle", icon: "🍾", type: "plastic", name: "Botella de plástico" },
    { id: "paper", icon: "📄", type: "paper", name: "Papel" },
    { id: "glass", icon: "🍷", type: "glass", name: "Vidrio" },
    { id: "metal-can", icon: "🥫", type: "metal", name: "Lata de metal" },
    { id: "organic", icon: "🍎", type: "organic", name: "Residuo orgánico" },
  ]

  const bins = [
    { type: "plastic", icon: "♻️", label: "Plástico", color: "#FFD700" },
    { type: "paper", icon: "📦", label: "Papel", color: "#4682B4" },
    { type: "glass", icon: "🔷", label: "Vidrio", color: "#90EE90" },
    { type: "metal", icon: "⚙️", label: "Metal", color: "#C0C0C0" },
    { type: "organic", icon: "🌱", label: "Orgánico", color: "#8B4513" },
  ]

  const itemsContainer = document.createElement("div")
  itemsContainer.className = "items-container"

  items.forEach((item) => {
    const itemEl = document.createElement("div")
    itemEl.className = "draggable-item"
    itemEl.draggable = true
    itemEl.dataset.type = item.type
    itemEl.dataset.id = item.id
    itemEl.innerHTML = `
      <span class="item-icon">${item.icon}</span>
      <span class="item-name">${item.name}</span>
    `

    itemEl.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("type", item.type)
      e.dataTransfer.setData("id", item.id)
      itemEl.classList.add("dragging")
    })

    itemEl.addEventListener("dragend", () => {
      itemEl.classList.remove("dragging")
    })

    itemsContainer.appendChild(itemEl)
  })

  const binsContainer = document.createElement("div")
  binsContainer.className = "bins-container"

  bins.forEach((bin) => {
    const binEl = document.createElement("div")
    binEl.className = "drop-zone"
    binEl.dataset.type = bin.type
    binEl.innerHTML = `
      <div class="drop-zone-icon">${bin.icon}</div>
      <div class="drop-zone-label">${bin.label}</div>
      <div class="drop-zone-count">0/${items.filter((i) => i.type === bin.type).length}</div>
    `

    binEl.addEventListener("dragover", (e) => {
      e.preventDefault()
      binEl.classList.add("drag-over")
    })

    binEl.addEventListener("dragleave", () => {
      binEl.classList.remove("drag-over")
    })

    binEl.addEventListener("drop", (e) => {
      e.preventDefault()
      binEl.classList.remove("drag-over")

      const itemType = e.dataTransfer.getData("type")
      const itemId = e.dataTransfer.getData("id")
      const binType = binEl.dataset.type

      if (itemType === binType) {
        const draggedItem = document.querySelector(`.draggable-item[data-id="${itemId}"]`)
        if (draggedItem) {
          draggedItem.remove()
          binEl.classList.add("filled")

          const countEl = binEl.querySelector(".drop-zone-count")
          const currentCount = Number.parseInt(countEl.textContent.split("/")[0]) + 1
          const totalCount = items.filter((i) => i.type === binType).length
          countEl.textContent = `${currentCount}/${totalCount}`

          updateMissionProgress()

          showFeedback(binEl, "¡Correcto! ✓", "success")
        }
      } else {
        showFeedback(binEl, "¡Incorrecto! ✗", "error")
      }
    })

    binsContainer.appendChild(binEl)
  })

  container.appendChild(itemsContainer)
  container.appendChild(binsContainer)
}

function showFeedback(element, message, type) {
  const feedback = document.createElement("div")
  feedback.className = `feedback-message ${type}`
  feedback.textContent = message
  element.appendChild(feedback)

  setTimeout(() => {
    feedback.remove()
  }, 1500)
}

function generateMultipleChoiceGame(container, mission) {
  container.className = "mission-game-area choice-game"

  const questions = [
    {
      question: "¿Cuál es la mejor forma de ahorrar energía en casa?",
      options: ["Apagar luces", "Dejar todo encendido", "Usar más aparatos", "Ignorar el consumo"],
      correct: 0,
    },
    {
      question: "¿Qué energía NO contamina?",
      options: ["Carbón", "Solar", "Petróleo", "Gas"],
      correct: 1,
    },
    {
      question: "¿Cómo reducir el consumo de agua?",
      options: ["Dejar grifos abiertos", "Duchas cortas", "Regar todo el día", "Lavar con manguera"],
      correct: 1,
    },
  ]

  let currentQuestion = 0

  function showQuestion() {
    if (currentQuestion >= questions.length) {
      updateMissionProgress(questions.length)
      return
    }

    const q = questions[currentQuestion]
    container.innerHTML = `
      <div class="choice-question">${q.question}</div>
      <div class="choice-options"></div>
    `

    const optionsContainer = container.querySelector(".choice-options")

    q.options.forEach((option, index) => {
      const optionEl = document.createElement("div")
      optionEl.className = "choice-option"
      optionEl.textContent = option

      optionEl.addEventListener("click", () => {
        if (index === q.correct) {
          optionEl.classList.add("correct")
          currentQuestion++
          updateMissionProgress(currentQuestion)
          setTimeout(showQuestion, 1500)
        } else {
          optionEl.classList.add("wrong")
        }
      })

      optionsContainer.appendChild(optionEl)
    })
  }

  showQuestion()
}

function generateSequenceGame(container, mission) {
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
        updateMissionProgress(mission.target)
      } else {
        updateMissionProgress(playerSequence.length)
      }
    })

    container.appendChild(panel)
  }
}

function generateSliderGame(container, mission) {
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

let missionProgress = 0

function updateMissionProgress(value) {
  if (value !== undefined) {
    missionProgress = value
  } else {
    missionProgress++
  }

  document.getElementById("mission-progress").textContent = missionProgress

  const target = Number.parseInt(document.getElementById("mission-target").textContent)

  if (missionProgress >= target) {
    setTimeout(() => {
      completeMission(true)
    }, 500)
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

function closeMissionModal() {
  document.getElementById("mission-modal").classList.add("hidden")
  missionProgress = 0
}

function closeCompletionModal() {
  document.getElementById("completion-modal").classList.add("hidden")
}

function addReward(zoneId) {
  const rewardData = {
    casa: { icon: "🏠", name: "Guardián del Hogar", description: "Experto en eficiencia doméstica" },
    solar: { icon: "☀️", name: "Maestro Solar", description: "Dominas la energía del sol" },
    fabrica: { icon: "🏭", name: "Optimizador Industrial", description: "Industria verde es posible" },
    rio: { icon: "💧", name: "Protector del Agua", description: "Guardián de recursos hídricos" },
    ciudad: { icon: "🌆", name: "Arquitecto Verde", description: "Constructor de ciudades sostenibles" },
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
    document.getElementById("completion-modal").classList.add("hidden")

    await updateGameState()

    alert("¡Juego reiniciado!")
  } catch (error) {
    console.error("[v0] Error al reiniciar:", error)
  }
}

document.addEventListener("DOMContentLoaded", initGame)
