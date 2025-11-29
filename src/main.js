import './style.css'
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';


import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, addDoc, doc, getDoc, arrayUnion, increment, updateDoc } from "firebase/firestore";
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
<div class="EtkinlikKartlari shadow-sm">
    
    <img src="https://ui-avatars.com/api/?name=${data.olusturanEmail}&background=random" 
         alt="Kullanici" class="KullaniciProfil">
    
    <div class="EtkinlikBaslik">
        ${data.baslik} 
        <br>
        <small style="font-weight:normal; font-size:0.8rem;">📍 ${data.konum}</small>
    </div>

    <div class="KartAksiyonlari">
        <button class="KatilButonu btn-katil" data-id="${id}" ${userJoined ? 'disabled' : ''}>
            ${userJoined ? 'Katıldın' : 'Katıl'}
        </button>
      <i class="fa-solid fa-chevron-down ok-ikonu" data-id="${id}" style="cursor:pointer"></i>
    </div>

    <!-- details will be inserted below this card when requested -->

    <div class="Kontenjan">
        <span>${data.katilimciSayisi}</span>
        <div class="Kontenjan"></div> <span>${data.kontenjan}</span>
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

        // Detay açma/kapama için ok ikonuna tıklama dinleyicisi
        document.querySelectorAll('.ok-ikonu').forEach(icon => {
          icon.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            await showEventDetails(id);
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

// Etkinlik detaylarını getir ve göster (sade ve anlaşılır)
async function showEventDetails(docId) {
  if (!docId) return;

  try {
    // Hangi karta ait olduğunu bul
    const icon = document.querySelector(`.ok-ikonu[data-id="${docId}"]`);
    if (!icon) return;
    const card = icon.closest('.EtkinlikKartlari');
    if (!card) return;

    // Zaten altında bir detay div'i varsa onu kapat (toggle)
    const next = card.nextElementSibling;
    if (next && next.classList.contains('EtkinlikDetayInline') && next.dataset.id === docId) {
      next.remove();
      return;
    }

    // Geçici yükleniyor göstergesi ekle
    const detailDiv = document.createElement('div');
    detailDiv.className = 'EtkinlikDetayInline';
    detailDiv.dataset.id = docId;
    detailDiv.textContent = 'Yükleniyor...';
    card.parentNode.insertBefore(detailDiv, card.nextSibling);

    // Veriyi çek
    const snap = await getDoc(doc(db, 'events', docId));
    if (!snap.exists()) {
      detailDiv.textContent = 'Etkinlik bulunamadı.';
      return;
    }

    const data = snap.data();

    // Saat:dakika biçiminde zaman
    let timeStr = '-';
    if (data.olusturulmaTarihi) {
      const d = new Date(data.olusturulmaTarihi);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      timeStr = `${hh}:${mm}`;
    }

    // Açıklamayı güvenli şekilde göster (basit kaçış)
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const aciklamaHtml = data.aciklama ? escapeHtml(data.aciklama) : '<span class="text-muted">Açıklama yok.</span>';

    // Basit, okunaklı detay içeriği
    detailDiv.innerHTML = `
      <div style="display:flex; flex-direction:column;">
        <div style="font-size:0.95rem; color:#222;"><strong>Oluşturan:</strong> ${data.olusturanEmail || '-'}</div>
        <div style="font-size:0.9rem; color:#666; margin-top:6px;"><strong>Zaman:</strong> ${timeStr}</div>
        <div class="detay-aciklama">${aciklamaHtml}</div>
      </div>
    `;

  } catch (err) {
    console.error('Detay yükleme hatası:', err);
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