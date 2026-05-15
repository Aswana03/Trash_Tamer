// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDaHvZTjaAZEH3HoOIB6tWKqkStSlg8oJw",
  authDomain: "smart-waste-app-f3fe7.firebaseapp.com",
  projectId: "smart-waste-app-f3fe7",
  storageBucket: "smart-waste-app-f3fe7.firebasestorage.app",
  messagingSenderId: "702064162730",
  appId: "1:702064162730:web:9ba68dea3a8259e8fd5dd3"
};

 // FIREBASE CONFIG

 // 🔥 Firebase Config (your config here)
 
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore(); 

let bioAlertShown = false;
let nonBioAlertShown = false;

let bioNormalShown = false;
let nonBioNormalShown = false;

let currentUser = "user_test";

// 📌 SHOW PAGES
function signup() {
  const username = document.getElementById("signupUsername").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const errorBox = document.getElementById("signupError");

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {

      const user = userCredential.user;

      return db.collection("users").doc(user.email.replace(/\./g, "_")).set({
        username: username,
        email: email
      });

    })
    .then(() => {

      // 🔥 IMPORTANT FIX
      return auth.signOut();

    })
    .then(() => {

      showToast("Registered successfully 🎉 Please login");

      document.getElementById("signupPage").classList.add("hidden");
      document.getElementById("homePage").classList.add("hidden");
      document.getElementById("loginPage").classList.remove("hidden");

    })
    .catch((error) => {
      errorBox.innerText = error.message;
    });
}

function showSignup() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("signupPage").classList.remove("hidden");

  document.getElementById("loginError").innerText = "";
}

function showLogin() {
  document.getElementById("signupPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");

  document.getElementById("signupError").innerText = "";
}

// ✅ LOGIN FUNCTION
function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("loginError").innerText = "";
      showToast("Login successful ✅");
      loadUserProfile();

      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("homePage").classList.remove("hidden");
      document.getElementById("bottomNav").classList.remove("hidden");

      document.getElementById("signupPage").classList.add("hidden");


      loadBins(); // 👉 Load bins after login
    })
    .catch((error) => {

    const errorBox = document.getElementById("loginError");

    if (error.code === "auth/user-not-found") {
      errorBox.innerText = "Email not registered";
    }
    else if (error.code === "auth/wrong-password") {
      errorBox.innerText = "Incorrect password";
    }
    else if (error.code === "auth/invalid-credential") {
      errorBox.innerText = "Invalid email or password";
    }
    else {
      errorBox.innerText = "Login failed";
    }

  });
}


// 🚪 LOGOUT
function logout() {
  auth.signOut().then(() => {

    showToast("Logged out successfully 👋");

    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("bottomNav").classList.add("hidden");
  });
}

// 🔄 KEEP USER LOGGED IN (IMPORTANT)
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user.email.replace(/\./g, "_");

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("homePage").classList.remove("hidden");
    document.getElementById("bottomNav").classList.remove("hidden");

    loadBins();
  } else {
    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("bottomNav").classList.add("hidden");
  }
});

let selectedBin = "";

// 🔥 Load bins from Firebase
function loadBins() {
  const user = firebase.auth().currentUser;
  const binList = document.getElementById("binList");

  if (!user) return;

  db.collection("users")
    .doc(user.email.replace(/\./g, "_"))
    .collection("bins")
    .onSnapshot((snapshot) => {

      binList.innerHTML = "";

      if (snapshot.empty) {
        binList.innerHTML = "<p>No bins added yet</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const binId = doc.id;

        const binElement = document.createElement("div");
        binElement.className = "bin-item";

        binElement.innerHTML = `
          <span class="bin-name">${binId}</span>
          <span class="delete-icon">🗑️</span>
        `;

        // click to open
        binElement.onclick = () => selectBin(binId);

        // delete click
        const deleteBtn = binElement.querySelector(".delete-icon");
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteBin(binId);
        };

        binList.appendChild(binElement);
      });

    });
}

