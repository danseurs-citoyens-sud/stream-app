const firebaseConfig = {
  apiKey: "AIzaSyC1fuoxZ1HDn3m307plx1uyEo7w8kzY40k",
  authDomain: "mon-app-streams.firebaseapp.com",
  projectId: "mon-app-streams",
  storageBucket: "mon-app-streams.firebasestorage.app",
  messagingSenderId: "1036043221887",
  appId: "1:1036043221887:web:86da7983613b0de585b84a",
}

let firebase = null
let auth = null
let db = null

function initializeFirebase() {
  return new Promise((resolve) => {
    if (typeof window.firebase !== "undefined") {
      firebase = window.firebase
      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig)
      }
      auth = firebase.auth()
      db = firebase.firestore()
      console.log("[v0] Firebase initialized successfully")
      resolve()
    } else {
      const checkInterval = setInterval(() => {
        if (typeof window.firebase !== "undefined") {
          firebase = window.firebase
          if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig)
          }
          auth = firebase.auth()
          db = firebase.firestore()
          clearInterval(checkInterval)
          console.log("[v0] Firebase initialized successfully")
          resolve()
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        resolve()
      }, 5000)
    }
  })
}

let currentUser = null
let currentStreamId = null
let currentEmployeeId = null
let currentEmployeeName = null
let currentDepartment = null
let isInitialized = false

function getCurrentPageName() {
  const path = window.location.pathname
  const filename = path.substring(path.lastIndexOf("/") + 1) || "index.html"
  return filename
}

function getUrlParameter(name) {
  const url = window.location.href
  name = name.replace(/[[\]]/g, "\\$&")
  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ""
  return decodeURIComponent(results[2].replace(/\+/g, " "))
}

// ============================================

// INITIALISATION DE L'APPLICATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = getCurrentPageName()
  if (currentPage === "employee-stream-tasks.html") {
    const streamIdFromUrl = getUrlParameter("streamId")
    if (streamIdFromUrl) {
      currentStreamId = streamIdFromUrl
      console.log("[v0] Stream ID loaded from URL:", currentStreamId)
      // Load tasks after setting streamId
      setTimeout(() => {
        loadTasks(currentStreamId)
      }, 1000)
    }
  }

  initializeApp()
})

