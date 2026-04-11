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


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// NAVIGATION
function showScreen(id, el){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  el.classList.add("active");

  if(id==="mapScreen"){
    setTimeout(()=>{
      google.maps.event.trigger(map,"resize");
      map.setCenter(currentLocation);
    },300);
  }
}

// AUTH
function showSignup(){ loginPage.classList.add("hidden"); signupPage.classList.remove("hidden"); }
function showLogin(){ signupPage.classList.add("hidden"); loginPage.classList.remove("hidden"); }

function signup(){
  auth.createUserWithEmailAndPassword(signupEmail.value, signupPassword.value)
  .then(showHome);
}

function login(){
  auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
  .then(showHome);
}

function logout(){ location.reload(); }

// HOME
function showHome(){
  loginPage.classList.add("hidden");
  signupPage.classList.add("hidden");
  homePage.classList.remove("hidden");

  listenData();
  initChart();
  getLocation();
  trackTruck(); // 🚛 LIVE TRACKING
  setInterval(syncData, 5000);
}

// FIRESTORE DATA
function listenData(){
  db.collection("wasteData").doc("current")
  .onSnapshot(doc=>{
    if(!doc.exists) return;

    let d=doc.data();
    bioValue.innerText=d.bio+"%";
    nonBioValue.innerText=d.nonBio+"%";
 
    bioFill.style.boxShadow = "0 0 25px #00c853";
    nonBioFill.style.boxShadow = "0 0 25px #ff5252";

    updateChart(d.bio);
  });
}

// 🗺️ MAP
let map;
let currentLocation;

function getLocation(){
  navigator.geolocation.getCurrentPosition(
    pos=>{
      currentLocation={
        lat:pos.coords.latitude,
        lng:pos.coords.longitude
      };
      initMap(currentLocation);
    },
    ()=>{
      currentLocation={lat:11.8745,lng:75.3704};
      initMap(currentLocation);
    }
  );
}

function initMap(loc){
  map=new google.maps.Map(document.getElementById("map"),{
    center:loc,
    zoom:14
  });

  new google.maps.Marker({
    position:loc,
    map:map,
    title:"You"
  });
}

// 🚛 REAL TRUCK TRACKING
let truckMarker;

function trackTruck(){
  db.collection("trucks").doc("truck1")
  .onSnapshot(doc=>{
    if(!doc.exists) return;

    let d = doc.data();
    let newPos = new google.maps.LatLng(d.lat, d.lng);

    if(!truckMarker){
      truckMarker = new google.maps.Marker({
        position: newPos,
        map: map,
        icon: "https://maps.google.com/mapfiles/ms/icons/truck.png"
      });
    } else {
      animateTruck(truckMarker, newPos);
    }
  });
}

/* SMOOTH MOVEMENT */
function animateTruck(marker, newPos){
  let steps = 30;
  let delay = 10;

  let oldPos = marker.getPosition();

  let deltaLat = (newPos.lat() - oldPos.lat()) / steps;
  let deltaLng = (newPos.lng() - oldPos.lng()) / steps;

  for(let i=0;i<steps;i++){
    setTimeout(()=>{
      let lat = oldPos.lat() + deltaLat * i;
      let lng = oldPos.lng() + deltaLng * i;
      marker.setPosition({lat,lng});
    }, i * delay);
  }
}

// 📊 CHART
let chart;

 function initChart(){
  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Bio Waste %",
        data: [],
        borderWidth: 3,
        tension: 0.4
      }]
    },
    options: {
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          min: 0,
          max: 100
        }
      }
    }
  });
}
function updateChart(value){
  let time = new Date().toLocaleTimeString();

  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(value);

  if(chart.data.labels.length > 8){
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();

  updateInsights(value); // 🔥 ADD THIS
}


 
function syncData() {

  let bio = Math.floor(Math.random() * 100);
  let nonBio = Math.floor(Math.random() * 100);

  // UPDATE HEIGHT
  bioFill.style.height = bio + "%";
  nonBioFill.style.height = nonBio + "%";

  bioValue.innerText = bio + "%";
  nonBioValue.innerText = nonBio + "%";

  // 🌊 ADD TILT EFFECT
  bioFill.classList.add("tilt");
  nonBioFill.classList.add("tilt");

  // REMOVE AFTER ANIMATION
  setTimeout(() => {
    bioFill.classList.remove("tilt");
    nonBioFill.classList.remove("tilt");
  }, 600);
}
function updateInsights(value){
  let text = "";

  if(value < 50){
    text = "🟢 Bin level is safe";
  }
  else if(value < 80){
    text = "🟡 Bin is filling, monitor closely";
  }
  else{
    text = "🔴 Bin almost full! Collection needed";
  }

  // SIMPLE PREDICTION
  let predictedTime = Math.max(0, (100 - value) * 2);

  text += "<br>⏳ Estimated full in: " + predictedTime + " mins";

  document.getElementById("insightText").innerHTML = text;
}