function selectBin(binId) {
  selectedBin = binId;

  document.getElementById("selectBinScreen").classList.remove("active");
  document.getElementById("homeScreen").classList.add("active");

  loadBinData(); // load that bin data
}

function loadBinData() {

  const user = firebase.auth().currentUser;

  db.collection("users")
    .doc(user.email.replace(/\./g, "_"))
    .collection("bins")
    .doc(selectedBin)
    .onSnapshot((doc) => {

      const data = doc.data();

      if (!data) return;

      const now = Date.now();
      const diff = now - data.lastUpdated;

      // ESP OFFLINE
      if (diff > 10000) {

        updateBinsUI(0, 0, true);

      } else {

        // ESP ONLINE
        updateBinsUI(data.bio, data.nonBio);

      }

      updateStatus(data.lastUpdated);

    });
}



function showToast(message, type = "default") {
  const toast = document.getElementById("toast");

  toast.innerText = message;
  toast.className = "toast show " + type;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function closePopup() {
  document.getElementById("binPopup").classList.add("hidden");
}

function createBin() {
  const binId = document.getElementById("binInput").value;
  const user = firebase.auth().currentUser;

  if (!binId) return showToast("Enter bin name");

  db.collection("users")
    .doc(user.email.replace(/\./g, "_"))
    .collection("bins")
    .doc(binId)
    .set({
      bio: 0,
      nonBio: 0,
      lastUpdated: Date.now()
    });

  showToast("Bin added ✅");
  closePopup();
}

function showProfile() {
  const user = auth.currentUser;

  if (user) {
    showToast("Logged in as: " + user.email);
  }
}

function goBack() {
  document.getElementById("homeScreen").classList.remove("active");
  document.getElementById("selectBinScreen").classList.add("active");
}


function openProfile() {
  const user = firebase.auth().currentUser;

  db.collection("users").doc(user.email.replace(/\./g, "_")).get()
    .then(doc => {
      if (doc.exists && doc.data().username) {
        profileUsername.innerText = doc.data().username;
      } else {
        profileUsername.innerText = user.email; // fallback
      }
    });

  showScreen("profileScreen");
}

function setActive(element) {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  element.classList.add("active");
}

function showScreen(screenId) {

  const screens = document.querySelectorAll(".screen");

  screens.forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");
}

function resetPassword() {
  const user = auth.currentUser;

  if (!user) return;

  auth.sendPasswordResetEmail(user.email)
    .then(() => {
      showToast("Password reset email sent 📩");
    })
    .catch(() => {
      showToast("Error sending reset email ❌");
    });
}

function addBin() {
  document.getElementById("binPopup").classList.remove("hidden");
}

function setActiveNav(element) {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  element.classList.add("active");
}

function openResetScreen() {
  showScreen('resetScreen');
}

function saveNewPassword() {
  const newPassword = document.getElementById("newPassword").value;

  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters");
    return;
  }

  const user = firebase.auth().currentUser;

  if (user) {
    user.updatePassword(newPassword)
      .then(() => {
        showToast("Password updated successfully ✅");
        showScreen('profileScreen');
      })
      .catch((error) => {
        showToast("Error: " + error.message);
      });
  }
}


let binToDelete = "";

function deleteBin(binId) {
  binToDelete = binId;
  document.getElementById("deletePopup").classList.remove("hidden");
}

function closeDeletePopup() {
  document.getElementById("deletePopup").classList.add("hidden");
}

function confirmDelete() {

  const userId = auth.currentUser.email.replace(/\./g, "_");

  db.collection("users")
    .doc(userId)
    .collection("bins")
    .doc(binToDelete)
    .delete()
    .then(() => {
      showToast("Bin deleted 🗑️", "success");
      closeDeletePopup();
      loadBins();
    })
    .catch(() => {
      showToast("Error deleting ❌", "error");
    });
}