function initializeApp() {
  initializeFirebase().then(() => {
    if (!auth || !db) {
      console.error("[v0] Firebase failed to initialize")
      alert("Erreur: Firebase n'a pas pu être initialisé. Vérifiez vos clés Firebase.")
      return
    }

    auth.onAuthStateChanged(async (user) => {
      const currentPage = getCurrentPageName()
      console.log("[v0] Current page:", currentPage)

      if (user) {
        currentUser = user
        try {
          const userDoc = await db.collection("users").doc(user.uid).get()
          if (userDoc.exists) {
            const userData = userDoc.data()

            if (userData.role === "admin") {
              if (currentPage !== "rh-dashboard.html" && currentPage !== "stream-tasks.html") {
                window.location.href = "rh-dashboard.html"
              } else {
                if (!isInitialized) {
                  isInitialized = true
                  initializeHRDashboard()
                }
                if (currentPage === "stream-tasks.html") {
                  loadStreamDetailsPage()
                }
              }
            } else {
              if (
                currentPage !== "employee-dashboard.html" &&
                currentPage !== "employee-stream-tasks.html" &&
                currentPage !== "stream-tasks.html"
              ) {
                window.location.href = "employee-dashboard.html"
              } else {
                if (!isInitialized) {
                  isInitialized = true
                  initializeEmployeeDashboard()
                }
                if (currentPage === "stream-tasks.html") {
                  loadStreamDetailsPage()
                }
              }
            }
          } else {
            window.location.href = "index.html"
          }
        } catch (error) {
          console.error("Erreur lors du chargement des données utilisateur:", error)
        }
      } else {
        // Added login.html to the allowed pages when logged out
        if (currentPage !== "index.html" && currentPage !== "login.html") {
          window.location.href = "index.html"
        }
      }
    })

    // ============================================

    // CONNEXION
    // ============================================

    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const email = document.getElementById("email").value
        const password = document.getElementById("password").value

        try {
          console.log("[v0] Attempting login with email:", email)
          await auth.signInWithEmailAndPassword(email, password)
          console.log("[v0] Login successful")
        } catch (error) {
          console.error("[v0] Login error:", error)
          let errorMessage = "Erreur de connexion: " + error.message

          if (error.code === "auth/user-not-found") {
            errorMessage = "Cet email n'existe pas. Vérifiez votre email ou créez un compte."
          } else if (error.code === "auth/wrong-password") {
            errorMessage = "Mot de passe incorrect."
          } else if (error.code === "auth/invalid-email") {
            errorMessage = "Email invalide."
          } else if (error.code === "auth/internal-error") {
            errorMessage =
              "Erreur Firebase. Vérifiez que:\n1. L'authentification Email/Mot de passe est activée\n2. Vos clés Firebase sont correctes\n3. Firestore Database existe"
          }

          alert(errorMessage)
        }
      })
    }

    const showRegister = document.getElementById("showRegister")
    if (showRegister) {
      showRegister.addEventListener("click", (e) => {
        e.preventDefault()
        showRegisterPage()
      })
    }

    const showLogin = document.getElementById("showLogin")
    if (showLogin) {
      showLogin.addEventListener("click", (e) => {
        e.preventDefault()
        showLoginPage()
      })
    }

    // ============================================

    // DÉCONNEXION
    // ============================================

    const logoutBtn = document.getElementById("logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        isInitialized = false
        auth.signOut()
      })
    }

    const hrLogoutBtn = document.getElementById("hrLogoutBtn")
    if (hrLogoutBtn) {
      hrLogoutBtn.addEventListener("click", () => {
        isInitialized = false
        auth.signOut()
      })
    }

    // ============================================

    // GESTION DES STREAMS (EMPLOYÉ)
    // ============================================

    const addStreamBtn = document.getElementById("addStreamBtn")
    if (addStreamBtn) {
      addStreamBtn.addEventListener("click", () => {
        document.getElementById("streamForm").style.display = "block"
      })
    }

    const cancelStreamBtn = document.getElementById("cancelStreamBtn")
    if (cancelStreamBtn) {
      cancelStreamBtn.addEventListener("click", () => {
        document.getElementById("streamForm").style.display = "none"
        document.getElementById("newStreamForm").reset()
      })
    }

    const newStreamForm = document.getElementById("newStreamForm")
    if (newStreamForm) {
      newStreamForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const title = document.getElementById("streamTitle").value
        const description = document.getElementById("streamDescription").value

        try {
          const userDoc = await db.collection("users").doc(currentUser.uid).get()
          const userData = userDoc.data()

          await db.collection("streams").add({
            title: title,
            description: description,
            userId: currentUser.uid,
            userName: userData.name,
            userDepartment: userData.department,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatesCount: 0,
            tasksCount: 0,
          })

          document.getElementById("streamForm").style.display = "none"
          document.getElementById("newStreamForm").reset()
          alert("Stream créé avec succès !")
          loadEmployeeStreams()
        } catch (error) {
          alert("Erreur: " + error.message)
        }
      })
    }

    const closeModal = document.querySelector("#updateModal .close")
    if (closeModal) {
      closeModal.addEventListener("click", () => {
        document.getElementById("updateModal").classList.remove("active")
        document.getElementById("updateForm").reset()
      })
    }

    const updateForm = document.getElementById("updateForm")
    if (updateForm) {
      updateForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const updateText = document.getElementById("updateText").value

        if (!currentStreamId) {
          alert("Erreur: Aucun stream sélectionné")
          return
        }

        try {
          await db.collection("updates").add({
            streamId: currentStreamId,
            text: updateText,
            userId: currentUser.uid,
            userName: document.getElementById("userName")?.textContent || "Utilisateur",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          })

          const streamRef = db.collection("streams").doc(currentStreamId)
          const streamDoc = await streamRef.get()
          const currentCount = streamDoc.data().updatesCount || 0
          await streamRef.update({
            updatesCount: currentCount + 1,
          })

          document.getElementById("updateText").value = ""
          alert("Mise à jour ajoutée avec succès !")
          loadUpdates(currentStreamId)
        } catch (error) {
          alert("Erreur: " + error.message)
        }
      })
    }

    const tasksCloseModal = document.querySelector("#tasksModal .tasks-close")
    if (tasksCloseModal) {
      tasksCloseModal.addEventListener("click", () => {
        document.getElementById("tasksModal").classList.remove("active")
        document.getElementById("taskForm").reset()
      })
    }

    const addTaskBtn = document.getElementById("addTaskBtn")
    if (addTaskBtn) {
      addTaskBtn.addEventListener("click", () => {
        document.getElementById("taskForm").style.display = "block"
      })
    }

    const cancelTaskBtn = document.getElementById("cancelTaskBtn")
    if (cancelTaskBtn) {
      cancelTaskBtn.addEventListener("click", () => {
        document.getElementById("taskForm").style.display = "none"
        document.getElementById("newTaskForm").reset()
      })
    }

    const taskForm = document.getElementById("newTaskForm")
    if (taskForm) {
      taskForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        console.log("[v0] Task form submitted, streamId:", currentStreamId)

        const title = document.getElementById("taskTitle").value
        const description = document.getElementById("taskDescription").value
        const startDate = document.getElementById("taskStartDate").value
        const endDate = document.getElementById("taskEndDate").value
        const status = document.getElementById("taskStatus").value

        if (!currentStreamId) {
          alert("Erreur: Aucun stream sélectionné")
          return
        }

        try {
          await db.collection("tasks").add({
            streamId: currentStreamId,
            title: title,
            description: description,
            startDate: firebase.firestore.Timestamp.fromDate(new Date(startDate)),
            endDate: firebase.firestore.Timestamp.fromDate(new Date(endDate)),
            status: status,
            notes: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          })

          const streamRef = db.collection("streams").doc(currentStreamId)
          const streamDoc = await streamRef.get()
          const currentCount = streamDoc.data().tasksCount || 0
          await streamRef.update({
            tasksCount: currentCount + 1,
          })

          document.getElementById("newTaskForm").reset()
          alert("Tâche ajoutée avec succès !")
          loadTasks(currentStreamId)
        } catch (error) {
          console.error("[v0] Error adding task:", error)
          alert("Erreur: " + error.message)
        }
      })
    }

    const editTaskCloseModal = document.querySelector("#editTaskModal .edit-task-close")
    if (editTaskCloseModal) {
      editTaskCloseModal.addEventListener("click", () => {
        document.getElementById("editTaskModal").classList.remove("active")
        document.getElementById("editTaskForm").reset()
      })
    }

    const editTaskForm = document.getElementById("editTaskForm")
    if (editTaskForm) {
      editTaskForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const taskId = document.getElementById("editTaskId").value
        const title = document.getElementById("editTaskTitle").value
        const description = document.getElementById("editTaskDescription").value
        const startDate = document.getElementById("editTaskStartDate").value
        const endDate = document.getElementById("editTaskEndDate").value
        const status = document.getElementById("editTaskStatus").value
        const notes = document.getElementById("editTaskNotes").value

        try {
          await db
            .collection("tasks")
            .doc(taskId)
            .update({
              title: title,
              description: description,
              startDate: firebase.firestore.Timestamp.fromDate(new Date(startDate)),
              endDate: firebase.firestore.Timestamp.fromDate(new Date(endDate)),
              status: status,
              notes: notes,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedBy: currentUser.uid,
              updatedByName: document.getElementById("userName")?.textContent || "Utilisateur",
            })

          document.getElementById("editTaskModal").classList.remove("active")
          document.getElementById("editTaskForm").reset()
          alert("Tâche modifiée avec succès !")
          loadTasks(currentStreamId)
        } catch (error) {
          alert("Erreur: " + error.message)
        }
      })
    }

    window.addEventListener("click", (e) => {
      const updateModal = document.getElementById("updateModal")
      const tasksModal = document.getElementById("tasksModal")
      const editTaskModal = document.getElementById("editTaskModal")

      if (e.target === updateModal) {
        updateModal.classList.remove("active")
        document.getElementById("updateForm").reset()
      }

      if (e.target === tasksModal) {
        tasksModal.classList.remove("active")
        document.getElementById("taskForm").reset()
      }

      if (e.target === editTaskModal) {
        editTaskModal.classList.remove("active")
        document.getElementById("editTaskForm").reset()
      }
    })

    const userForm = document.getElementById("userForm")
    if (userForm) {
      userForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const userId = document.getElementById("userId").value
        const name = document.getElementById("userName").value
        const email = document.getElementById("userEmail").value
        const password = document.getElementById("userPassword").value
        const department = document.getElementById("userDepartment").value
        const role = document.getElementById("userRole").value

        try {
          if (userId) {
            await db.collection("users").doc(userId).update({
              name: name,
              email: email,
              department: department,
              role: role,
            })

            const userAuth = firebase.auth().currentUser
            if (userAuth && userAuth.uid === userId && password) {
              await userAuth.updatePassword(password)
            }

            alert("Utilisateur modifié avec succès !")
          } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password)
            await db.collection("users").doc(userCredential.user.uid).set({
              name: name,
              email: email,
              department: department,
              role: role,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            })
            alert("Utilisateur créé avec succès !")
          }

          window.closeUserModal()
          loadUsersTable()
        } catch (error) {
          alert("Erreur: " + error.message)
        }
      })
    }

    // ============================================

    // INSCRIPTION
    // ============================================

    const registerForm = document.getElementById("registerForm")
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const name = document.getElementById("regName").value
        const email = document.getElementById("regEmail").value
        const password = document.getElementById("regPassword").value
        const department = document.getElementById("regDepartment").value
        const role = document.getElementById("regRole").value

        try {
          console.log("[v0] Attempting signup with email:", email)

          // Create user in Firebase Auth
          const userCredential = await auth.createUserWithEmailAndPassword(email, password)

          // Save user data to Firestore
          await db.collection("users").doc(userCredential.user.uid).set({
            name: name,
            email: email,
            department: department,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          })

          console.log("[v0] Signup successful for user:", email)
          alert("Compte créé avec succès ! Vous allez être redirigé...")

          // Reset form and switch back to login
          document.getElementById("registerForm").reset()
          showLoginPage()
        } catch (error) {
          console.error("[v0] Signup error:", error)
          let errorMessage = "Erreur d'inscription: " + error.message

          if (error.code === "auth/email-already-in-use") {
            errorMessage = "Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email."
          } else if (error.code === "auth/weak-password") {
            errorMessage = "Le mot de passe est trop faible. Utilisez au moins 6 caractères."
          } else if (error.code === "auth/invalid-email") {
            errorMessage = "Email invalide."
          } else if (error.code === "auth/operation-not-allowed") {
            errorMessage = "Erreur: L'authentification Email/Mot de passe n'est pas activée dans Firebase."
          }

          alert(errorMessage)
        }
      })
    }
  })
}

