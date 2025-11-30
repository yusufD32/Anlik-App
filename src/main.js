import './style.css'
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, addDoc, doc, getDoc, arrayUnion, arrayRemove, increment, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// HTML Elementlerini Seçme
const loginBolumu = document.getElementById('view-login');
const homeBolumu = document.getElementById('view-home');
const olusturmaBolumu = document.getElementById('view-create'); 
const eventsContainer = document.getElementById('events-list');
const registerBolumu = document.getElementById('view-register');
const profilBolumu = document.getElementById('view-profile');

// Router Sistemi
const router = (viewId) => {
  [loginBolumu, homeBolumu, olusturmaBolumu, registerBolumu, profilBolumu].forEach(el => el && el.classList.add('d-none'));
  
  const target = document.getElementById(viewId);
  if (target) { 
    target.classList.remove('d-none');
    if(viewId === 'view-profile') loadProfileData();
  }
};

// --- PROFİL VERİLERİNİ YÜKLE ---
async function loadProfileData() {
    if(!currentUser) return;

    document.getElementById('profile-email').textContent = currentUser.email.split('@')[0];
    document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${currentUser.email}&background=random&size=200`;

    const listCreated = document.getElementById('list-created');
    const listJoined = document.getElementById('list-joined');

    listCreated.innerHTML = '<div class="spinner-border text-warning"></div>';
    listJoined.innerHTML = '<div class="spinner-border text-warning"></div>';

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const snapshot = await getDoc(userDocRef);

      if(snapshot.exists()) {
        const userData = snapshot.data();
        document.getElementById('profile-name').textContent = userData.adSoyad || 'İsimsiz';
        document.getElementById('profile-username').textContent = userData.kullaniciAdi || '@kullanici';
      } else {
        document.getElementById('profile-name').textContent = currentUser.email.split('@')[0];
        document.getElementById('profile-username').textContent = '@' + currentUser.email.split('@')[0];
      }

      // Etkinlikleri çek
      const eventsSnap = await getDocs(collection(db, "events"));
      
      let createdHTML = '';
      let joinedHTML = '';
      let createdCount = 0;
      let joinedCount = 0;

      eventsSnap.forEach(docSnap => {
          const data = docSnap.data();

          const miniCard = `
          <div class="EtkinlikKartlari shadow-sm bg-white mb-2" style="height:auto; min-height:80px;">
              <div class="EtkinlikBaslik ps-3">
                  ${data.baslik} <br> 
                  <small class="text-muted fw-normal">${data.tarih || ''} - ${data.saat || ''}</small>
              </div>
          </div>`;

          if (data.olusturanEmail === currentUser.email) {
              createdHTML += miniCard;
              createdCount++;
          }

          if (data.katilimcilar && data.katilimcilar.includes(currentUser.uid)) {
              joinedHTML += miniCard;
              joinedCount++;
          }
      });

      listCreated.innerHTML = createdHTML || '<div class="text-muted fst-italic">Henüz etkinlik oluşturmadın.</div>';
      listJoined.innerHTML = joinedHTML || '<div class="text-muted fst-italic">Henüz bir etkinliğe katılmadın.</div>';

      document.getElementById('stat-created').textContent = createdCount;
      document.getElementById('stat-joined').textContent = joinedCount;
      
    } catch (error) {
        console.error(error);
        listCreated.innerHTML = '<div class="text-danger">Veri yüklenemedi.</div>';
        listJoined.innerHTML = '<div class="text-danger">Veri yüklenemedi.</div>';
    }
}

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
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    }
    catch (error) {
      if(errorDiv) errorDiv.textContent = "Giriş başarısız: " + error.message;
    }
  });
}

// Kayıt Sayfasına Git
const showRegisterBtn = document.getElementById('show-register-btn');
if(showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => router('view-register'));
}

// Login'e Geri Dön
const backToLoginBtn = document.getElementById('back-to-login-btn');
if(backToLoginBtn) {
  backToLoginBtn.addEventListener('click', () => router('view-login'));
}

// Çıkış Yap Butonları
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) {
  logoutBtn.addEventListener('click', () => signOut(auth));
}

const logoutBtn2 = document.getElementById('logout-btn-2');
if(logoutBtn2) {
  logoutBtn2.addEventListener('click', () => signOut(auth));
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

    const events = [];
    snapshot.forEach(docSnap => {
      events.push({ id: docSnap.id, data: docSnap.data() });
    });

    events.sort((a, b) => {
      const timeA = a.data.olusturulmaTarihi || '';
      const timeB = b.data.olusturulmaTarihi || '';
      return timeB.localeCompare(timeA);
    });

    events.forEach(({ id, data }) => {
      const userJoined = data.katilimcilar && currentUser && data.katilimcilar.includes(currentUser.uid);
      
      // Katılma/Çıkma geçmişini kontrol et
      const joinHistory = data.katilimGecmisi?.[currentUser.uid] || { count: 0, lastAction: null };
      const canLeave = joinHistory.count < 2; // 2 kereden az değişiklik yaptıysa çıkabilir
      
      // Cooldown kontrolü (son işlemden 30 saniye geçti mi?)
      const now = Date.now();
      const cooldownPeriod = 30000; // 30 saniye
      const inCooldown = joinHistory.lastAction && (now - joinHistory.lastAction < cooldownPeriod);
      const remainingTime = inCooldown ? Math.ceil((cooldownPeriod - (now - joinHistory.lastAction)) / 1000) : 0;

      let buttonHTML = '';
      if (userJoined) {
        if (!canLeave) {
          buttonHTML = `<button class="KatilButonu btn-disabled" disabled>Limit Doldu</button>`;
        } else if (inCooldown) {
          buttonHTML = `<button class="KatilButonu btn-disabled" disabled>Bekle (${remainingTime}s)</button>`;
        } else {
          buttonHTML = `<button class="KatilButonu btn-cik" data-id="${id}">Çık (${2 - joinHistory.count} hak)</button>`;
        }
      } else {
        if (inCooldown) {
          buttonHTML = `<button class="KatilButonu btn-disabled" disabled>Bekle (${remainingTime}s)</button>`;
        } else {
          buttonHTML = `<button class="KatilButonu btn-katil" data-id="${id}">Katıl</button>`;
        }
      }

      const html = `
<div class="EtkinlikKartlari shadow-sm">
    <img src="https://ui-avatars.com/api/?name=${data.olusturanEmail}&background=random" class="KullaniciProfil">
    
    <div class="EtkinlikBaslik" style="padding-bottom: 10px;">
        <div class="d-flex justify-content-between align-items-center pe-5">
            <span style="font-size: 1.2rem;">${data.baslik}</span>
        </div>

        <div class="mt-2 mb-2">
            <small style="font-weight:normal; font-size:0.9rem; color:#666;">
                <i class="fas fa-map-marker-alt text-danger me-1"></i> ${data.konum}
            </small>
        </div>
        <span class="badge bg-light text-dark border">
                <i class="far fa-calendar-alt text-warning me-1"></i> ${data.tarih || ''} 
                <i class="far fa-clock text-warning ms-2 me-1"></i> ${data.saat || ''}
        </span>
    </div>

    <div class="KartAksiyonlari" style="align-self: center;">
        ${buttonHTML}
        <i class="fa-solid fa-chevron-down ok-ikonu" data-id="${id}" style="cursor:pointer"></i>
    </div>

    <div class="Kontenjan">
        <span>${data.katilimciSayisi}<br>—</span>
        <span>${data.kontenjan}</span>
    </div>
</div>
`;
      eventsContainer.innerHTML += html;
    });

    // Katıl butonları
    document.querySelectorAll('.btn-katil').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        katil(id);
      });
    });

    // Çık butonları
    document.querySelectorAll('.btn-cik').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        cik(id);
      });
    });

    // Detay açma/kapama
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
    const eventSnap = await getDoc(eventRef);
    const data = eventSnap.data();
    
    const joinHistory = data.katilimGecmisi?.[currentUser.uid] || { count: 0, lastAction: null };
    
    // Cooldown kontrolü
    const now = Date.now();
    if (joinHistory.lastAction && (now - joinHistory.lastAction < 30000)) {
      alert("Lütfen 30 saniye bekleyin.");
      return;
    }
    
    await updateDoc(eventRef, {
      katilimcilar: arrayUnion(currentUser.uid),
      katilimciSayisi: increment(1),
      [`katilimGecmisi.${currentUser.uid}`]: {
        count: joinHistory.count,
        lastAction: now
      }
    });
    
    loadEvents(); 
  } catch (error) {
    console.error("Katılma hatası:", error);
    alert("Bir hata oluştu: " + error.message);
  }
}

// --- ÇIKMA FONKSİYONU ---
async function cik(docId) {
  if(!currentUser) return;
  
  try {
    const eventRef = doc(db, "events", docId);
    const eventSnap = await getDoc(eventRef);
    const data = eventSnap.data();
    
    const joinHistory = data.katilimGecmisi?.[currentUser.uid] || { count: 0, lastAction: null };
    
    // Limit kontrolü
    if (joinHistory.count >= 2) {
      alert("Katılma/çıkma limitine ulaştınız (maksimum 2 değişiklik).");
      return;
    }
    
    // Cooldown kontrolü
    const now = Date.now();
    if (joinHistory.lastAction && (now - joinHistory.lastAction < 30000)) {
      alert("Lütfen 30 saniye bekleyin.");
      return;
    }
    
    await updateDoc(eventRef, {
      katilimcilar: arrayRemove(currentUser.uid),
      katilimciSayisi: increment(-1),
      [`katilimGecmisi.${currentUser.uid}`]: {
        count: joinHistory.count + 1,
        lastAction: now
      }
    });
    
    loadEvents();
  } catch (error) {
    console.error("Çıkma hatası:", error);
    alert("Bir hata oluştu: " + error.message);
  }
}

// Etkinlik detaylarını göster
async function showEventDetails(docId) {
  if (!docId) return;

  try {
    const icon = document.querySelector(`.ok-ikonu[data-id="${docId}"]`);
    if (!icon) return;
    const card = icon.closest('.EtkinlikKartlari');
    if (!card) return;

    const next = card.nextElementSibling;
    if (next && next.classList.contains('EtkinlikDetayInline') && next.dataset.id === docId) {
      next.remove();
      return;
    }

    const detailDiv = document.createElement('div');
    detailDiv.className = 'EtkinlikDetayInline';
    detailDiv.dataset.id = docId;
    detailDiv.textContent = 'Yükleniyor...';
    card.parentNode.insertBefore(detailDiv, card.nextSibling);

    const snap = await getDoc(doc(db, 'events', docId));
    if (!snap.exists()) {
      detailDiv.textContent = 'Etkinlik bulunamadı.';
      return;
    }

    const data = snap.data();

    let timeStr = '-';
    if (data.olusturulmaTarihi) {
      const d = new Date(data.olusturulmaTarihi);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      timeStr = `${hh}:${mm}`;
    }

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

// --- KAYIT OLMA İŞLEMİ ---
const registerBtn = document.getElementById('register-btn');
if(registerBtn) {
    registerBtn.addEventListener('click', async () => {
        const name = document.getElementById('reg-name').value;
        const username = document.getElementById('reg-username').value;
        const phone = document.getElementById('reg-phone').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        if(!email || !password || !name) return alert("Lütfen zorunlu alanları doldurun.");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                adSoyad: name,
                kullaniciAdi: username || email.split('@')[0],
                telefon: phone,
                email: email,
                kayitTarihi: new Date().toISOString()
            });

            alert("Kayıt başarılı! Giriş yapılıyor...");

        } catch (error) {
            console.error(error);
            alert("Kayıt Hatası: " + error.message);
        }
    });
}

// --- ETKİNLİK OLUŞTURMA İŞLEMLERİ ---
const showCreateBtn = document.getElementById('btn-show-create'); 
if(showCreateBtn) showCreateBtn.addEventListener('click', () => router('view-create'));

const cancelCreateBtn = document.getElementById('btn-cancel-create'); 
if(cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => router('view-home'));

const openAboutBtn = document.getElementById('btn-open-about');
const aboutOverlay = document.getElementById('view-about');
const closeAboutBtn = document.getElementById('btn-close-about');
if (openAboutBtn && aboutOverlay) {
  openAboutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    aboutOverlay.classList.remove('d-none');
  });
}
if (closeAboutBtn && aboutOverlay) {
  closeAboutBtn.addEventListener('click', () => {
    aboutOverlay.classList.add('d-none');
  });
}

const saveBtn = document.getElementById('btn-save');
if(saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const baslik = document.getElementById('create-title').value;
        const kontenjan = document.getElementById('create-quota').value;
        const konum = document.getElementById('create-location').value;
        const tarih = document.getElementById('create-date').value; 
        const saat = document.getElementById('create-time').value;   
        const aciklama = document.getElementById('create-desc').value;

        if(!baslik || !konum || !tarih || !saat) return alert("Lütfen gerekli alanları doldurun!");

        try {
            await addDoc(collection(db, "events"), {
                baslik, 
                konum,
                tarih,
                saat,
                aciklama,
                kontenjan: Number(kontenjan),
                katilimciSayisi: 1,
                katilimcilar: [currentUser.uid],
                katilimGecmisi: {}, // Yeni alan: Her kullanıcının değişiklik sayısını tutar
                olusturanEmail: currentUser.email,
                olusturulmaTarihi: new Date().toISOString()
            });
            
            document.getElementById('create-title').value = "";
            document.getElementById('create-location').value = "";
            document.getElementById('create-desc').value = "";
            document.getElementById('create-date').value = "";
            document.getElementById('create-time').value = "";
            
            document.getElementById('view-create').classList.add('d-none');
            loadEvents();
            
        } catch (err) {
            alert("Hata: " + err.message);
        }
    });
}



// --- 3. YENİ EKLENEN KISIM: PROFİL DÜZENLEME İŞLEMLERİ ---

// A) Modalı Açma
const btnEditOpen = document.getElementById('btn-edit-profile-open');
const modalEditProfile = document.getElementById('view-edit-profile');

if(btnEditOpen) {
    btnEditOpen.addEventListener('click', async () => {
        if(!currentUser) return;
        
        // Modalı göster
        modalEditProfile.classList.remove('d-none');
        
        // Mevcut ismi inputa yaz
        document.getElementById('edit-fullname').value = currentUser.displayName || "";
        
        // Veritabanından telefonu çekip inputa yaz
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            if(userSnap.exists()) {
                document.getElementById('edit-phone').value = userSnap.data().phone || "";
            }
        } catch(e) {
            console.log("Telefon çekme hatası", e);
        }
    });
}

// B) Modalı Kapatma
const btnEditClose = document.getElementById('btn-close-edit-profile');
if(btnEditClose) {
    btnEditClose.addEventListener('click', () => {
        modalEditProfile.classList.add('d-none');
    });
}

// C) Kaydetme İşlemi
const btnSaveProfile = document.getElementById('btn-save-profile');
if(btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
        const newName = document.getElementById('edit-fullname').value;
        const newPhone = document.getElementById('edit-phone').value;
        
        // Butonu "Kaydediliyor..." yap
        const originalText = btnSaveProfile.textContent;
        btnSaveProfile.textContent = "Kaydediliyor...";
        btnSaveProfile.disabled = true;

        try {
            // 1. Firebase Auth Profilini Güncelle (İsim için)
            if(currentUser.displayName !== newName) {
                await updateProfile(currentUser, {
                    displayName: newName
                });
            }

            // 2. Firestore 'users' koleksiyonuna telefon ve ismi kaydet
            // setDoc: Varsa günceller, yoksa oluşturur (merge:true sayesinde)
            await setDoc(doc(db, "users", currentUser.uid), {
                displayName: newName,
                phone: newPhone,
                email: currentUser.email
            }, { merge: true });

            // Başarılı
            
            modalEditProfile.classList.add('d-none');
            
            // Profil sayfasını yenile (ekrandaki veriler güncellensin)
            loadProfileData();

        } catch (error) {
            console.error(error);
            alert("Hata oluştu: " + error.message);
        } finally {
            // Butonu eski haline getir
            btnSaveProfile.textContent = originalText;
            btnSaveProfile.disabled = false;
        }
    });
}


window.router = router;