function resetPasswordEmail() {
  const email = firebase.auth().currentUser.email;

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      showToast("Reset link sent to your email 📩");
    });
}

function loadUserProfile() {
  const user = firebase.auth().currentUser;

  db.collection("users").doc(user.email.replace(/\./g, "_")).get()
    .then(doc => {
      if (doc.exists) {
        document.getElementById("profileUsername").innerText = doc.data().username;
      }
    });
}

function confirmDeleteAccount() {
  document.getElementById("deleteAccountPopup").classList.remove("hidden");
}

function deleteAccount() {

  const user = auth.currentUser;
  if (!user) return;

  const uid = user.email.replace(/\./g, "_");

  // 🔥 Delete Firestore
  db.collection("users").doc(uid).delete()
    .then(() => {

      return user.delete();

    })
    .then(() => {

      showToast("Account deleted 🗑️");

      closeDeleteAccount();

      // 🔥 Proper redirect
      document.getElementById("homePage").classList.add("hidden");
      document.getElementById("loginPage").classList.remove("hidden");
      document.getElementById("bottomNav").classList.add("hidden");

    })
    .catch((error) => {

      if (error.code === "auth/requires-recent-login") {

        closeDeleteAccount();
        showToast("⚠️ Please login again");

        logout(); // 🔥 clean redirect

      } else {
        console.error(error);
      }

    });
}

function closeDeleteAccount() {
  document.getElementById("deleteAccountPopup").classList.add("hidden");
}

function forgotPassword() {
  const email = document.getElementById("loginEmail").value;

  if (!email) {
    showToast("Enter your email first ⚠️");
    return;
  }

  auth.sendPasswordResetEmail(email)
    .then(() => {
      showToast("Reset link sent to your email 📩");
    })
    .catch((error) => {
      showToast("Error: " + error.message);
    });
}

function updateStatus(lastUpdated) {

  const statusEl = document.getElementById("statusText");

  if (!lastUpdated) {
    statusEl.innerHTML = '<span class="dot"></span> OFFLINE';
    statusEl.classList.remove("live");
    statusEl.classList.add("offline");
    return;
  }

  const now = Date.now();
  const diff = now - lastUpdated;

  if (diff < 10000) {

    statusEl.innerHTML = '<span class="dot"></span> ONLINE';
    statusEl.classList.remove("offline");
    statusEl.classList.add("live");

  } else {

    statusEl.innerHTML = '<span class="dot"></span> OFFLINE';
    statusEl.classList.remove("live");
    statusEl.classList.add("offline");

  }
}

function updateBinsUI(bio, nonBio, isOffline = false) {

  // OFFLINE MODE
  if (isOffline) {

    document.getElementById("bioValue").innerText = "0%";
    document.getElementById("nonBioValue").innerText = "0%";

    document.getElementById("bioFill").style.height = "0%";
    document.getElementById("nonBioFill").style.height = "0%";

    return;
  }

  // ONLINE MODE
  document.getElementById("bioValue").innerText = bio + "%";
  document.getElementById("nonBioValue").innerText = nonBio + "%";

  document.getElementById("bioFill").style.height = bio + "%";
  document.getElementById("nonBioFill").style.height = nonBio + "%";

  // ================= BIO =================
  if (bio >= 90 && !bioAlertShown) {
    showToast("⚠️ Food bin almost full!", "error");
    bioAlertShown = true;
    bioNormalShown = false;
  }

  if (bio < 90 && !bioNormalShown) {
    showToast("✅ Food bin normal", "success");
    bioNormalShown = true;
    bioAlertShown = false;
  }

  // ================= NON BIO =================
  if (nonBio >= 90 && !nonBioAlertShown) {
    showToast("⚠️ Dry bin almost full!", "error");
    nonBioAlertShown = true;
    nonBioNormalShown = false;
  }

  if (nonBio < 90 && !nonBioNormalShown) {
    showToast("✅ Dry bin normal", "success");
    nonBioNormalShown = true;
    nonBioAlertShown = false;
  }
}