// ============================================

// INITIALISATION DU DASHBOARD RH
// ============================================

async function initializeHRDashboard() {
  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get()
    if (userDoc.exists) {
      const userData = userDoc.data()
      const hrUserNameElement = document.getElementById("hrUserName")
      if (hrUserNameElement) {
        hrUserNameElement.textContent = userData.name
      }

      loadDepartmentsInSidebar()

      loadHRStats()
      setTimeout(() => {
        loadChartsData()
      }, 500)
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation du dashboard RH:", error)
  }
}

// ============================================

// INITIALISATION DU DASHBOARD EMPLOYÉ
// ============================================

async function initializeEmployeeDashboard() {
  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get()
    if (userDoc.exists) {
      const userData = userDoc.data()
      const userNameElement = document.getElementById("userName")
      const userDepartmentElement = document.getElementById("userDepartment")

      if (userNameElement) {
        userNameElement.textContent = userData.name
      }
      if (userDepartmentElement) {
        userDepartmentElement.textContent = userData.department
      }

      loadEmployeeStreams()
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation du dashboard employé:", error)
  }
}

function showLoginPage() {
  const loginPage = document.getElementById("loginPage")
  const registerPage = document.getElementById("registerPage")
  if (loginPage) loginPage.style.display = "block"
  if (registerPage) registerPage.style.display = "none"
}

function showRegisterPage() {
  const loginPage = document.getElementById("loginPage")
  const registerPage = document.getElementById("registerPage")
  if (loginPage) loginPage.style.display = "none"
  if (registerPage) registerPage.style.display = "block"
}

window.showHRPage = (pageId) => {
  const pages = document.querySelectorAll(".hr-page")
  pages.forEach((page) => {
    page.style.display = "none"
  })

  const pageElement = document.getElementById(pageId)
  if (pageElement) {
    pageElement.style.display = "block"
  }

  if (pageId === "usersManagementPage") {
    loadUsersTable()
  }

  const sidebarItems = document.querySelectorAll(".sidebar-item, .department-item-sidebar")
  sidebarItems.forEach((item) => {
    item.classList.remove("active")
  })
}

window.backToDashboard = () => {
  window.showHRPage("dashboardPage")
  document.querySelectorAll(".sidebar-item, .department-item-sidebar").forEach((item) => {
    item.classList.remove("active")
  })
  document.querySelector(".sidebar-item").classList.add("active")
}

// ============================================

// CHARGEMENT DES STREAMS EMPLOYÉ
// ============================================

async function loadEmployeeStreams() {
  if (!currentUser) return

  try {
    const snapshot = await db.collection("streams").where("userId", "==", currentUser.uid).get()

    const streamsList = document.getElementById("streamsList")
    if (!streamsList) return

    streamsList.innerHTML = ""

    if (snapshot.empty) {
      const emptyRow = document.createElement("tr")
      emptyRow.innerHTML =
        '<td colspan="7" style="text-align: center; color: #999; padding: 20px;">Aucun stream créé pour le moment.</td>'
      streamsList.appendChild(emptyRow)
      return
    }

    const streams = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    streams.forEach((stream) => {
      const streamRow = createStreamCard(stream.id, stream, true)
      streamsList.appendChild(streamRow)
    })
  } catch (error) {
    console.error("Erreur lors du chargement des streams:", error)
  }
}

