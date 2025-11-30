# 🚀 Anlık: Gençliğin Enerjisi İçin Anlık Etkinlik Platformu

> Gençliğin dinamik enerjisini ve anlık karar alma hızını etkinliklere taşıyan çözüm ortağınız.

## ✨ Proje Özeti

**Anlık**, gençlerin yüksek enerjisine ve anlık karar alma dinamiklerine uyum sağlayamayan etkinlik oluşturma ve katılım sistematiği problemine çözüm getiren bir web platformudur. Amacımız, kullanıcıları birkaç tıkla etkinliklere ulaştırarak ve ücretsiz etkinlikleri görünür kılarak gençlerin canı sıkıldığında uğrayacağı **ana nokta** olmaktır.

## 🎯 Çözüm Odaklandığımız Temel Problemler

Bu projeyi geliştirirken üç temel eksikliğe odaklandık:

1.  **Hız ve Akıcılık Eksikliği:** Gençliğin dinamik enerjisine rağmen, piyasadaki mevcut platformlarda etkinlik oluşturma ve katılma süreçleri **vakit kaybettiricidir**.
2.  **Ücretsiz Etkinliklerin Görünürlüğü:** Kendi çapında veya ücretsiz etkinlik düzenleyen kişi ve toplulukların etkinlikleri yeterince **erişilebilir** değildir.
3.  **GSB Form Yorgunluğu:** Gençlik ve Spor Bakanlığı (GSB) bünyesindeki etkinliklere katılımda, sürekli tekrar eden **sıkıcı formları** doldurma zorunluluğu gençleri yormaktadır.

## 💡 Çözümümüz: Anlık Platformu

* **Anlık Reaksiyon:** Sitemiz, ismimizin vaadini doğrulayarak, kullanıcılara **birkaç tıkla** etkinlik oluşturma ve bunlara hızla ulaşma imkanı sunar.
* **Keşif Noktası:** Ücretli olmayan tüm etkinlikleri havuzumuzda bulundurarak, kullanıcıların can sıkıntısını giderecek **ana keşif noktası** olmayı hedefliyoruz.
* **GSB Entegrasyonu:** Üyelerimiz, sisteme kaydolurken verdikleri temel bilgiler sayesinde, GSB etkinlikleri için tekrar form doldurma zahmetine girmeden **hızlıca kayıt** olabilirler.

## 🛠️ Teknik Altyapı (Tech Stack)

Anlık, basitliği ve hızı hedefleyen bir yapı üzerine inşa edilmiştir:

| Kategori | Teknoloji |
| :--- | :--- |
| **Ön Yüz (Frontend)** | HTML, CSS, JavaScript |
| **Arka Yüz & Veri Tabanı** | Firebase |

## 💻 Yerel Kurulum Talimatları

Projeyi kendi ortamınızda çalıştırmak ve test etmek için aşağıdaki adımları takip edin:

### Ön Koşullar

* Node.js ve npm (veya yarn) kurulu olmalıdır.
* Firebase Komut Satırı Arayüzü (CLI) global olarak kurulu olmalıdır.
    ```bash
    npm install -g firebase-tools
    ```

### Adımlar

1.  **Depoyu Klonlayın ve Klasöre Girin:**
    ```bash
    git clone [BURAYA GITHUB REPO ADRESİNİZİ EKLEYİN]
    cd [PROJE ANA KLASÖRÜNÜZÜN ADI]
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

3.  **Firebase Girişi:**
    *Kendi Firebase hesabınıza giriş yapın.*
    ```bash
    firebase login
    ```

4.  **Projeyi Başlatın (Localhost):**
    *Uygulamanızı yerel sunucuda (localhost) çalıştırmak için:*
    ```bash
    firebase serve
    ```
    *Erişim: Tarayıcınızda genellikle **http://localhost:5000** adresini açarak projeyi görüntüleyebilirsiniz.*

---

## 🚀 Gelecek Vizyonu ve Destek İsteği

**Kısa Vade (Oyunlaştırma):**
Piyasaya sürülürken mobil versiyonumuzla beraber ilk hedefimiz **oyunlaştırma** olacak. Bunun sonucunda **sosyal transkript** işlevi görecek rozetler sunarak etkinlik planlama kısmını daha eğlenceli hale getireceğiz.

**Destek İhtiyacı:**
Giderlerimiz düşük olduğundan, ilk etapta en büyük ihtiyacımız **ayni destek** (altyapı) ve pazar stratejimizi hızlandıracak **stratejik mentörlüktür**.

## 👥 Ekibimiz (AkdeMIS)

| İsim | Görev Tanımı |
| :--- | :--- |
| **Yusuf** | Lider Geliştirici (Lead Developer) |
| **Furkan** | Frontend Geliştiricisi |
| **Oğuz** | Backend Geliştiricisi |
| **Kadir** | UI/UX Tasarımcısı |
| **Yunus Emre** | Sunum ve Uygulama Test Sorumlusu |

---

![Resim Açıklaması](src/images/AnlikLogo.png)
