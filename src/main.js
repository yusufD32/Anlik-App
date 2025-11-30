import './style.css'
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { collection, getDocs, addDoc, doc, getDoc, arrayUnion, increment, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// HTML Elementlerini Seçme
const loginBolumu = document.getElementById('view-login');
const homeBolumu = document.getElementById('view-home');
const olusturmaBolumu = document.getElementById('view-create'); 
const eventsContainer = document.getElementById('events-list');
const registerBolumu = document.getElementById('view-register');
const profilBolumu = document.getElementById('view-profile');
const editProfileModal = document.getElementById('view-edit-profile'); // Yeni eklenen modal

// Router Sistemi
const router = (viewId) => {
  // Tüm sayfaları gizle
  [loginBolumu, homeBolumu, olusturmaBolumu, registerBolumu, profilBolumu, editProfileModal].forEach(el => el && el.classList.add('d-none'));
  
  const target = document.getElementById(viewId);
  if (target) { 
    target.classList.remove('d-none');
    if(viewId === 'view-profile') loadProfileData();
  }
};

// --- PROFİL VERİLERİNİ YÜKLE (TEK VE TEMİZ FONKSİYON) ---
async function loadProfileData() {
    if(!currentUser) return;

    // Elementleri tanımla
    const nameEl = document.getElementById('profile-name');
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const phoneEl = document.getElementById('profile-phone');
    const avatarEl = document.getElementById('profile-avatar');
    
    // Varsayılan değerler
    emailEl.textContent = currentUser.email;
    let displayName = currentUser.displayName || currentUser.email.split('@')[0];
    
    // Avatarı yükle
    avatarEl.src = `https://ui-avatars.com/api/?name=${displayName}&background=random&size=200`;

    // Firestore'dan detaylı verileri çek
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // İsim (Veritabanı > Auth > Varsayılan)
            const finalName = userData.adSoyad || userData.displayName || displayName;
            nameEl.textContent = finalName;
            
            // Kullanıcı adı
            usernameEl.textContent = userData.kullaniciAdi ? `@${userData.kullaniciAdi}` : `@${currentUser.email.split('@')[0]}`;
            
            // Telefon (Varsa göster, yoksa uyarı)
            const phone = userData.telefon || userData.phone;
            phoneEl.innerHTML = phone ? `<i class="fas fa-phone-alt me-1"></i> ${phone}` : '<i class="fas fa-phone-slash me-1"></i> Telefon eklenmemiş';

            // Avatarı güncel isme göre yenile
            avatarEl.src = `https://ui-avatars.com/api/?name=${finalName}&background=random&size=200`;

        } else {
            // Veritabanında yoksa sadece Auth bilgisini kullan
            nameEl.textContent = displayName;
            usernameEl.textContent = '@' + currentUser.email.split('@')[0];
            phoneEl.textContent = "Telefon bilgisi yok";
        }
    } catch (e) {
        console.log("Profil verisi çekme hatası:", e);
    }

    // İstatistikler ve Etkinlik Listeleri
    const listCreated = document.getElementById('list-created');
    const listJoined = document.getElementById('list-joined');

    listCreated.innerHTML = '<div class="spinner-border text-warning"></div>';
    listJoined.innerHTML = '<div class="spinner-border text-warning"></div>';

    try {
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
        listCreated.innerHTML = '<div class="text-danger">Hata oluştu.</div>';
        listJoined.innerHTML = '<div class="text-danger">Hata oluştu.</div>';
    }
}

let currentUser = null;

// Firebase Oturum Dinleyici
onAuthStateChanged(auth, (user) => {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) loadingElement.classList.add('d-none');

  if(user) {
    currentUser = user;
    const logoutBtn = document.getElementById('logout-btn'); 
    if(logoutBtn) logoutBtn.classList.remove('d-none');

    // Sidebar'daki Hoşgeldiniz kısmını güncelle
    const sidebarNameLabel = document.getElementById('sidebar-username');
    if(sidebarNameLabel) {
        sidebarNameLabel.textContent = user.displayName || user.email.split('@')[0];
    }

    router('view-home');
    loadEvents(); 
  } else {
    currentUser = null;
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
if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

const logoutBtn2 = document.getElementById('logout-btn-2');
if(logoutBtn2) logoutBtn2.addEventListener('click', () => signOut(auth));

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
      
      const joinHistory = data.katilimGecmisi?.[currentUser.uid] || { count: 0, lastAction: null };
      const canLeave = joinHistory.count < 2; 
      
      const now = Date.now();
      const cooldownPeriod = 30000; 
      const inCooldown = joinHistory.lastAction && (now - joinHistory.lastAction < cooldownPeriod);
      const remainingTime = inCooldown ? Math.ceil((cooldownPeriod - (now - joinHistory.lastAction)) / 1000) : 0;

      let buttonHTML = '';
      if (userJoined) {
        if (!canLeave) {
          buttonHTML = `<button class="KatilButonu btn-disabled" disabled>Limit Doldu</button>`;
        } else if (inCooldown) {
          buttonHTML = `<button class="KatilButonu btn-disabled" disabled>Bekle (${remainingTime}s)</button>`;
        } else {
          // Çıkış butonu şimdilik pasif veya alert verebilir, istersen aktif edebiliriz
          buttonHTML = `<button class="KatilButonu btn-cik" data-id="${id}" style="background-color:#95a5a6;">Katıldın</button>`;
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

      document.querySelectorAll('.btn-katil').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const id = e.target.getAttribute('data-id');
              katil(id);
          });
      });

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