function createStreamCard(id, stream, isOwner) {
  const row = document.createElement("tr")
  row.id = `stream-${id}`

  const date = stream.createdAt ? new Date(stream.createdAt).toLocaleDateString("fr-FR") : "Aujourd'hui"

  row.innerHTML = `
    <td><strong>${stream.title}</strong></td>
    <td>${stream.description}</td>
    <td>${stream.userDepartment}</td>
    <td>${date}</td>
    <td><span class="updates-count">${stream.updatesCount || 0}</span></td>
    <td><span class="updates-count">${stream.tasksCount || 0}</span></td>
    <td>
      <div class="stream-actions-cell">
        ${
          isOwner
            ? `
          <button class="stream-action-btn" onclick="openUpdateModal('${id}')">📝 Mise à jour</button>
          <button class="stream-action-btn" onclick="viewStreamTasks('${id}')">✅ Tâches</button>
          <button class="stream-action-btn delete" onclick="confirmDeleteStream('${id}')">Supprimer</button>
        `
            : ""
        }
        <button class="stream-action-btn" onclick="viewUpdates('${id}')">📋 Voir</button>
      </div>
    </td>
  `

  return row
}

// ============================================

// GESTION DES MODALS DE MISE À JOUR
// ============================================

window.openUpdateModal = (streamId) => {
  currentStreamId = streamId
  const updateModal = document.getElementById("updateModal")
  if (updateModal) {
    updateModal.classList.add("active")
    document.getElementById("updateForm").style.display = "block"
    loadUpdates(streamId)
  }
}

window.viewUpdates = (streamId) => {
  currentStreamId = streamId
  const updateModal = document.getElementById("updateModal")
  if (updateModal) {
    updateModal.classList.add("active")
    document.getElementById("updateForm").style.display = "none"
    loadUpdates(streamId)
  }
}

// ============================================

// GESTION DES MODALS DE TÂCHES
// ============================================

window.viewStreamTasks = (streamId) => {
  window.location.href = `employee-stream-tasks.html?streamId=${streamId}`
}

// ============================================

// CHARGEMENT DES MISES À JOUR
// ============================================

async function loadUpdates(streamId) {
  try {
    const snapshot = await db.collection("updates").where("streamId", "==", streamId).get()

    const updatesList = document.getElementById("updatesList")
    if (!updatesList) return

    updatesList.innerHTML = ""

    if (snapshot.empty) {
      updatesList.innerHTML = '<p style="color: #999;">Aucune mise à jour pour le moment.</p>'
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
      updatesList.appendChild(updateItem)
    })
  } catch (error) {
    console.error("Erreur lors du chargement des mises à jour:", error)
  }
}

async function loadTasks(streamId) {
  try {
    const snapshot = await db.collection("tasks").where("streamId", "==", streamId).get()

    const tasksTableBody = document.getElementById("tasksTableBody")
    if (!tasksTableBody) return

    tasksTableBody.innerHTML = ""

    if (snapshot.empty) {
      const emptyRow = document.createElement("tr")
      emptyRow.innerHTML =
        '<td colspan="5" style="text-align: center; color: #999; padding: 15px;">Aucune tâche pour le moment.</td>'
      tasksTableBody.appendChild(emptyRow)
      return
    }

    const tasks = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
          startDate: data.startDate ? data.startDate.toDate() : null,
          endDate: data.endDate ? data.endDate.toDate() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    tasks.forEach((task) => {
      const taskRow = createTaskItem(task)
      tasksTableBody.appendChild(taskRow)
    })
  } catch (error) {
    console.error("Erreur lors du chargement des tâches:", error)
  }
}

function createTaskItem(task) {
  const row = document.createElement("tr")
  row.id = `task-${task.id}`

  const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString("fr-FR") : ""
  const endDate = task.endDate ? new Date(task.endDate).toLocaleDateString("fr-FR") : ""

  const statusClass = getStatusClass(task.status)

  row.innerHTML = `
    <td><strong>${task.title}</strong></td>
    <td>${task.description}</td>
    <td>${startDate} - ${endDate}</td>
    <td><span class="task-status-badge ${statusClass}">${task.status}</span></td>
    <td>
      <div class="task-actions-cell">
        <button class="task-action-btn edit" onclick="window.openEditTaskModal('${task.id}')">✏️ Modifier</button>
        <button class="task-action-btn delete" onclick="window.confirmDeleteTask('${task.id}')">🗑️ Supprimer</button>
      </div>
    </td>
  `

  return row
}

// ============================================

// FONCTIONS POUR LES STATUTS
// ============================================

function getStatusClass(status) {
  switch (status) {
    case "En cours":
      return "status-en-cours"
    case "Terminé":
      return "status-termine"
    case "En attente":
      return "status-en-attente"
    default:
      return "status-en-cours"
  }
}

// ============================================

// MISE À JOUR DU STATUT D'UNE TÂCHE
// ============================================

window.updateTaskStatus = async (taskId, newStatus) => {
  try {
    await db
      .collection("tasks")
      .doc(taskId)
      .update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
        updatedByName: document.getElementById("userName")?.textContent || "Utilisateur",
      })

    const taskElement = document.getElementById(`task-${taskId}`)
    if (taskElement) {
      const statusBadge = taskElement.querySelector(".status-badge")
      statusBadge.textContent = newStatus
      statusBadge.className = `status-badge ${getStatusClass(newStatus)}`

      taskElement.classList.add("task-updated")
      setTimeout(() => {
        taskElement.classList.remove("task-updated")
      }, 2000)
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error)
    alert("Erreur lors de la mise à jour du statut")
  }
}

window.openEditTaskModal = async (taskId) => {
  try {
    const taskDoc = await db.collection("tasks").doc(taskId).get()
    if (!taskDoc.exists) {
      alert("Tâche non trouvée")
      return
    }

    const task = taskDoc.data()

    document.getElementById("editTaskId").value = taskId
    document.getElementById("editTaskTitle").value = task.title
    document.getElementById("editTaskDescription").value = task.description

    const startDate = task.startDate ? new Date(task.startDate.toDate()).toISOString().split("T")[0] : ""
    const endDate = task.endDate ? new Date(task.endDate.toDate()).toISOString().split("T")[0] : ""

    document.getElementById("editTaskStartDate").value = startDate
    document.getElementById("editTaskEndDate").value = endDate
    document.getElementById("editTaskStatus").value = task.status
    document.getElementById("editTaskNotes").value = task.notes || ""

    document.getElementById("editTaskModal").classList.add("active")
  } catch (error) {
    console.error("Erreur lors du chargement de la tâche:", error)
    alert("Erreur lors du chargement de la tâche")
  }
}

