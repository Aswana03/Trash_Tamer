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

let currentUser = "user_test";

// 📌 SHOW PAGES
function signup() {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const errorBox = document.getElementById("signupError");

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {

      errorBox.innerText = "";

      showToast("Registered successfully 🎉 Please login");

      document.getElementById("signupPage").classList.add("hidden");
      document.getElementById("loginPage").classList.remove("hidden");

    })
    .catch((error) => {

      if (error.code === "auth/email-already-in-use") {
        errorBox.innerText = "User already exists";
      }
      else if (error.code === "auth/weak-password") {
        errorBox.innerText = "Password must be at least 6 characters";
      }
      else if (error.code === "auth/invalid-email") {
        errorBox.innerText = "Invalid email format";
      }
      else {
        errorBox.innerText = error.message;
      }

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

      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("homePage").classList.remove("hidden");
      document.getElementById("bottomNav").classList.remove("hidden");

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
    currentUser = user.uid;

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

  db.collection("users")
    .doc(currentUser)
    .collection("bins")
    .get()
    .then((snapshot) => {

      const binList = document.getElementById("binList");
      binList.innerHTML = "";

      if (snapshot.empty) {
        binList.innerHTML = "<p>No bins found. Add one!</p>";
        return;
      }

      snapshot.forEach((doc) => {

      const binId = doc.id;

      const div = document.createElement("div");
      div.className = "bin-card";

      // 🧱 Bin name
      const name = document.createElement("span");
      name.innerText = binId;
      name.onclick = () => selectBin(binId);

      // 🗑️ Delete icon
      const del = document.createElement("span");
      del.innerHTML = "🗑️";
      del.className = "delete-icon";

      del.onclick = (e) => {
        e.stopPropagation(); // ❗ prevents opening bin
        deleteBin(binId);
      };

      div.appendChild(name);
      div.appendChild(del);

      binList.appendChild(div);
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

  db.collection("users")
    .doc(currentUser)
    .collection("bins")
    .doc(selectedBin)
    .onSnapshot((doc) => {

      if (!doc.exists) return;

      const data = doc.data();

      let bio = data.bio || 0;
      let nonBio = data.nonBio || 0;

      document.getElementById("bioValue").innerText = bio + "%";
      document.getElementById("nonBioValue").innerText = nonBio + "%";

      document.getElementById("bioFill").style.height = bio + "%";
      document.getElementById("nonBioFill").style.height = nonBio + "%";

      // ✅ STATUS LOGIC
      const statusText = document.getElementById("statusText");

      let lastTime = 0;

      if (data.lastUpdated) {
        lastTime = data.lastUpdated.toMillis();
      }

      if (lastTime && (Date.now() - lastTime < 10000)) {
        statusText.innerHTML = '<span class="dot"></span> LIVE';
        statusText.classList.remove("offline");
        statusText.classList.add("live");
      } else {
        statusText.innerHTML = '<span class="dot"></span> OFFLINE';
        statusText.classList.remove("live");
        statusText.classList.add("offline");
      }

    }); // ✅ THIS WAS MISSING

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
  const binId = document.getElementById("binInput").value.trim();

  if (!binId) {
    showToast("Enter valid bin ID", "error");
    return;
  }

  const userId = auth.currentUser.uid;

  db.collection("users")
    .doc(userId)
    .collection("bins")
    .doc(binId)
    .set({
      bio: 0,
      nonBio: 0,
      lastUpdated: Date.now()
    })
    .then(() => {
      showToast("Bin added successfully", "success");
      closePopup();
      loadBins();
    });
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
  showScreen("profileScreen");

  const user = auth.currentUser;
  if (user) {
    document.getElementById("profileEmail").innerText = user.email;
  }
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

function deleteBin(binId) {

  const userId = auth.currentUser.uid;

  if (!confirm("Delete this bin?")) return;

  db.collection("users")
    .doc(userId)
    .collection("bins")
    .doc(binId)
    .delete()
    .then(() => {
      showToast("Bin deleted 🗑️", "success");
      loadBins();
    })
    .catch(() => {
      showToast("Error deleting bin ❌", "error");
    });
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

  const userId = auth.currentUser.uid;

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