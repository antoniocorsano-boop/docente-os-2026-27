export default function AppLoading() {
  return (
    <main className="routeLoading" aria-live="polite" aria-busy="true">
      <div className="routeLoadingTop" aria-hidden />
      <section className="routeLoadingCard">
        <span className="routeLoadingEyebrow">DOCENTE OS</span>
        <strong>Sto aprendo il prossimo passo…</strong>
        <p>Il comando è stato ricevuto. Carico prima il contenuto operativo e poi i dettagli.</p>
        <div className="routeLoadingSkeleton" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  )
}