// ============================================

// FERMETURE DU MODAL DE MODIFICATION DE TÂCHE
// ============================================

window.closeEditTaskModal = () => {
  document.getElementById("editTaskModal").classList.remove("active")
  document.getElementById("editTaskForm").reset()
}

// ============================================

// SUPPRESSION DE TÂCHES
// ============================================

window.confirmDeleteTask = (taskId) => {
  if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
    window.deleteTask(taskId)
  }
}

window.deleteTask = async (taskId) => {
  try {
    const taskDoc = await db.collection("tasks").doc(taskId).get()
    if (!taskDoc.exists) {
      alert("Tâche non trouvée")
      return
    }

    const taskData = taskDoc.data()
    const streamId = taskData.streamId

    await db.collection("tasks").doc(taskId).delete()

    const streamRef = db.collection("streams").doc(streamId)
    const streamDoc = await streamRef.get()
    const currentCount = streamDoc.data().tasksCount || 0
    if (currentCount > 0) {
      await streamRef.update({
        tasksCount: currentCount - 1,
      })
    }

    loadTasks(streamId)
    alert("Tâche supprimée avec succès !")
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error)
    alert("Erreur lors de la suppression de la tâche")
  }
}

// ============================================

// SUPPRESSION DE STREAMS
// ============================================

window.confirmDeleteStream = (streamId) => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir supprimer ce stream ? Cette action supprimera également toutes les tâches et mises à jour associées.",
    )
  ) {
    deleteStream(streamId)
  }
}

async function deleteStream(streamId) {
  try {
    const tasksSnapshot = await db.collection("tasks").where("streamId", "==", streamId).get()
    const taskDeletes = tasksSnapshot.docs.map((doc) => doc.ref.delete())
    await Promise.all(taskDeletes)

    const updatesSnapshot = await db.collection("updates").where("streamId", "==", streamId).get()
    const updateDeletes = updatesSnapshot.docs.map((doc) => doc.ref.delete())
    await Promise.all(updateDeletes)

    await db.collection("streams").doc(streamId).delete()

    loadEmployeeStreams()
    alert("Stream supprimé avec succès !")
  } catch (error) {
    console.error("Erreur lors de la suppression du stream:", error)
    alert("Erreur lors de la suppression du stream")
  }
}

async function loadDepartmentsInSidebar() {
  try {
    const usersSnapshot = await db.collection("users").where("role", "==", "employee").get()
    const departments = new Set()

    usersSnapshot.forEach((doc) => {
      const user = doc.data()
      departments.add(user.department)
    })

    const departmentsSidebar = document.getElementById("departmentsSidebar")
    if (!departmentsSidebar) return

    departmentsSidebar.innerHTML = ""

    Array.from(departments)
      .sort()
      .forEach((dept) => {
        const deptItem = document.createElement("div")
        deptItem.className = "department-item-sidebar"
        deptItem.textContent = dept
        deptItem.onclick = () => selectDepartmentFromSidebar(dept, deptItem)
        departmentsSidebar.appendChild(deptItem)
      })
  } catch (error) {
    console.error("Erreur lors du chargement des départements:", error)
  }
}

async function selectDepartmentFromSidebar(departmentName, element) {
  currentDepartment = departmentName

  document.querySelectorAll(".department-item-sidebar").forEach((item) => {
    item.classList.remove("active")
  })
  element.classList.add("active")

  await loadEmployeesForDepartment(departmentName)
}

