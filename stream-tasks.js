const currentUser = null
let currentStreamId = null
let firebase = null
let auth = null
let db = null

async function initializeApp() {
  // Wait for Firebase to be loaded by app.js
  let attempts = 0
  while (!window.firebase && attempts < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    attempts++
  }

  if (window.firebase && window.firebase.apps.length > 0) {
    firebase = window.firebase
    auth = firebase.auth()
    db = firebase.firestore()

    // Get stream ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    currentStreamId = urlParams.get("streamId")

    if (!currentStreamId) {
      console.error("Stream ID not found in URL")
      return
    }

    // Initialize the page
    initializePage()

    // Set back button
    const backBtn = document.getElementById("backBtn")
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.history.back()
      })
    }
  }
}

async function initializePage() {
  try {
    // Load stream details
    await loadStreamDetails()
    // Load all tasks for this stream
    await loadAllTasks()
    // Load all updates for this stream
    await loadAllUpdates()
  } catch (error) {
    console.error("Error initializing page:", error)
  }
}

async function loadStreamDetails() {
  try {
    const streamDoc = await db.collection("streams").doc(currentStreamId).get()

    if (!streamDoc.exists) {
      console.error("Stream not found")
      return
    }

    const stream = streamDoc.data()
    const streamTitle = document.getElementById("streamTitle")
    const pageTitle = document.querySelector(".page-title")

    if (streamTitle) {
      streamTitle.textContent = `${stream.title} - Détails Complets`
    }
    if (pageTitle) {
      pageTitle.textContent = `${stream.title} - Détails Complets`
    }

    // Update page title
    document.title = `${stream.title} - Détails Complets`
  } catch (error) {
    console.error("Error loading stream details:", error)
  }
}

async function loadAllTasks() {
  try {
    const snapshot = await db.collection("tasks").where("streamId", "==", currentStreamId).get()

    const tasksTableBody = document.getElementById("tasksTableBody")
    if (!tasksTableBody) return

    tasksTableBody.innerHTML = ""

    if (snapshot.empty) {
      const emptyRow = document.createElement("tr")
      emptyRow.innerHTML =
        '<td colspan="6" style="text-align: center; color: #999; padding: 20px;">Aucune tâche pour le moment.</td>'
      tasksTableBody.appendChild(emptyRow)
      return
    }

    const tasks = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
          startDate: data.startDate ? data.startDate.toDate() : null,
          endDate: data.endDate ? data.endDate.toDate() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        }
      }),
    )

    tasks.sort((a, b) => b.createdAt - a.createdAt)

    tasks.forEach((task) => {
      const taskRow = createDetailedTaskRow(task)
      tasksTableBody.appendChild(taskRow)
    })
  } catch (error) {
    console.error("Error loading tasks:", error)
  }
}

function createDetailedTaskRow(task) {
  const row = document.createElement("tr")
  row.id = `task-${task.id}`
  row.style.cursor = "pointer"

  const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString("fr-FR") : ""
  const endDate = task.endDate ? new Date(task.endDate).toLocaleDateString("fr-FR") : ""
  const updatedDate = task.updatedAt ? new Date(task.updatedAt).toLocaleString("fr-FR") : ""

  const statusClass = getStatusClass(task.status)

  row.innerHTML = `
    <td><strong>${task.title}</strong></td>
    <td>${task.description}</td>
    <td>${startDate}</td>
    <td>${endDate}</td>
    <td><span class="task-status-badge ${statusClass}">${task.status}</span></td>
    <td>
      <div style="font-size: 11px; color: #999;">
        ${updatedDate}
        ${task.updatedByName ? `<div>par ${task.updatedByName}</div>` : ""}
      </div>
    </td>
  `

  row.addEventListener("click", () => {
    showTaskHistory(task)
  })

  return row
}

function getStatusClass(status) {
  switch (status) {
    case "En cours":
      return "en-cours"
    case "Terminé":
      return "termine"
    case "En attente":
      return "en-attente"
    default:
      return "en-cours"
  }
}

