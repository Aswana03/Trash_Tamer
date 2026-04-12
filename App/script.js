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

// 📌 SHOW PAGES
function showSignup() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("signupPage").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("signupPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

// ✅ LOGIN FUNCTION
function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("✅ Login Successful");

      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("homePage").classList.remove("hidden");

      loadBins(); // 👉 Load bins after login
    })
    .catch((error) => {

      // ❌ ERROR HANDLING
      if (error.code === "auth/user-not-found") {
        alert("❌ Account not found! Please sign up first.");
        showSignup(); // 👉 move to signup page
      }
      else if (error.code === "auth/wrong-password") {
        alert("❌ Wrong password!");
      }
      else if (error.code === "auth/invalid-email") {
        alert("❌ Invalid email format!");
      }
      else {
        alert("❌ Error: " + error.message);
      }

    });
}

// ✅ SIGNUP FUNCTION
function signup() {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("🎉 Account Created Successfully!");

      // 👉 Directly go to app after signup
      document.getElementById("signupPage").classList.add("hidden");
      document.getElementById("homePage").classList.remove("hidden");
    })
    .catch((error) => {
      alert("❌ " + error.message);
    });
}

// 🚪 LOGOUT
function logout() {
  auth.signOut().then(() => {
    alert("👋 Logged out!");

    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  });
}

// 🔄 KEEP USER LOGGED IN (IMPORTANT)
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("signupPage").classList.add("hidden");
    document.getElementById("homePage").classList.remove("hidden");

    loadBins();
  } else {
    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  }
});

let selectedBin = "";

// 🔥 Load bins from Firebase
function loadBins() {
  db.collection("bins").get().then((snapshot) => {

    const binList = document.getElementById("binList");
    binList.innerHTML = "";

    snapshot.forEach((doc) => {
      const binId = doc.id;

      // Create UI card
      const div = document.createElement("div");
      div.className = "bin-card";
      div.innerText = binId;

      // Click to select bin
      div.onclick = () => selectBin(binId);

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

  db.collection("bins").doc(selectedBin)
    .onSnapshot((doc) => {

      if (doc.exists) {
        const data = doc.data();

        let bio = data.bio || 0;
        let nonBio = data.nonBio || 0;

        // Update UI
        document.getElementById("bioValue").innerText = bio + "%";
        document.getElementById("nonBioValue").innerText = nonBio + "%";

        document.getElementById("bioFill").style.height = bio + "%";
        document.getElementById("nonBioFill").style.height = nonBio + "%";
      }
    });
}