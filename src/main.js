import './style.css'
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';


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
     
      const data = docSnap.data(); // eventData yerine data dedim ki aşağıdaki HTML ile uyuşsun
      const id = docSnap.id;       // eventId yerine id dedim
      
      
      const doluluk = (data.katilimciSayisi / data.kontenjan) * 100;

      const userJoined = data.katilimcilar && currentUser && data.katilimcilar.includes(currentUser.uid)

      // --- loadEvents İÇİNDEKİ YENİ KART HTML ŞABLONU ---

const html = `
<div class="EtkinlikKartlari shadow-sm" style="height: auto; min-height: 120px; align-items: flex-start; padding-top: 15px;">
    
    <img src="https://ui-avatars.com/api/?name=${data.olusturanEmail}&background=random" class="KullaniciProfil">
    
    <div class="EtkinlikBaslik" style="padding-bottom: 10px;">
        <div class="d-flex justify-content-between align-items-center pe-5">
            <span style="font-size: 1.2rem;">${data.baslik}</span>
            <span class="badge bg-light text-dark border">
                <i class="far fa-calendar-alt text-warning me-1"></i> ${data.tarih || ''} 
                <i class="far fa-clock text-warning ms-2 me-1"></i> ${data.saat || ''}
            </span>
        </div>

        <div class="mt-2 mb-2">
            <small style="font-weight:normal; font-size:0.9rem; color:#666;">
                <i class="fas fa-map-marker-alt text-danger me-1"></i> ${data.konum}
            </small>
        </div>

        <p class="text-muted small fst-italic mb-0 border-start border-3 border-warning ps-2">
            "${data.aciklama || 'Açıklama yok.'}"
        </p>
    </div>

    <div class="KartAksiyonlari" style="align-self: center;">
        <button class="KatilButonu btn-katil" data-id="${id}" ${userJoined ? 'disabled' : ''}>
            ${userJoined ? 'Katıldın' : 'Katıl'}
        </button>
    </div>

    <div class="Kontenjan">
        <span>${data.katilimciSayisi}</span>
        <div class="Cizgi"></div>
        <span>${data.kontenjan}</span>
    </div>
</div>
`;    eventsContainer.innerHTML += html;
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
        // 1. Verileri HTML'den al
        const baslik = document.getElementById('create-title').value;
        const kontenjan = document.getElementById('create-quota').value;
        const konum = document.getElementById('create-location').value;
        const tarih = document.getElementById('create-date').value;  // YENİ
        const saat = document.getElementById('create-time').value;    // YENİ
        const aciklama = document.getElementById('create-desc').value;// YENİ

        // 2. Boş alan kontrolü
        if(!baslik || !konum || !tarih || !saat) return alert("Lütfen gerekli alanları doldurun!");

        try {
            // 3. Firebase'e Kaydet
            await addDoc(collection(db, "events"), {
                baslik, 
                konum,
                tarih,    // Veritabanına gidiyor
                saat,     // Veritabanına gidiyor
                aciklama, // Veritabanına gidiyor
                kontenjan: Number(kontenjan),
                katilimciSayisi: 1,
                katilimcilar: [currentUser.uid],
                olusturanEmail: currentUser.email,
                olusturulmaTarihi: new Date().toISOString()
            });
            
            // 4. Formu Temizle
            document.getElementById('create-title').value = "";
            document.getElementById('create-location').value = "";
            document.getElementById('create-desc').value = "";
            document.getElementById('create-date').value = "";
            document.getElementById('create-time').value = "";
            
            // 5. Modalı kapat ve listeyi yenile
            document.getElementById('view-create').classList.add('d-none');
            loadEvents();
            
        } catch (err) {
            alert("Hata: " + err.message);
        }
    });
}
window.router = router;