async function showTaskHistory(task) {
  const modal = document.getElementById("editTaskModal")
  if (!modal) return

  // Update modal with task details
  const modalContent = modal.querySelector(".modal-content")
  if (!modalContent) return

  const historyHTML = `
    <span class="close edit-task-close">&times;</span>
    <h3>Historique de la Tâche: ${task.title}</h3>
    
    <div style="background: #f0f4f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <div style="margin-bottom: 12px;">
        <strong style="color: #0052cc;">Titre:</strong> ${task.title}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #0052cc;">Description:</strong> ${task.description}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #0052cc;">Dates:</strong> 
        ${new Date(task.startDate).toLocaleDateString("fr-FR")} - ${new Date(task.endDate).toLocaleDateString("fr-FR")}
      </div>
      <div style="margin-bottom: 12px;">
        <strong style="color: #0052cc;">Statut Actuel:</strong> 
        <span class="task-status-badge ${getStatusClass(task.status)}">${task.status}</span>
      </div>
      ${
        task.notes
          ? `<div style="margin-bottom: 12px;">
        <strong style="color: #0052cc;">Notes:</strong> ${task.notes}
      </div>`
          : ""
      }
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e8f0;">
        <div style="font-size: 12px; color: #999;">
          <strong>Créée le:</strong> ${new Date(task.createdAt).toLocaleString("fr-FR")}
        </div>
        ${
          task.updatedAt
            ? `<div style="font-size: 12px; color: #999; margin-top: 5px;">
          <strong>Dernière mise à jour:</strong> ${new Date(task.updatedAt).toLocaleString("fr-FR")}
          ${task.updatedByName ? `par ${task.updatedByName}` : ""}
        </div>`
            : ""
        }
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px;">
      <button type="button" class="btn btn-secondary" onclick="closeTaskHistory()">Fermer</button>
    </div>
  `

  modalContent.innerHTML = historyHTML

  // Reattach close button handler
  const closeBtn = modalContent.querySelector(".close")
  if (closeBtn) {
    closeBtn.addEventListener("click", window.closeTaskHistory)
  }

  modal.classList.add("active")
}

window.closeTaskHistory = () => {
  const modal = document.getElementById("editTaskModal")
  if (modal) {
    modal.classList.remove("active")
  }
}

async function loadAllUpdates() {
  try {
    const snapshot = await db.collection("updates").where("streamId", "==", currentStreamId).get()

    // Find or create updates history section
    let updatesContainer = document.getElementById("updatesHistoryContainer")

    if (!updatesContainer) {
      // Create the container if it doesn't exist
      const container = document.querySelector(".container")
      if (container) {
        updatesContainer = document.createElement("div")
        updatesContainer.id = "updatesHistoryContainer"
        updatesContainer.className = "card"
        updatesContainer.style.marginTop = "40px"
        container.appendChild(updatesContainer)
      }
    }

    if (!updatesContainer) return

    updatesContainer.innerHTML = ""

    const heading = document.createElement("h3")
    heading.textContent = "Historique des Mises à Jour du Stream"
    heading.style.color = "#0052cc"
    heading.style.marginBottom = "20px"
    updatesContainer.appendChild(heading)

    if (snapshot.empty) {
      const emptyMsg = document.createElement("p")
      emptyMsg.textContent = "Aucune mise à jour pour ce stream."
      emptyMsg.style.color = "#999"
      updatesContainer.appendChild(emptyMsg)
      return
    }

    const updates = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    updates.forEach((update) => {
      const date = update.createdAt ? new Date(update.createdAt).toLocaleString("fr-FR") : "Maintenant"

      const updateItem = document.createElement("div")
      updateItem.className = "update-item"
      updateItem.innerHTML = `
        <div class="update-date">${date} - par ${update.userName}</div>
        <div class="update-content">${update.text}</div>
      `
      updatesContainer.appendChild(updateItem)
    })
  } catch (error) {
    console.error("Error loading updates:", error)
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", initializeApp)