async function loadEmployeesForDepartment(departmentName) {
  try {
    const usersSnapshot = await db
      .collection("users")
      .where("role", "==", "employee")
      .where("department", "==", departmentName)
      .get()

    const departmentPage = document.getElementById("departmentPage")
    const departmentTitle = document.getElementById("departmentTitle")
    const employeesTableBody = document.getElementById("employeesTableBody")

    if (departmentTitle) {
      departmentTitle.textContent = `Employés - ${departmentName}`
    }

    if (employeesTableBody) {
      employeesTableBody.innerHTML = ""

      if (usersSnapshot.empty) {
        employeesTableBody.innerHTML =
          '<tr><td colspan="4" style="text-align: center; color: #999;">Aucun employé dans ce département</td></tr>'
      } else {
        for (const userDoc of usersSnapshot.docs) {
          const user = userDoc.data()
          const streamsSnapshot = await db.collection("streams").where("userId", "==", userDoc.id).get()

          const row = document.createElement("tr")
          row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${streamsSnapshot.size}</td>
            <td>
              <button class="view-employee-btn" onclick="window.viewEmployeeDetails('${userDoc.id}', '${user.name}')">
                Voir détails
              </button>
            </td>
          `
          employeesTableBody.appendChild(row)
        }
      }
    }

    window.showHRPage("departmentPage")
  } catch (error) {
    console.error("Erreur lors du chargement des employés:", error)
  }
}

window.viewEmployeeDetails = async (employeeId, employeeName) => {
  currentEmployeeId = employeeId
  currentEmployeeName = employeeName

  try {
    const streamsSnapshot = await db.collection("streams").where("userId", "==", employeeId).get()

    const employeeDetailsTitle = document.getElementById("employeeDetailsTitle")
    const employeeStreamsContainer = document.getElementById("employeeStreamsContainer")

    if (employeeDetailsTitle) {
      employeeDetailsTitle.textContent = `Détails de ${employeeName}`
    }

    if (employeeStreamsContainer) {
      employeeStreamsContainer.innerHTML = ""

      if (streamsSnapshot.empty) {
        employeeStreamsContainer.innerHTML =
          '<p style="color: #999; text-align: center; padding: 20px;">Aucun stream pour cet employé.</p>'
      } else {
        const streams = streamsSnapshot.docs
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
            }
          })
          .sort((a, b) => b.createdAt - a.createdAt)

        for (const stream of streams) {
          const tasksSnapshot = await db.collection("tasks").where("streamId", "==", stream.id).get()

          const streamCard = document.createElement("div")
          streamCard.className = "employee-stream-card"

          const date = stream.createdAt ? new Date(stream.createdAt).toLocaleDateString("fr-FR") : "Aujourd'hui"

          let tasksHTML = ""
          if (tasksSnapshot.empty) {
            tasksHTML = '<p style="color: #999; padding: 10px;">Aucune tâche pour ce stream.</p>'
          } else {
            tasksHTML =
              '<table class="stream-tasks-table"><thead><tr><th>Titre</th><th>Description</th><th>Dates</th><th>Statut</th><th>Dernière mise à jour</th></tr></thead><tbody>'

            tasksSnapshot.forEach((taskDoc) => {
              const task = taskDoc.data()
              const startDate = task.startDate ? new Date(task.startDate.toDate()).toLocaleDateString("fr-FR") : ""
              const endDate = task.endDate ? new Date(task.endDate.toDate()).toLocaleDateString("fr-FR") : ""
              const updatedDate = task.updatedAt ? new Date(task.updatedAt.toDate()).toLocaleString("fr-FR") : ""

              const statusClass =
                task.status === "En cours" ? "en-cours" : task.status === "Terminé" ? "termine" : "en-attente"

              tasksHTML += `
                <tr>
                  <td><strong>${task.title}</strong></td>
                  <td>${task.description}</td>
                  <td>${startDate} - ${endDate}</td>
                  <td><span class="task-status-badge ${statusClass}">${task.status}</span></td>
                  <td>
                    <div>${updatedDate}</div>
                    ${task.updatedByName ? `<div class="task-update-info">par ${task.updatedByName}</div>` : ""}
                  </td>
                </tr>
              `
            })

            tasksHTML += "</tbody></table>"
          }

          streamCard.innerHTML = `
            <h4>${stream.title}</h4>
            <p style="color: #666; margin-bottom: 10px;">${stream.description}</p>
            <div style="font-size: 12px; color: #999; margin-bottom: 15px;">Créé le ${date}</div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h5 style="color: #667eea; margin-bottom: 10px;">Tâches du Stream</h5>
              ${tasksHTML}
              <!-- Added button to view full tasks page -->
              <button class="btn btn-primary" onclick="window.viewStreamDetailsPage('${stream.id}')" style="margin-top: 10px;">Voir les détails complets</button>
            </div>
          `

          employeeStreamsContainer.appendChild(streamCard)
        }
      }
    }

    window.showHRPage("employeeDetailsPage")
  } catch (error) {
    console.error("Erreur lors du chargement des détails de l'employé:", error)
  }
}

window.viewStreamDetailsPage = (streamId) => {
  window.location.href = `stream-tasks.html?streamId=${streamId}`
}

// ============================================

// STATISTIQUES RH (SEULEMENT DANS LE DASHBOARD)
// ============================================

async function loadHRStats() {
  try {
    const streamsSnapshot = await db.collection("streams").get()
    const usersSnapshot = await db.collection("users").where("role", "==", "employee").get()
    const tasksSnapshot = await db.collection("tasks").get()

    const totalStreams = streamsSnapshot.size
    const totalEmployees = usersSnapshot.size
    const totalTasks = tasksSnapshot.size

    let tasksEnCours = 0
    let tasksTerminees = 0
    let tasksEnAttente = 0

    tasksSnapshot.forEach((doc) => {
      const task = doc.data()
      switch (task.status) {
        case "En cours":
          tasksEnCours++
          break
        case "Terminé":
          tasksTerminees++
          break
        case "En attente":
          tasksEnAttente++
          break
      }
    })

    const statsHTML = `
      <div class="stat-card">
        <span class="stat-number">${totalStreams}</span>
        <span class="stat-label">Streams totaux</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${totalEmployees}</span>
        <span class="stat-label">Employés</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${totalTasks}</span>
        <span class="stat-label">Tâches totales</span>
      </div>
      <div class="stat-card stat-status-en-cours">
        <span class="stat-number">${tasksEnCours}</span>
        <span class="stat-label">Tâches en cours</span>
      </div>
      <div class="stat-card stat-status-termine">
        <span class="stat-number">${tasksTerminees}</span>
        <span class="stat-label">Tâches terminées</span>
      </div>
      <div class="stat-card stat-status-en-attente">
        <span class="stat-number">${tasksEnAttente}</span>
        <span class="stat-label">Tâches en attente</span>
      </div>
    `

    const statsContainer = document.getElementById("statsContainer")
    if (statsContainer) {
      statsContainer.innerHTML = statsHTML
    }
  } catch (error) {
    console.error("Erreur lors du chargement des statistiques:", error)
  }
}

async function loadChartsData() {
  try {
    const tasksSnapshot = await db.collection("tasks").get()
    const usersSnapshot = await db.collection("users").where("role", "==", "employee").get()

    let tasksEnCours = 0
    let tasksTerminees = 0
    let tasksEnAttente = 0

    tasksSnapshot.forEach((doc) => {
      const task = doc.data()
      switch (task.status) {
        case "En cours":
          tasksEnCours++
          break
        case "Terminé":
          tasksTerminees++
          break
        case "En attente":
          tasksEnAttente++
          break
      }
    })

    const departmentCounts = {}
    usersSnapshot.forEach((doc) => {
      const user = doc.data()
      departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1
    })

    const tasksStatusCanvas = document.getElementById("tasksStatusChart")
    if (tasksStatusCanvas) {
      drawTasksStatusChart(tasksStatusCanvas, tasksEnCours, tasksTerminees, tasksEnAttente)
    }

    const employeesByDepartmentCanvas = document.getElementById("employeesByDepartmentChart")
    if (employeesByDepartmentCanvas) {
      drawEmployeesByDepartmentChart(employeesByDepartmentCanvas, departmentCounts)
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données des graphiques:", error)
  }
}

function drawTasksStatusChart(canvas, enCours, terminees, enAttente) {
  const ctx = canvas.getContext("2d")
  const total = enCours + terminees + enAttente || 1

  const colors = ["#667eea", "#10b981", "#f59e0b"]
  const labels = ["En cours", "Terminées", "En attente"]
  const data = [enCours, terminees, enAttente]

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(centerX, centerY) - 40

  let currentAngle = -Math.PI / 2

  data.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI

    ctx.fillStyle = colors[index]
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.closePath()
    ctx.fill()

    const labelAngle = currentAngle + sliceAngle / 2
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.65)
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.65)

    ctx.fillStyle = "white"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${value}`, labelX, labelY)

    currentAngle += sliceAngle
  })

  let legendY = 20
  labels.forEach((label, index) => {
    ctx.fillStyle = colors[index]
    ctx.fillRect(20, legendY, 15, 15)
    ctx.fillStyle = "#333"
    ctx.font = "12px Arial"
    ctx.textAlign = "left"
    ctx.fillText(`${label}: ${data[index]}`, 40, legendY + 12)
    legendY += 25
  })
}

// ============================================

// DESSIN DU GRAPHIQUE DES EMPLOYÉS PAR DÉPARTEMENT
// ============================================

function drawEmployeesByDepartmentChart(canvas, departmentCounts) {
  const ctx = canvas.getContext("2d")
  const departments = Object.keys(departmentCounts)
  const counts = Object.values(departmentCounts)

  const colors = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe"]
  const barWidth = 50
  const maxCount = Math.max(...counts, 1)
  const padding = 50
  const chartHeight = canvas.height - 2 * padding

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw axes
  ctx.strokeStyle = "#ccc"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padding, canvas.height - padding)
  ctx.lineTo(canvas.width - 20, canvas.height - padding)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(padding, canvas.height - padding)
  ctx.lineTo(padding, 20)
  ctx.stroke()

  // Draw bars
  departments.forEach((dept, index) => {
    const count = counts[index]
    const barHeight = (count / maxCount) * chartHeight
    const x = padding + index * (barWidth + 30) + 15
    const y = canvas.height - padding - barHeight

    ctx.fillStyle = colors[index % colors.length]
    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw value on bar
    ctx.fillStyle = "white"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.fillText(count, x + barWidth / 2, y + barHeight / 2)
    ctx.fillStyle = "#333"
    ctx.font = "11px Arial"
    ctx.textAlign = "center"
    ctx.save()
    ctx.translate(x + barWidth / 2, canvas.height - padding + 20)
    ctx.rotate(-Math.PI / 6)
    ctx.fillText(dept, 0, 0)
    ctx.restore()
  })
}

