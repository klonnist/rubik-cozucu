# Rubik Küpü Çözücü

Tarayıcıda çalışan, animasyonlu, tek sayfalık bir Rubik küpü çözüm sitesi. Küpünün mevcut
durumunu gir (ya da rastgele bir karışıklık üret), "Çöz"e bas, çözümü 3B animasyonla adım
adım izle. Kurulum ya da sunucu gerekmez — her şey tarayıcında, cihazında çalışır.

**Canlı site:** https://klonnist.github.io/rubik-cozucu/

![Rubik Küpü Çözücü önizleme](./assets/screenshot.png)

## Özellikler

- **2×2 küp**: bir köşeyi referans alma tekniği + kesin BFS tablosuyla, **1 saniyenin
  çok altında** (tipik olarak birkaç milisaniye) optimal çözüm.
- **3×3 küp**: Kociemba iki aşamalı algoritmasıyla tipik **20-25 hamlede, 1 saniyenin
  altında** (ortalama ~250ms, en kötü durumda ~2sn) çözüm.
- Rastgele **karıştırma** ya da elle hamle dizisi (`R U R' F2`) girme.
- **Renk boyama modu**: gerçek küpünün durumunu 2D açık (net) görünüm üzerinden gir.
- Fiziksel olarak geçersiz bir durum girilirse anlaşılır, suçlayıcı olmayan uyarı.
- Oynat / duraklat / adım ileri / adım geri / başa dön / hız kontrolü.
- Açık/koyu tema (sistem tercihini otomatik algılar, elle de değiştirilebilir).
- Mobil öncelikli, dokunmatik uyumlu, tam erişilebilir (klavye ile kullanılabilir) arayüz.
- Ana ekrana eklenebilir (PWA manifest + ikonlar).

4×4 küp için mimari baştan hazır (bkz. [Mimari](#mimari)); yalnızca yeni bir çözücü
modülü eklenmesi yeterli olacak.

## Yerelde çalıştırma

Bu proje **derleme adımı gerektirmez** — saf HTML/CSS/JavaScript (ES modülleri) kullanır,
Three.js bir CDN'den yüklenir. Tek ihtiyacın, ES modülleri ve Web Worker'ların
çalışabilmesi için basit bir statik dosya sunucusu (doğrudan `file://` ile açmak
çalışmaz):

```bash
python -m http.server 4173
```

Ardından tarayıcında [http://localhost:4173](http://localhost:4173) adresini aç.

Node.js kuruluysa `npm run dev` da aynı sunucuyu başlatır (bkz. `package.json`).

## Testleri çalıştırma

Küp motoru, doğrulama ve çözücü için birim testleri Node'un yerleşik test çalıştırıcısını
kullanır (harici bağımlılık yok):

```bash
node --test tests/*.test.js
# veya
npm test
```

Testler şunları doğrular: her hamlenin tersinin işe yaradığı, 100 rastgele karıştırmanın
doğru çözüldüğü, çözüm süresinin 1 saniyenin altında kaldığı ve elle girilen renklerin
fiziksel geçerliliğinin doğru tespit edildiği.

## GitHub Pages'te yayınlama

1. Bu depoyu kendi GitHub hesabına aktar (fork) ya da `rubik-cozucu` adıyla yeni bir depo
   oluşturup içeriği gönder (push).
2. GitHub'da depo sayfasında **Settings → Pages** yoluna git.
3. **Source** olarak **GitHub Actions** seçeneğini seç.
4. `main` dalına her gönderimde (`.github/workflows/deploy.yml`) site otomatik olarak
   derlenip (test edilip) yayınlanır. İlk yayın birkaç dakika sürebilir; ilerlemeyi
   depodaki **Actions** sekmesinden izleyebilirsin.
5. Yayın tamamlanınca site şu adreste erişilebilir olur:
   `https://klonnist.github.io/rubik-cozucu/`

## Mimari

```
src/
  cube/      N×N küp durum modeli ve genel hamle motoru (arayüzden bağımsız, test edilebilir)
  solvers/   Boyuta özel çözücüler, ortak arayüz: solve(state) -> hamle dizisi
  render/    Three.js sahne kurulumu, küp mesh'i ve hamle animasyonu
  worker/    Ağır çözüm hesaplamasını arka planda çalıştıran Web Worker sarmalayıcısı
  ui/        Tema, bildirimler (toast), renk boyama ağı, kutlama efekti
```

Küp durumu, her biri "hangi yönde hangi renk" bilgisini taşıyan parçalardan (cubie)
oluşur; hamleler bu parçaları 3B'de döndürür. Bu temsil boyuttan bağımsızdır — render ve
animasyon kodu hiçbir zaman değişmeden kalır. **Yeni bir küp boyutu eklemek**,
`src/solvers/` altına `solve(state) -> hamle dizisi` arayüzünü uygulayan yeni bir dosya
ekleyip `src/solvers/index.js` içindeki kayda eklemekten ibarettir.

- **2×2**: Bir köşeyi referans alarak durum uzayını 7 köşenin permütasyonu × yönelimine
  (3.674.160 durum) indirger; bu uzay üzerinde kesin bir BFS mesafe tablosu bir kez
  kurulur, çözüm bu tabloyu izleyen açgözlü bir inişle (arama yapmadan) bulunur.
- **3×3**: Kociemba iki aşamalı algoritması (`src/solvers/kociemba/`). Faz 1, IDA* arama
  ve iki budama tablosuyla (köşe/kenar yönelimi + orta katman kenarlarının konumu) küpü
  G1 alt grubuna indirger; faz 2, yalnızca G1'i koruyan 10 hamleyle (U,D,R2,L2,F2,B2) ve
  iki budama tablosuyla (köşe/kenar permütasyonu) küpü tamamen çözer. 4 budama tablosu
  (~1M durum her biri) Worker'da bir kez kurulur (~10sn), sonrasında her çözüm ortalama
  birkaç yüz milisaniyede tamamlanır.
- **4×4** (yakında): İndirgeme yöntemi (merkezler → kenar eşleştirme → 3×3 aşaması → parite).

## Teknoloji

- HTML + CSS + JavaScript (ES modülleri), derleme/bundler yok.
- 3D görselleştirme: [Three.js](https://threejs.org/) (jsDelivr CDN üzerinden, import map ile).
- Ağır çözüm hesaplamaları bir Web Worker içinde çalışır; arayüz donmaz.
- Testler: Node.js'in yerleşik `node:test` modülü.

## Lisans

MIT