// --- DETAY GÖSTERME (Açıklama + Katılımcılar) ---
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
      icon.style.transform = "rotate(0deg)";
      return;
    }

    icon.style.transform = "rotate(180deg)";

    const detailDiv = document.createElement('div');
    detailDiv.className = 'EtkinlikDetayInline';
    detailDiv.dataset.id = docId;
    detailDiv.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-warning"></div> Yükleniyor...</div>';
    card.parentNode.insertBefore(detailDiv, card.nextSibling);

    const snap = await getDoc(doc(db, 'events', docId));
    if (!snap.exists()) {
      detailDiv.textContent = 'Etkinlik bulunamadı.';
      return;
    }
    const data = snap.data();

    let participantsHtml = '<span class="text-muted fst-italic small">Henüz kimse katılmamış.</span>';
    
    if (data.katilimcilar && data.katilimcilar.length > 0) {
        const promises = data.katilimcilar.map(uid => getDoc(doc(db, "users", uid)));
        const userSnaps = await Promise.all(promises);
        
        const namesList = userSnaps.map(us => {
            if(us.exists()) {
                const uData = us.data();
                const uName = uData.adSoyad || uData.displayName || uData.email;
                return `<li class="mb-1"><i class="fas fa-user-circle text-muted me-2"></i>${uName}</li>`;
            } else {
                return `<li class="mb-1 text-muted"><i class="fas fa-user-slash me-2"></i>Bilinmeyen Kullanıcı</li>`;
            }
        }).join('');
        
        participantsHtml = `<ul class="list-unstyled mb-0 ps-2" style="font-size:0.9rem;">${namesList}</ul>`;
    }

    let timeStr = '-';
    if (data.olusturulmaTarihi) {
      const d = new Date(data.olusturulmaTarihi);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      timeStr = `${hh}:${mm}`;
    }

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    const aciklamaHtml = data.aciklama ? escapeHtml(data.aciklama) : '<span class="text-muted">Açıklama yok.</span>';

    detailDiv.innerHTML = `
      <div class="row">
        <div class="col-md-7 border-end">
            <h6 class="fw-bold text-dark mb-2">📌 Etkinlik Detayı</h6>
            <div class="detay-aciklama mb-3 text-secondary">${aciklamaHtml}</div>
            <div class="small text-muted">
                <div><strong>👑 Oluşturan:</strong> ${data.olusturanEmail || '-'}</div>
                <div><strong>🕒 Oluşturulma Saati:</strong> ${timeStr}</div>
            </div>
        </div>
        <div class="col-md-5">
            <h6 class="fw-bold text-dark mb-2">
                👥 Katılımcılar <span class="badge bg-warning text-white rounded-pill ms-1">${data.katilimciSayisi || 0}</span>
            </h6>
            <div class="bg-white p-2 rounded border shadow-sm" style="max-height: 150px; overflow-y: auto;">
                ${participantsHtml}
            </div>
        </div>
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

            await updateProfile(user, { displayName: name }); 

            await setDoc(doc(db, "users", user.uid), {
                adSoyad: name,
                displayName: name, 
                kullaniciAdi: username || email.split('@')[0],
                telefon: phone,
                phone: phone, 
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
                katilimGecmisi: {}, 
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

// --- PROFİL DÜZENLEME İŞLEMLERİ ---

// A) Modalı Açma
const btnEditOpen = document.getElementById('btn-edit-profile-open');
const modalEditProfile = document.getElementById('view-edit-profile');

if(btnEditOpen) {
    btnEditOpen.addEventListener('click', async () => {
        if(!currentUser) return;
        
        modalEditProfile.classList.remove('d-none');
        
        const currentName = document.getElementById('profile-name').textContent;
        document.getElementById('edit-fullname').value = currentName !== "İsimsiz" ? currentName : "";
        
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            if(userSnap.exists()) {
                const uData = userSnap.data();
                document.getElementById('edit-phone').value = uData.telefon || uData.phone || "";
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
        
        const originalText = btnSaveProfile.textContent;
        btnSaveProfile.textContent = "Kaydediliyor...";
        btnSaveProfile.disabled = true;

        try {
            if(currentUser.displayName !== newName) {
                await updateProfile(currentUser, {
                    displayName: newName
                });
            }

            await setDoc(doc(db, "users", currentUser.uid), {
                displayName: newName,
                adSoyad: newName, 
                phone: newPhone,
                telefon: newPhone,
                email: currentUser.email
            }, { merge: true });
            
            modalEditProfile.classList.add('d-none');
            
            const sbName = document.getElementById('sidebar-username');
            if(sbName) sbName.textContent = newName;

            loadProfileData();

            alert("Profil başarıyla güncellendi!");

        } catch (error) {
            console.error(error);
            alert("Hata oluştu: " + error.message);
        } finally {
            btnSaveProfile.textContent = originalText;
            btnSaveProfile.disabled = false;
        }
    });
}

window.router = router;