import { SIRKET } from '../config'

/* ==========================================================================
   KVKK metinlerinin İngilizcesi

   ⚠ ÖNEMLİ — BU BİR ÇEVİRİDİR, AYRI BİR HUKUKİ METİN DEĞİLDİR.

   Metinler 6698 sayılı KVKK'ya (Türkiye) göre yazıldı. Yurtdışındaki
   müşteriye "6698 sayılı kanun uyarınca" demek onun için bir anlam
   ifade etmiyor; Avrupa'daki bir müşteri için GDPR'a göre yazılmış AYRI
   bir metin gerekiyor. Bu çeviri o metin hazırlanana kadarki geçici
   çözümdür ve her sayfanın başında Türkçe aslın geçerli olduğu yazılı.

   Hukuk danışmanınız GDPR metnini hazırladığında bu dosya onunla
   değiştirilmeli (bkz. PRODA-CIKIS.md → A3).
   ========================================================================== */

/* Her metnin başında görünen uyarı */
export const ASIL_METIN_NOTU =
  'This is an English translation provided for convenience. The binding ' +
  'text is the Turkish original, prepared under Turkish Personal Data ' +
  'Protection Law No. 6698 (KVKK).'

export const KVKK_EN = {
  aydinlatma: {
    baslik: 'Privacy Notice',
    kisaAd: 'Privacy Notice',
    onayCumlesi: 'I have read and understood the Privacy Notice.',
    bolumler: [
      {
        baslik: 'Who is the data controller?',
        paragraflar: [
          `Your personal data is processed by ${SIRKET.unvan} as data controller, within the scope described below, under Turkish Personal Data Protection Law No. 6698 (KVKK).`,
          `Address: ${SIRKET.adres}`,
          `Address: ${SIRKET.adres2}`,
          `Telephone: ${SIRKET.telefon} · ${SIRKET.telefon2} · Fax: ${SIRKET.faks}`,
          `E-mail: ${SIRKET.eposta}`,
        ],
      },
      {
        baslik: 'Which of your data is processed?',
        maddeler: [
          'Identity and contact details: first and last name, mobile telephone number',
          'Location: the province you live in, and the district or village you enter when creating a request',
          'Current position: only when you use the “find my nearest dealer” feature, and only inside your phone',
          'Product details: the serial number, model and year of the machine you register',
          'Request details: what you write in your service, spare part and quote requests',
          'Invoice and delivery details: for spare part orders, the name of the person or company the invoice is issued to, national ID or tax number, delivery address and the payment receipt you upload',
          'Support records: the questions you put to the support assistant and the answers given',
          'Notification details: if you allow app notifications, the device notification token that lets the notification reach your phone',
        ],
      },
      {
        baslik: 'For what purpose is it processed?',
        maddeler: [
          'To provide technical and breakdown support for the machine you bought',
          'To handle your service and spare part requests and route you to the right team',
          'To run warranty processes and assess warranty cover',
          'To show you the nearest authorised dealer and service point',
          'To inform you if a product safety issue arises',
          'To answer your quote requests',
          'To issue the invoice for your spare part order, verify your payment and ship the part to the address you give',
          'To send an app notification when the status of your request changes',
          'And, if you allow it, to send you our campaigns and announcements by app notification',
        ],
      },
      {
        baslik: 'What is the legal basis?',
        paragraflar: [
          'Your data is processed on the following grounds set out in Article 5 of the KVKK:',
        ],
        maddeler: [
          'Being directly related to the establishment or performance of a contract (after-sales service and warranty) — Art. 5/2-c',
          'Compliance with the data controller’s legal obligation (warranty, consumer and tax legislation; the obligation to issue an invoice) — Art. 5/2-ç',
          'Legitimate interest, provided it does not harm your fundamental rights and freedoms — Art. 5/2-f',
          'Your explicit consent for transfer to authorised dealers and service points, and for the processing you consent to — Art. 5/1',
        ],
      },
      {
        baslik: 'Who is it shared with?',
        paragraflar: [
          'As far as necessary to meet your request, it may be transferred to your nearest authorised dealer and authorised service. For example, in a service request your name, telephone number and machine serial number are passed to the relevant service point.',
          'Beyond that, transfers may be made to legally authorised public bodies where legislation requires it.',
          'Your data is not sold or rented to third parties for marketing purposes.',
        ],
      },
      {
        baslik: 'How do we collect it?',
        paragraflar: [
          'Your data is collected electronically, from what you enter into the app yourself. The app does not collect anything on its own that you have not entered.',
          'Your current position is taken only when you press the “Use my location” button, is used only inside your phone to sort the nearest dealers, and is not sent anywhere.',
          'The device notification token is created only when you allow app notifications. You can withdraw the permission at any time in your phone settings; once withdrawn, notifications cannot be sent.',
        ],
      },
      {
        baslik: 'How long is it kept?',
        paragraflar: [
          'Your data is kept for as long as the after-sales service relationship continues and for the limitation periods required by the relevant legislation. At the end of that period it is deleted, destroyed or anonymised.',
        ],
      },
      {
        baslik: 'What are your rights?',
        paragraflar: ['Under Article 11 of the KVKK you may request the following:'],
        maddeler: [
          'To learn whether your personal data is being processed, and if so to request information about it',
          'To learn the purpose of processing and whether it is used in line with that purpose',
          'To know the third parties to whom it is transferred, in Türkiye or abroad',
          'To have it corrected if it is incomplete or inaccurate',
          'To have it deleted or destroyed where the conditions are met',
          'To have corrections and deletions notified to the third parties it was transferred to',
          'To object to a result reached against you solely through automated analysis',
          'To claim compensation if you suffer loss because of unlawful processing',
        ],
      },
      {
        baslik: 'How do you apply?',
        paragraflar: [
          `For the rights above you can write to ${SIRKET.eposta}. Your application is concluded within 30 days at the latest.`,
          'If you want your account and records deleted completely, it is enough to write to the same address; the work is carried out by PAKSAN.',
        ],
      },
    ],
  },

  acikRiza: {
    baslik: 'Consent Statement',
    kisaAd: 'Consent Statement',
    onayCumlesi:
      'I have read the Consent Statement and give my explicit consent to my personal data being processed within this scope and transferred to the authorised dealer / service.',
    bolumler: [
      {
        baslik: 'What are you consenting to?',
        paragraflar: [
          `I confirm that I have read the Privacy Notice, and I give my explicit consent to my first and last name, mobile telephone number, province, the serial number of the machine I register and the content of the requests I create being processed by ${SIRKET.ad} for the purpose of carrying out after-sales support, service, spare parts and warranty processes.`,
        ],
      },
      {
        baslik: 'Transfer to dealer and service',
        paragraflar: [
          'When I create a service, spare part or quote request, I give my explicit consent to my name, telephone number, location (province / district) and machine serial number being transferred to the authorised dealer and authorised service nearest to me, so that my request can be met.',
        ],
      },
      {
        baslik: 'Contacting you',
        paragraflar: [
          'I consent to PAKSAN, or the authorised service it directs, contacting me by telephone, SMS and app notification about the requests I have created.',
          'Notifications in this scope relate solely to the service: that my request has been received, a service appointment, a safety warning about my machine and the like. Campaign and announcement notifications are not included; those require separate permission.',
        ],
      },
      {
        baslik: 'You can withdraw your consent',
        paragraflar: [
          `You can withdraw this consent at any time. It is enough to write to ${SIRKET.eposta}. When you withdraw your consent, actions taken up to the date of withdrawal remain valid.`,
        ],
      },
    ],
  },

  ticariIleti: {
    baslik: 'Campaign and Announcement Notifications',
    kisaAd: 'Campaign Notifications',
    onayCumlesi:
      'I would like to receive campaign, announcement and new product notifications through the app. (Optional)',
    bolumler: [
      {
        baslik: 'What do we send?',
        paragraflar: [
          'If you allow it, we send notifications to your phone through the app about new product announcements, seasonal campaigns, dealer events and spare part offers.',
        ],
      },
      {
        baslik: 'This permission is not required',
        paragraflar: [
          'You can use the app fully without giving this permission. Machine registration, breakdown support, service and spare part requests all work independently of it.',
          'Service notifications — the status of your request, or a safety warning about your machine — do not count as campaign notifications; they are sent independently of this permission.',
        ],
      },
      {
        baslik: 'You can turn it off any time',
        paragraflar: [
          `You can turn this permission on and off with a single tap on the Profile page in the app. If you prefer, you can also withdraw it by writing to ${SIRKET.eposta}. You can also switch off all notifications from the app in your phone settings.`,
        ],
      },
    ],
  },
}
