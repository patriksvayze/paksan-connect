import { SIRKET, MARKA } from '../marka'

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
    onayCumlesi:
      'I have read and understood the Privacy Notice.',
    bolumler: [
      {
        baslik: 'Who is the data controller?',
        paragraflar: [
          `Your personal data is processed by the data controller ${SIRKET.unvan} as described in this notice, under Turkish Personal Data Protection Law No. 6698 (KVKK).`,
          `Address: ${SIRKET.adres}`,
          `Address: ${SIRKET.adres2}`,
          `Telephone: ${SIRKET.telefon} · ${SIRKET.telefon2} · Fax: ${SIRKET.faks}`,
          `E-mail: ${SIRKET.eposta}`,
        ],
      },
      {
        baslik: 'Which data is processed?',
        maddeler: [
          'Identity and contact: your first name, last name and mobile phone number',
          'Location: your province and district, the address where the machine is located (in a service request), the address a spare part is sent to',
          'Machine: the serial number, model, production year and warranty status of the machine you registered, and the maintenance you ticked off',
          'Requests: what you write in service, spare part and quotation requests; the photos, videos and voice recordings you attach; information you add later; appointments',
          'Service records: the work the authorised service did on your machine, the parts it replaced and visit details',
          'Invoice and payment: the name of the person or company to be invoiced, Turkish ID number or tax number, invoice and delivery address, the payment receipt you upload',
          'Support use: the machine, section and symptom you choose on the Support screen and the checks you tick',
          'Feedback and requests: feedback you send about the app and your phone number change application',
          'Transaction security: an irreversible digest of your password, sign-in times and app version',
          `Notifications: if you allow notifications, your device's notification ID and permission status`,
          'Preferences: your campaign notification permission, language and appearance choice',
        ],
      },
      {
        baslik: 'For what purpose and on what legal basis?',
        paragraflar: [
          'Each purpose is followed by its legal basis under Article 5 of the KVKK:',
        ],
        maddeler: [
          'Opening your account, signing you in and keeping your account secure — establishment and performance of a contract (Art. 5/2-c), legitimate interest (Art. 5/2-f)',
          'Registering your machine and tracking its warranty — performance of a contract (Art. 5/2-c), legal obligation (Art. 5/2-ç)',
          'Passing your service request to the authorised service looking after your machine, handling the appointment and service record — performance of a contract (Art. 5/2-c)',
          'Invoicing your spare part order, verifying your payment and shipping the part — performance of a contract (Art. 5/2-c), legal obligation (Art. 5/2-ç)',
          'Answering your quotation request — establishment of a contract (Art. 5/2-c)',
          'Notifying you when the status of your request changes — performance of a contract (Art. 5/2-c)',
          'Sending safety warnings about your machine — legal obligation (Art. 5/2-ç), legitimate interest (Art. 5/2-f)',
          'Improving products and services using Support screen records — legitimate interest (Art. 5/2-f)',
          'Protecting our rights in possible disputes and meeting requests from authorities — establishment, exercise or protection of a right (Art. 5/2-e), legal obligation (Art. 5/2-ç)',
          'The processing described in the Explicit Consent Text — your explicit consent (Art. 5/1)',
          'If you allow it, sending campaigns and announcements — your explicit consent and your consent to commercial electronic messages',
        ],
      },
      {
        baslik: 'Who is it shared with?',
        paragraflar: [
          'Your data is shared only as far as each purpose requires, with these recipients:',
        ],
        maddeler: [
          `Authorised service: your name, phone number, the address where the machine is located, machine details, the content and attachments of your request are shared with the ${MARKA} authorised service assigned to your machine or handling your request.`,
          `An authorised service opening a record for you: when an authorised service opens a record for you, it can find your account by your phone number or your machine's serial number. In that case that service can see your name, province and registered machines.`,
          'Authorised dealer: for a quotation request, your name, phone number, province and the content of your request are shared with the authorised dealer that will answer it.',
          `Cargo companies: for spare part shipping, the recipient's name, delivery address and phone number are shared.`,
          `Service providers: shared with companies that work on behalf of and on the instructions of ${MARKA}, such as the server hosting the app and the notification infrastructure.`,
          'Financial advisers, auditors and legal counsel: shared as far as the law requires.',
          'Authorised public institutions: shared where the law requires.',
        ],
      },
      {
        baslik: 'Is it transferred abroad?',
        paragraflar: [
          'Your personal data is not transferred abroad at present. If this changes, for example because of the notification infrastructure, this notice will be updated and the conditions of Article 9 of the KVKK will be met.',
        ],
      },
      {
        baslik: 'How is it collected?',
        paragraflar: [
          'Your data is collected electronically in these ways:',
        ],
        maddeler: [
          'What you write in the app and the photos, videos, voice recordings and receipts you upload',
          'Records an authorised service opens for you and records of the work it does on your machine',
          `Information you give ${MARKA} by phone`,
          `Records the app creates automatically: sign-in times, app version and, if you allow notifications, your device's notification ID`,
          `The app does not use your phone's location; your location is only the province, district and address you write yourself.`,
        ],
      },
      {
        baslik: 'How long is it kept?',
        paragraflar: [
          'Your data is kept while your account is open. After your account is closed it is kept for the periods required by warranty, consumer, tax and commercial law and for the limitation periods of possible disputes. At the end of these periods it is deleted, destroyed or anonymised.',
        ],
      },
      {
        baslik: 'What are your rights?',
        paragraflar: [
          'Under Article 11 of the KVKK you have the right to:',
        ],
        maddeler: [
          'Learn whether your personal data is processed and, if so, request information about it',
          'Learn the purpose of processing and whether it is used in line with that purpose',
          'Know the third parties in Turkey or abroad your personal data is transferred to',
          'Request correction if your personal data is incomplete or inaccurate',
          'Request deletion or destruction of your personal data when the conditions are met',
          'Request that corrections and deletions be notified to the third parties your data was transferred to',
          'Object to a result against you arising solely from automated analysis of your personal data',
          'Claim compensation if you suffer damage because your personal data was processed unlawfully',
        ],
      },
      {
        baslik: 'How do you apply?',
        paragraflar: [
          `You can send your application to our address above with a wet-signed letter. You can also apply by registered electronic mail (KEP), secure electronic signature or mobile signature, or by writing to ${SIRKET.eposta} from an e-mail address you gave us earlier and that is registered in our system.`,
          'Your application must include your first and last name, Turkish ID number (for foreign nationals, nationality and passport number), address for notifications, e-mail address and phone number if any, and the subject of your request.',
          'Your application is concluded free of charge within 30 days at the latest. If you are not satisfied with the answer you can complain to the Personal Data Protection Board.',
          `You can request the closure of your account and deletion of your data in the same ways. ${MARKA} carries this out. Records subject to a legal retention period (for example invoices) are kept until the end of that period; other records are deleted or anonymised.`,
          'The app is intended for users over 18.',
        ],
      },
    ],
  },
  acikRiza: {
    baslik: 'Explicit Consent Text',
    kisaAd: 'Explicit Consent Text',
    onayCumlesi:
      'I have read the Explicit Consent Text; I give my explicit consent to the processing of my personal data as described in it and to its transfer to the authorised service and dealer.',
    bolumler: [
      {
        baslik: 'What are you consenting to?',
        paragraflar: [
          `I have also read the Privacy Notice. I give my explicit consent to ${SIRKET.unvan} processing my first and last name, mobile phone number, province and district, details of the machine I registered and the content of my requests in order to run after-sales support, service, spare part and warranty processes.`,
        ],
      },
      {
        baslik: 'Sharing with the service and dealer',
        paragraflar: [
          `When I create a service request, I give my explicit consent to my first and last name, phone number, the address where my machine is located, my machine's details and the content of my request (including photos, videos and voice recordings) being transferred to the authorised service assigned to my machine or handling my request. When I create a quotation request, I give my explicit consent to my first and last name, phone number, province and the content of my request being transferred to the authorised dealer that will answer it.`,
        ],
      },
      {
        baslik: 'Contacting you',
        paragraflar: [
          `I consent to ${MARKA} or the authorised service handling my request contacting me by phone, SMS and app notification about the requests I create.`,
          'This contact covers only service matters such as confirming that my request was received, service appointments and safety warnings about my machine. Campaign and announcement notifications are not included; they need separate permission.',
        ],
      },
      {
        baslik: 'You can withdraw your consent',
        paragraflar: [
          `You can withdraw this consent at any time through the application channels in the Privacy Notice or by writing to ${SIRKET.eposta}. Processing carried out before you withdraw remains valid. When you withdraw your consent your requests can no longer be passed to the service, so you may not be able to keep using the app. In that case we will contact you to close your account.`,
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
          'If you allow it, we send new product announcements, seasonal campaigns, dealer events and spare part offers to your phone as app notifications. At present SMS, e-mail or phone calls are not used for these notifications. If these channels are ever used, we will ask for your permission separately.',
        ],
      },
      {
        baslik: 'This permission is optional',
        paragraflar: [
          'You can use the app fully without giving this permission. Machine registration, troubleshooting support, service and spare part requests work independently of it.',
          'Service notifications such as the status of your request or safety warnings about your machine are not campaign notifications and are sent independently of this permission.',
        ],
      },
      {
        baslik: 'You can turn it off at any time',
        paragraflar: [
          `You can turn this permission on and off on the "Privacy and Permissions" page in "Profile". The date of the last change is shown on the same page. You can also withdraw it by writing to ${SIRKET.eposta}. You can turn off all of the app's notifications in your phone's settings as well.`,
        ],
      },
    ],
  },
  izinler: {
    baslik: 'App Permissions',
    kisaAd: 'App Permissions',
    bolumler: [
      {
        baslik: 'Notifications',
        paragraflar: [
          `Notification permission is requested so we can tell you when the status of your request changes, when your service appointment is set or when there is a safety warning about your machine. The app does not ask on its own; it first explains why. You can turn the permission off in your phone's settings at any time. If you do, you can follow updates on the app's Notifications page.`,
        ],
      },
      {
        baslik: 'Microphone',
        paragraflar: [
          `Microphone permission is requested only when you press the voice recording button on a request form. The recording is attached to your request; ${MARKA} and the authorised service handling your request listen to it. The app never turns on the microphone unless you press the button.`,
        ],
      },
      {
        baslik: 'Camera, photos and files',
        paragraflar: [
          'These permissions are used only when you attach a photo, video or receipt to your request, and only for the files you choose. Photos are reduced in size before they are sent. The app does not access other files in your gallery.',
        ],
      },
      {
        baslik: 'Location',
        paragraflar: [
          `The app does not use your phone's location and does not ask for location permission. The place the service comes to is the address you write.`,
        ],
      },
      {
        baslik: 'Phone calls',
        paragraflar: [
          `When you tap a number to call the service, a dealer or ${MARKA}, your phone's call screen opens. You start the call yourself. The app does not access your call history.`,
        ],
      },
    ],
  },
}
