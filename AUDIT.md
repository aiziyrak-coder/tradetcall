# XAUUSD — To‘liq audit (tugmalar + funksiyalar)

## Avtomatik tekshiruv

```bash
npm run audit
```

## Tuzatilgan “ishlamaydigan” muammolar

| Muammo | Yechim |
|--------|--------|
| Yangilik bosilganda hech narsa ochilmasdi | `shell.openExternal` IPC + yangiliklar `<button>` |
| Sozlamalar → monitor qaytib bo‘lmasdi | **Terminalga qaytish** tugmasi + `restartMonitorService` |
| API saqlangan, lekin “Saqlash” majburiy edi | **Monitorni ochish** / qaytish alohida |
| Demo login `Lynxos` ishlamasdi | Login `lynxos` (kichik) normalizatsiya |
| AI tugmalari jim xato | API yo‘q bo‘lsa aniq xabar; IPC xato ko‘rsatiladi |
| Grafik interval | Noto‘g‘ri interval rad etiladi |
| Brauzerda (Vite) ochilsa | `ElectronGuard` — faqat `npm run dev` |
| Admin tugmalar xato yutardi | try/catch + validatsiya |
| IPC `app:startMonitor` tartibsiz | Barcha handlerlar `registerIpc` ichida |

## Tugmalar tekshiruvi (qo‘lda)

### Login
- [ ] `TERMINALGA KIRISH` — lynxos / 3888
- [ ] `Demo: Lynxos` — avto to‘ldirish
- [ ] `KO'R / YASHIR` parol

### Admin
- [ ] `+ YANGI USER` → modal → SAQLASH
- [ ] Tahrirlash / O‘chirish / FAOL-O‘CHIQ
- [ ] Chiqish

### Sozlamalar
- [ ] Tekshirish (API)
- [ ] Saqlash va boshlash
- [ ] Terminalga qaytish (monitordan kelganda)
- [ ] Kalitni o‘chirish

### Monitor
- [ ] 1m / 5m / 15m / 1h grafik
- [ ] AI PROGNOZ OLISH
- [ ] Maqsad narx + Tahlil qilish (Enter ham)
- [ ] Yangilik qatorini bosish → brauzer
- [ ] Sozlamalar / Chiqish
- [ ] Xato yopish

## Ishga tushirish

```bash
cd E:\XAUUSD
npm run audit
npm run dev
```

**Muhim:** faqat Electron (`npm run dev`), oddiy brauzerda emas.