window.openCreateUserModal = () => {
  document.getElementById("userId").value = ""
  document.getElementById("userForm").reset()
  document.getElementById("userModalTitle").textContent = "Créer un Utilisateur"
  document.getElementById("userPassword").required = true
  document.getElementById("passwordNote").style.display = "none"
  document.getElementById("userModal").classList.add("active")
}

window.openEditUserModal = async (userId) => {
  try {
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      alert("Utilisateur non trouvé")
      return
    }
    const user = userDoc.data()
    document.getElementById("userId").value = userId
    document.getElementById("userName").value = user.name
    document.getElementById("userEmail").value = user.email
    document.getElementById("userPassword").value = ""
    document.getElementById("userPassword").required = false
    document.getElementById("userDepartment").value = user.department
    document.getElementById("userRole").value = user.role
    document.getElementById("userModalTitle").textContent = "Modifier l'Utilisateur"
    document.getElementById("passwordNote").style.display = "block"
    document.getElementById("userModal").classList.add("active")
  } catch (error) {
    console.error("Erreur lors du chargement de l'utilisateur:", error)
    alert("Erreur lors du chargement de l'utilisateur")
  }
}

window.closeUserModal = () => {
  document.getElementById("userModal").classList.remove("active")
  document.getElementById("userForm").reset()
}

window.deleteUser = async (userId) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
    return
  }

  try {
    await db.collection("users").doc(userId).delete()
    alert("Utilisateur supprimé avec succès !")
    loadUsersTable()
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error)
    alert("Erreur lors de la suppression de l'utilisateur")
  }
}

