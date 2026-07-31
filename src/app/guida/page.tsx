import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function GuidaPage() {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Minimal top bar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{settings.appName}</span>
          <Link href="/login" className="text-sm text-[var(--brand)] hover:opacity-80">
            ← Torna al login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
        <div>
          <h1 className="page-title">Guida utente</h1>
          <p className="page-subtitle">Tutto quello che devi sapere per usare il sistema di ticket IT.</p>
        </div>

        {/* TOC */}
        <nav className="card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Indice</p>
          <ol className="space-y-1 text-sm text-[var(--brand)] [counter-reset:toc]">
            {[
              ["#cos-e", "Cos'è IT Tickets"],
              ["#accesso", "Accesso e profilo"],
              ["#nuovo-ticket", "Aprire un nuovo ticket"],
              ["#priorita", "Priorità"],
              ["#monitorare", "Monitorare i tuoi ticket"],
              ["#commenti", "Commenti e aggiornamenti"],
              ["#chiusura", "Chiudere e riaprire un ticket"],
              ["#correlati", "Ticket correlati"],
              ["#allegati", "Allegati"],
              ["#notifiche", "Notifiche email"],
              ["#faq", "Domande frequenti"],
            ].map(([href, label], i) => (
              <li key={href} className="flex items-baseline gap-2">
                <span className="w-5 text-right text-xs text-gray-400">{i + 1}.</span>
                <a href={href} className="hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1 – Cos'è */}
        <section id="cos-e" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">1. Cos'è IT Tickets</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-2">
            <p>
              IT Tickets è il sistema interno per segnalare problemi, richiedere assistenza o avanzare richieste al
              team IT. Sostituisce email e messaggi informali con un canale strutturato che permette a tutti — utenti e
              staff — di tenere traccia di ogni richiesta dall'apertura alla risoluzione.
            </p>
            <p>
              Ogni richiesta diventa un <strong>ticket</strong>: un documento univoco con stato, priorità, categoria
              e cronologia completa di tutte le comunicazioni.
            </p>
          </div>
        </section>

        {/* 2 – Accesso */}
        <section id="accesso" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">2. Accesso e profilo</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-4">
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Primo accesso</h3>
              <p>
                Le credenziali (email e password temporanea) ti vengono comunicate dallo staff IT. Al primo accesso
                potrebbe esserti chiesto di scegliere una nuova password.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Il tuo profilo</h3>
              <p>
                Clicca sul tuo nome in alto a destra e poi su <strong>Il mio profilo</strong> per aggiornare:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
                <li><strong>Nome</strong> — come appari nei ticket e nei commenti</li>
                <li><strong>Email</strong> — dove ricevi le notifiche</li>
                <li><strong>Numero di contatto</strong> — interno telefonico o cellulare aziendale, visibile allo staff IT per contattarti rapidamente</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Timeout di sessione</h3>
              <p>
                Per sicurezza, la sessione scade automaticamente dopo un periodo di inattività. Salva il lavoro
                in corso prima di lasciare il browser incustodito.
              </p>
            </div>
          </div>
        </section>

        {/* 3 – Nuovo ticket */}
        <section id="nuovo-ticket" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">3. Aprire un nuovo ticket</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-4">
            <p>
              Clicca su <strong>Nuovo ticket</strong> nel menu in cima alla pagina. Compila il modulo:
            </p>
            <ol className="list-inside list-decimal space-y-2 text-gray-600">
              <li><strong>Titolo</strong> — descrizione breve e chiara del problema (es. <em>"Stampante ufficio 3 non funziona"</em>)</li>
              <li><strong>Categoria</strong> — scegli quella più adatta (Hardware, Software, Rete…)</li>
              <li><strong>Priorità</strong> — quanto è urgente? Vedi la sezione dedicata qui sotto</li>
              <li><strong>Descrizione</strong> — fornisci tutti i dettagli: cosa hai fatto, cosa è successo, eventuali messaggi di errore</li>
              <li><strong>Allegati</strong> — screenshot, log o altri file utili (opzionale)</li>
            </ol>
            <p className="mt-1 rounded-lg bg-blue-50 px-4 py-3 text-blue-800">
              <strong>Suggerimento:</strong> più dettagli fornisci, prima il team IT potrà aiutarti — evita titoli
              generici come &quot;Non funziona niente&quot;.
            </p>
          </div>
        </section>

        {/* 4 – Priorità */}
        <section id="priorita" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">4. Priorità</h2>
          <div className="card p-5 text-sm space-y-3">
            <p className="leading-relaxed text-gray-700">
              Scegli la priorità in base all'impatto reale sull'attività lavorativa. Una priorità troppo alta
              rispetto alla reale urgenza rallenta la gestione dei casi critici.
            </p>
            <div className="space-y-2">
              {[
                { color: "#dc2626", bg: "#fef2f2", label: "Critica", desc: "Sistema completamente bloccato, produzione ferma. Richiede intervento immediato." },
                { color: "#d97706", bg: "#fffbeb", label: "Alta", desc: "Impatto significativo su più utenti o su un processo aziendale importante." },
                { color: "#2563eb", bg: "#eff6ff", label: "Media", desc: "Problema che rallenta il lavoro ma ha una soluzione alternativa. È il valore predefinito." },
                { color: "#16a34a", bg: "#f0fdf4", label: "Bassa", desc: "Richiesta non urgente, miglioramento o domanda informativa." },
              ].map(({ color, bg, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: bg }}>
                  <span className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: color + "22", color }}>
                    {label}
                  </span>
                  <p className="text-gray-700">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 – Monitorare */}
        <section id="monitorare" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">5. Monitorare i tuoi ticket</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-4">
            <p>
              Dalla <strong>Dashboard</strong> vedi tutti i tuoi ticket attivi. Ogni riga mostra titolo, stato,
              priorità e data di creazione.
            </p>
            <div>
              <p className="mb-2 font-medium text-gray-900">Stati possibili:</p>
              <div className="space-y-1.5">
                {[
                  { bg: "#dbeafe", color: "#1e40af", label: "Aperto", desc: "Il ticket è stato ricevuto e verrà preso in carico." },
                  { bg: "#fef9c3", color: "#854d0e", label: "In lavorazione", desc: "Lo staff IT sta lavorando alla risoluzione." },
                  { bg: "#dcfce7", color: "#15803d", label: "Risolto", desc: "La soluzione è stata applicata — verifica e chiudi se tutto è ok." },
                  { bg: "#f3f4f6", color: "#374151", label: "Chiuso", desc: "Ticket completato e archiviato." },
                ].map(({ bg, color, label, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: bg, color }}>
                      {label}
                    </span>
                    <span className="text-gray-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <p>
              Clicca sul titolo di un ticket per aprire la pagina di dettaglio, dove trovi la cronologia completa
              dei commenti e delle modifiche.
            </p>
          </div>
        </section>

        {/* 6 – Commenti */}
        <section id="commenti" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">6. Commenti e aggiornamenti</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-3">
            <p>
              Nella pagina di dettaglio di un ticket puoi aggiungere commenti per fornire ulteriori informazioni
              allo staff IT o rispondere alle loro domande.
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-gray-600">
              <li>Usa il campo di testo in fondo alla pagina e clicca <strong>Commenta</strong></li>
              <li>Puoi allegare file anche al commento (screenshot, log…)</li>
              <li>Ogni nuovo commento genera una notifica email alle parti coinvolte</li>
            </ul>
          </div>
        </section>

        {/* 7 – Chiusura */}
        <section id="chiusura" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">7. Chiudere e riaprire un ticket</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-3">
            <p>
              Se hai aperto un ticket e il problema si risolve prima che intervenga lo staff, puoi chiuderlo tu
              stesso cliccando <strong>Chiudi ticket</strong> — disponibile finché il ticket è in stato{" "}
              <strong>Aperto</strong>. Una volta che lo staff lo prende in carico, la chiusura viene gestita dal
              team IT.
            </p>
            <p>
              Se il problema si ripresenta dopo la chiusura, hai due opzioni:
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-gray-600">
              <li><strong>Apri ticket correlato</strong> — crea un nuovo ticket collegato al precedente (consigliato se è una situazione diversa o un nuovo episodio)</li>
              <li>Contatta lo staff IT per farsi riaprire il ticket originale</li>
            </ul>
          </div>
        </section>

        {/* 8 – Correlati */}
        <section id="correlati" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">8. Ticket correlati</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-2">
            <p>
              I ticket possono essere collegati tra loro in una relazione padre–figlio. Nella pagina di dettaglio,
              la sezione <strong>Cronologia ticket</strong> mostra il ticket padre (se presente) e tutti i ticket
              correlati aperti in seguito.
            </p>
            <p>
              Questa funzione è utile quando un problema ricorrente genera più segnalazioni: lo staff può
              tenere tutto organizzato in un'unica catena di ticket.
            </p>
          </div>
        </section>

        {/* 9 – Allegati */}
        <section id="allegati" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">9. Allegati</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-2">
            <p>
              Puoi allegare file sia al momento della creazione del ticket sia nei commenti successivi.
              Gli allegati accettati includono immagini, documenti PDF e file di testo.
            </p>
            <ul className="list-inside list-disc space-y-1 text-gray-600">
              <li>Clicca su <strong>Aggiungi allegato</strong> nel modulo o nel form dei commenti</li>
              <li>Gli allegati sono visibili nella pagina di dettaglio del ticket</li>
              <li>Clicca sul nome del file per scaricarlo</li>
            </ul>
          </div>
        </section>

        {/* 10 – Notifiche */}
        <section id="notifiche" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">10. Notifiche email</h2>
          <div className="card p-5 text-sm leading-relaxed text-gray-700 space-y-2">
            <p>
              Il sistema invia notifiche email automatiche nei seguenti casi:
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-gray-600">
              <li>Conferma di apertura del ticket</li>
              <li>Nuovo commento aggiunto al ticket</li>
              <li>Cambio di stato (es. da Aperto a In lavorazione, a Risolto)</li>
              <li>Cambio di assegnatario</li>
              <li>Chiusura del ticket</li>
            </ul>
            <p>
              Le email vengono inviate all'indirizzo associato al tuo account. Assicurati che sia aggiornato
              nel tuo profilo (menu in alto a destra dopo aver effettuato l'accesso).
            </p>
          </div>
        </section>

        {/* 11 – FAQ */}
        <section id="faq" className="space-y-3 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900">11. Domande frequenti</h2>
          <div className="card divide-y divide-gray-100 text-sm">
            {[
              {
                q: "Non ricordo la password, cosa faccio?",
                a: "Contatta lo staff IT: solo un amministratore può reimpostare la password.",
              },
              {
                q: "Posso aprire un ticket per conto di un collega?",
                a: "Sì, descrivi chiaramente nella descrizione il nome del collega e il suo problema. Lo staff IT vedrà il tuo account come richiedente.",
              },
              {
                q: "Ho aperto il ticket con la priorità sbagliata, posso cambiarla?",
                a: "Solo lo staff IT può modificare la priorità dopo la creazione. Aggiungi un commento segnalando l'errore.",
              },
              {
                q: "Quanto tempo ci vuole per avere risposta?",
                a: "Dipende dalla priorità e dal carico di lavoro del team. I ticket critici vengono gestiti immediatamente; gli altri seguono l'ordine di arrivo e l'urgenza.",
              },
              {
                q: "Posso eliminare un ticket che ho aperto per errore?",
                a: "Sì, i ticket in stato Aperto possono essere eliminati dal richiedente. Usa il pulsante Elimina nella pagina di dettaglio. I ticket presi in carico possono essere eliminati solo dallo staff IT.",
              },
              {
                q: "Cosa significa 'SLA'?",
                a: "SLA (Service Level Agreement) è il tempo massimo entro cui il team IT si impegna a risolvere un ticket in base alla priorità. Se il tempo sta per scadere vedrai un avviso giallo; se è scaduto, un avviso rosso.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="px-5 py-4">
                <p className="font-medium text-gray-900">{q}</p>
                <p className="mt-1 leading-relaxed text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="pb-4 text-center text-xs text-gray-400">
          Per ulteriore assistenza rivolgiti direttamente allo staff IT aprendo un nuovo ticket.
        </p>
      </main>
    </div>
  );
}
