import { DocenteOsMark } from '@/components/brand/docente-os-brand'

export default function AppLoading() {
  return (
    <main className="routeLoading" aria-live="polite" aria-busy="true">
      <section className="brandLoadingStage">
        <div className="brandLoadingMarkWrap" aria-hidden>
          <span className="brandLoadingOrbit" />
          <DocenteOsMark size={62} />
        </div>
        <div className="brandLoadingTitle">
          <strong>Docente OS</strong>
          <span>Mantieni il filo.</span>
        </div>
        <div className="brandLoadingThread" aria-hidden />
        <p className="brandLoadingMessage">Ritrovo il filo della tua giornata.</p>
        <span className="srOnly">Sto ricomponendo il contesto della tua giornata didattica.</span>
      </section>
    </main>
  )
}