async function loadUsersTable() {
  try {
    const snapshot = await db.collection("users").get()
    const usersTableBody = document.getElementById("usersTableBody")

    if (!usersTableBody) return

    usersTableBody.innerHTML = ""

    if (snapshot.empty) {
      usersTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; color: #999;">Aucun utilisateur</td></tr>'
      return
    }

    snapshot.forEach((doc) => {
      const user = doc.data()
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.department}</td>
        <td>
          <span class="role-badge ${user.role === "admin" ? "role-admin" : "role-employee"}">
            ${user.role === "admin" ? "Admin" : "Employé"}
          </span>
        </td>
        <td>
          <button class="edit-btn" onclick="window.openEditUserModal('${doc.id}')"> Modifier</button>
          <button class="delete-btn" onclick="window.deleteUser('${doc.id}')"> Supprimer</button>
        </td>
      `
      usersTableBody.appendChild(row)
    })
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error)
  }
}

async function loadStreamDetailsPage() {
  const streamId = getUrlParameter("streamId")
  if (!streamId) {
    console.error("[v0] No streamId provided")
    return
  }

  currentStreamId = streamId

  try {
    // Load stream details
    const streamDoc = await db.collection("streams").doc(streamId).get()
    if (!streamDoc.exists) {
      alert("Stream non trouvé")
      return
    }

    const stream = streamDoc.data()
    const streamTitleElement = document.getElementById("streamTitle")
    if (streamTitleElement) {
      streamTitleElement.textContent = `Détails Complets du Stream - ${stream.title}`
    }

    // Load all tasks for this stream with full details
    await loadFullTasksDetails(streamId)

    // Load all updates for this stream
    await loadFullStreamUpdates(streamId)
  } catch (error) {
    console.error("[v0] Error loading stream details:", error)
    alert("Erreur lors du chargement des détails du stream")
  }
}

async function loadFullTasksDetails(streamId) {
  try {
    const snapshot = await db.collection("tasks").where("streamId", "==", streamId).get()
    const tasksTableBody = document.getElementById("tasksTableBody")

    if (!tasksTableBody) return

    tasksTableBody.innerHTML = ""

    if (snapshot.empty) {
      const emptyRow = document.createElement("tr")
      emptyRow.innerHTML =
        '<td colspan="6" style="text-align: center; color: #999; padding: 15px;">Aucune tâche pour ce stream.</td>'
      tasksTableBody.appendChild(emptyRow)
      return
    }

    const tasks = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
          startDate: data.startDate ? data.startDate.toDate() : null,
          endDate: data.endDate ? data.endDate.toDate() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    tasks.forEach((task) => {
      const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString("fr-FR") : ""
      const endDate = task.endDate ? new Date(task.endDate).toLocaleDateString("fr-FR") : ""
      const updatedDate = task.updatedAt
        ? new Date(task.updatedAt).toLocaleString("fr-FR")
        : new Date(task.createdAt).toLocaleString("fr-FR")

      const statusClass = getStatusClass(task.status)

      const taskRow = document.createElement("tr")
      taskRow.id = `full-task-${task.id}`
      taskRow.style.cursor = "pointer"
      taskRow.style.transition = "background-color 0.2s"

      taskRow.innerHTML = `
        <td><strong>${task.title}</strong></td>
        <td>${task.description}</td>
        <td>${startDate}</td>
        <td>${endDate}</td>
        <td><span class="task-status-badge ${statusClass}">${task.status}</span></td>
        <td>
          <div>${updatedDate}</div>
          ${task.updatedByName ? `<div style="font-size: 11px; color: #999;">par ${task.updatedByName}</div>` : `<div style="font-size: 11px; color: #999;">Créée par ${task.createdByName || "Utilisateur"}</div>`}
        </td>
      `

      taskRow.addEventListener("click", () => showTaskHistoryModal(task.id, task))
      taskRow.addEventListener("mouseover", () => {
        taskRow.style.backgroundColor = "#f5f5f5"
      })
      taskRow.addEventListener("mouseout", () => {
        taskRow.style.backgroundColor = "transparent"
      })

      tasksTableBody.appendChild(taskRow)
    })
  } catch (error) {
    console.error("[v0] Error loading full tasks details:", error)
  }
}

async function loadFullStreamUpdates(streamId) {
  try {
    const snapshot = await db.collection("updates").where("streamId", "==", streamId).get()

    let updatesContainer = document.getElementById("updatesContainer")
    if (!updatesContainer) {
      // Create updates container if it doesn't exist
      const container = document.querySelector(".container")
      updatesContainer = document.createElement("div")
      updatesContainer.id = "updatesContainer"
      updatesContainer.className = "card"
      updatesContainer.style.marginTop = "30px"
      container.appendChild(updatesContainer)
    }

    updatesContainer.innerHTML = ""

    const title = document.createElement("h3")
    title.textContent = "Historique des Mises à Jour du Stream"
    updatesContainer.appendChild(title)

    if (snapshot.empty) {
      const emptyMsg = document.createElement("p")
      emptyMsg.style.color = "#999"
      emptyMsg.textContent = "Aucune mise à jour pour ce stream."
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

    const updatesTimeline = document.createElement("div")
    updatesTimeline.style.display = "flex"
    updatesTimeline.style.flexDirection = "column"
    updatesTimeline.style.gap = "15px"

    updates.forEach((update) => {
      const date = new Date(update.createdAt).toLocaleString("fr-FR")

      const updateItem = document.createElement("div")
      updateItem.style.borderLeft = "3px solid #667eea"
      updateItem.style.paddingLeft = "15px"
      updateItem.style.paddingTop = "10px"
      updateItem.style.paddingBottom = "10px"
      updateItem.style.backgroundColor = "#f8f9fa"
      updateItem.style.borderRadius = "4px"
      updateItem.style.padding = "15px"

      updateItem.innerHTML = `
        <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${date}</div>
        <div style="color: #666; margin-bottom: 8px;">Par: <strong>${update.userName}</strong></div>
        <div style="color: #555; line-height: 1.5;">${update.text}</div>
      `

      updatesTimeline.appendChild(updateItem)
    })

    updatesContainer.appendChild(updatesTimeline)
  } catch (error) {
    console.error("[v0] Error loading stream updates:", error)
  }
}

function showTaskHistoryModal(taskId, taskData) {
  const modal = document.getElementById("editTaskModal")
  const modalContent = modal.querySelector(".modal-content")

  const createdDate = new Date(taskData.createdAt).toLocaleString("fr-FR")
  const updatedDate = taskData.updatedAt ? new Date(taskData.updatedAt).toLocaleString("fr-FR") : createdDate

  const historyHTML = `
    <span class="close edit-task-close">&times;</span>
    <h3>Historique de la Tâche: ${taskData.title}</h3>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="color: #333; margin-bottom: 10px;">Informations Complètes</h4>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="font-weight: bold; width: 30%; padding: 5px 0;">Titre:</td>
          <td style="padding: 5px 0;">${taskData.title}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Description:</td>
          <td style="padding: 5px 0;">${taskData.description}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Date de début:</td>
          <td style="padding: 5px 0;">${taskData.startDate ? new Date(taskData.startDate).toLocaleDateString("fr-FR") : "N/A"}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Date de fin:</td>
          <td style="padding: 5px 0;">${taskData.endDate ? new Date(taskData.endDate).toLocaleDateString("fr-FR") : "N/A"}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Statut actuel:</td>
          <td style="padding: 5px 0;"><span class="task-status-badge ${getStatusClass(taskData.status)}">${taskData.status}</span></td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Notes:</td>
          <td style="padding: 5px 0;">${taskData.notes || "Aucune note"}</td>
        </tr>
      </table>
    </div>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
      <h4 style="color: #333; margin-bottom: 10px;">Timeline des Mises à Jour</h4>
      <div style="border-left: 3px solid #667eea; padding-left: 15px;">
        <div style="padding: 10px 0;">
          <div style="font-weight: bold; color: #333;">Création</div>
          <div style="color: #666; font-size: 13px;">${createdDate}</div>
        </div>
        ${
          taskData.updatedAt && taskData.updatedAt !== taskData.createdAt
            ? `
          <div style="padding: 10px 0; border-top: 1px solid #ddd; margin-top: 10px; padding-top: 15px;">
            <div style="font-weight: bold; color: #333;">Dernière modification</div>
            <div style="color: #666; font-size: 13px;">${updatedDate}</div>
            ${taskData.updatedByName ? `<div style="color: #999; font-size: 12px;">Par: ${taskData.updatedByName}</div>` : ""}
          </div>
        `
            : ""
        }
      </div>
    </div>
  `

  modalContent.innerHTML = historyHTML

  // Reattach close handler
  const closeBtn = modalContent.querySelector(".edit-task-close")
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove("active")
    }
  }

  modal.classList.add("active")
}

const currentPageName = getCurrentPageName()
if (currentPageName === "stream-tasks.html") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      loadStreamDetailsPage()
    }, 500)
  })
}

// Setup back button
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn")
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back()
    })
  }
})
