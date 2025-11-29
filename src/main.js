import './style.css'
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

// HATA 1: 'onAuthStateChaged' yanlış yazılmıştı (n harfi eksikti)
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, addDoc, doc, arrayUnion, increment, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// HTML Elementlerini Seçme
const loginBolumu = document.getElementById('view-login');
const homeBolumu = document.getElementById('view-home');
const olusturmaBolumu = document.getElementById('view-create'); 
const eventsContainer = document.getElementById('events-list');

// Router Sistemi
const router = (viewId) => {
  // Bütün bölümleri gizle
  [loginBolumu, homeBolumu, olusturmaBolumu].forEach(el => el && el.classList.add('d-none'));
  
  // İstenileni aç
  const target = document.getElementById(viewId);
  if (target) target.classList.remove('d-none');
};

let currentUser = null;

// Firebase Oturum Dinleyici
onAuthStateChanged(auth, (user) => {
  const loadingElement = document.getElementById('loading');
  // HATA 2: 'loadingElemnet' yazım hatası vardı
  if (loadingElement) loadingElement.classList.add('d-none');

  if(user) {
    currentUser = user;
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn'); 

    if(userEmailSpan) userEmailSpan.textContent = user.email;
    if(logoutBtn) logoutBtn.classList.remove('d-none');

    router('view-home');
    loadEvents(); 
  } else {
    currentUser = null;
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.classList.add('d-none');
    
    router('view-login');
  }
});

// Giriş Yap Butonu
const loginBtn = document.getElementById('login-btn');
if(loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorDiv = document.getElementById('login-error');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    }
    catch (error) {
      if(errorDiv) errorDiv.textContent = "Giris basarisiz: " + error.message;
    }
  });
}

// Çıkış Yap Butonu
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) {
  logoutBtn.addEventListener('click', () => signOut(auth));
}

// Verileri Çekme Fonksiyonu
async function loadEvents() {
  if(!eventsContainer) return;
  eventsContainer.innerHTML = '<div class="text-center mt-5">Yükleniyor...</div>';

  try {
    const snapshot = await getDocs(collection(db, "events"));
    eventsContainer.innerHTML = '';

    if(snapshot.empty) {
      eventsContainer.innerHTML = '<p class="text-center">Henüz hiç etkinlik yok.</p>'
      return;
    }

    snapshot.forEach((docSnap => {
      // HATA 3: Değişken isimleri karışmıştı.
      const data = docSnap.data(); // eventData yerine data dedim ki aşağıdaki HTML ile uyuşsun
      const id = docSnap.id;       // eventId yerine id dedim
      
      
      const doluluk = (data.katilimciSayisi / data.kontenjan) * 100;

      const userJoined = data.katilimcilar && currentUser && data.katilimcilar.includes(currentUser.uid)

      const html = `
          <div class="col-md-6 mb-3">
              <div class="card border-0 shadow-sm" style="background-color: #fff8e1;">
                  <div class="card-body">
                      <div class="d-flex justify-content-between align-items-start">
                          <div>
                              <h5 class="card-title fw-bold mb-1">${data.baslik}</h5>
                              <small class="text-muted">📍 ${data.konum}</small>
                          </div>
                          <span class="badge bg-primary rounded-pill">${data.katilimciSayisi}/${data.kontenjan}</span>
                      </div>
                      
                      <div class="progress mt-3 mb-3" style="height: 6px;">
                          <div class="progress-bar bg-warning" role="progressbar" style="width: ${doluluk}%"></div>
                      </div>

                      <div class="d-grid">
                          <button class="btn btn-${userJoined ? 'secondary' : 'outline-dark'} btn-sm fw-bold btn-katil" data-id="${id}" ${userJoined ? 'disabled' : ''}>
                              ${userJoined ? 'Katıldın' : 'Katıl'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
          `;
          eventsContainer.innerHTML += html;
      }));

      
      document.querySelectorAll('.btn-katil').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const id = e.target.getAttribute('data-id');
              katil(id);
          });
      });

  } catch (error) {
      console.error("Veri çekme hatası:", error);
      eventsContainer.innerHTML = '<div class="alert alert-danger">Veriler yüklenemedi.</div>';
  }
}

// --- KATILMA FONKSİYONU ---
async function katil(docId) {
  if(!currentUser) return;
  
  try {
      const eventRef = doc(db, "events", docId);
      
      await updateDoc(eventRef, {
          katilimcilar: arrayUnion(currentUser.uid),
          katilimciSayisi: increment(1)
      });
      
      loadEvents(); 
  } catch (error) {
      console.error("Katılma hatası:", error);
      alert("Bir hata oluştu: " + error.message);
  }
}

// --- ETKİNLİK OLUŞTURMA İŞLEMLERİ ---
const showCreateBtn = document.getElementById('btn-show-create'); 
if(showCreateBtn) showCreateBtn.addEventListener('click', () => router('view-create'));

const cancelCreateBtn = document.getElementById('btn-cancel-create'); 
if(cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => router('view-home'));

const saveBtn = document.getElementById('btn-save');
if(saveBtn) {
  saveBtn.addEventListener('click', async () => {
      const baslik = document.getElementById('create-title').value;
      const kontenjan = document.getElementById('create-quota').value;
      const konum = document.getElementById('create-location').value;

      if(!baslik || !konum) return alert("Lütfen alanları doldurun");

      try {
          await addDoc(collection(db, "events"), {
              baslik, konum, 
              kontenjan: Number(kontenjan),
              katilimciSayisi: 1,
              katilimcilar: [currentUser.uid],
              olusturanEmail: currentUser.email,
              olusturulmaTarihi: new Date().toISOString()
          });
          
          document.getElementById('create-title').value = "";
          document.getElementById('create-location').value = "";
          
          router('view-home');
          loadEvents(); // loadevents = verileri cek
          
      } catch (err) {
          alert("Hata: " + err.message);
      }
  });
}

window.router = router;