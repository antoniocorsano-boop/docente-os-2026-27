'use client'

import { FormEvent, useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { addTask, commaList, createTaskFromAsset, filterAssets, formatDueDate, INITIAL_ASSETS, INITIAL_TASKS, toggleTask, updateAssetContext } from './demo-state'

const CATEGORIES = ['Tutti', 'Programmazione', 'Circolare', 'Risorsa didattica']

export function DemoWorkspace() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [assets, setAssets] = useState(INITIAL_ASSETS)
  const [taskTitle, setTaskTitle] = useState('')
  const [category, setCategory] = useState('Tutti')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(INITIAL_ASSETS[1].id)
  const [notice, setNotice] = useState('')
  const [plannedDate, setPlannedDate] = useState('2026-08-28')
  const deferredQuery = useDeferredValue(query)
  const filteredAssets = useMemo(() => filterAssets(assets, category, deferredQuery), [assets, category, deferredQuery])
  const selected = assets.find((asset) => asset.id === selectedId) ?? assets[0]
  const openTasks = tasks.filter((task) => !task.completed).length

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTasks((current) => addTask(current, taskTitle))
    setTaskTitle('')
  }

  function saveContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setAssets((current) => updateAssetContext(current, selected.id, {
      category: String(data.get('category')),
      context: String(data.get('context')),
      reliability: String(data.get('reliability')),
      disciplines: commaList(String(data.get('disciplines'))),
      classLabels: commaList(String(data.get('classLabels'))),
    }))
    setNotice('Classificazione aggiornata nella dimostrazione locale.')
  }

  function planSelectedAsset() {
    const alreadyOpen = tasks.some((task) => task.sourceAssetId === selected.id && !task.completed)
    setTasks((current) => createTaskFromAsset(current, selected, plannedDate))
    setNotice(alreadyOpen ? 'L’attività collegata è già presente nel Planner.' : 'Attività creata nel Planner con riferimento alla generazione corrente.')
  }

  return (
    <div className="demoShell">
      <aside className="demoRail">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>2026/27 · Dimostrazione</span></div></div>
        <nav><a href="#oggi">Oggi</a><a href="#conoscenza">Conoscenza</a><a href="#contesto">Contesto</a></nav>
        <div className="demoUser"><span /><div><strong>Spazio docente locale</strong><small>Nessun dato reale</small></div></div>
      </aside>

      <main className="demoSurface">
        <header className="demoHeader"><div><p>VENERDÌ 21 AGOSTO</p><h1>Buonasera, Antonio</h1><span>Ambiente locale isolato · autenticazione esclusa</span></div><Link href="/login">Accesso reale</Link></header>

        <section id="oggi" className="demoSection">
          <div className="demoSectionTitle"><div><span>PLANNER</span><h2>Prossime attività</h2></div><b>{openTasks} aperte</b></div>
          <form className="demoQuickTask" onSubmit={submitTask}><label htmlFor="demo-task">Nuova attività</label><input id="demo-task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Scrivi un’attività da pianificare…" /><button type="submit">Aggiungi</button></form>
          <div className="demoTaskList">{tasks.map((task) => <article className={task.completed ? 'completed' : ''} key={task.id}><button onClick={() => setTasks((current) => toggleTask(current, task.id))} aria-label={`${task.completed ? 'Riapri' : 'Completa'} ${task.title}`}>{task.completed ? '✓' : ''}</button><div><strong>{task.title}</strong><span>{[task.schoolYear, ...task.disciplines, ...task.classLabels].join(' · ')}</span>{task.sourceGeneration && <small>{task.meta} · Generazione #{task.sourceGeneration} · {task.verificationStatus}</small>}</div><em>{task.priority}</em><time>{formatDueDate(task.dueDate)}</time></article>)}</div>
        </section>

        <section id="conoscenza" className="demoSection">
          <div className="demoSectionTitle"><div><span>BASE DI CONOSCENZA</span><h2>Asset contestualizzati</h2></div><b>{filteredAssets.length}</b></div>
          <div className="demoSearch"><label htmlFor="demo-search">Ricerca nella base di conoscenza</label><input id="demo-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca titolo, disciplina o classe…" /></div>
          <div className="demoFilters">{CATEGORIES.map((item) => <button type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
          {filteredAssets.length ? <div className="demoAssetGrid">{filteredAssets.map((asset) => <button type="button" className={selected.id === asset.id ? 'selected' : ''} onClick={() => setSelectedId(asset.id)} key={asset.id}><div className="demoAssetTop"><span>{asset.category}</span><b>{asset.context}</b></div><h3>{asset.title}</h3><p>{asset.summary}</p><div>{[...asset.disciplines, ...asset.classLabels].map((tag) => <small key={tag}>{tag}</small>)}</div></button>)}</div> : <p className="demoEmpty">Nessun asset corrisponde ai filtri impostati.</p>}
        </section>

        <section id="contesto" className="demoSection demoContext">
          <div className="demoSectionTitle"><div><span>DETTAGLIO ASSET</span><h2>{selected.title}</h2></div><b>Generazione #{selected.generation}</b></div>
          <form className="demoContextForm" onSubmit={saveContext} key={selected.id}>
            <label>Anno scolastico<input value="2026/27" readOnly /></label>
            <label>Tipologia<select name="category" defaultValue={selected.category}><option>Programmazione</option><option>Circolare</option><option>Risorsa didattica</option><option>Unità di apprendimento</option></select></label>
            <label>Discipline<input name="disciplines" defaultValue={selected.disciplines.join(', ')} placeholder="Tecnologia" /></label>
            <label>Classi e sezioni<input name="classLabels" defaultValue={selected.classLabels.join(', ')} placeholder="1A, 2C" /></label>
            <label>Stato<select name="context" defaultValue={selected.context}><option>Da classificare</option><option>Da controllare</option><option>Controllata</option></select></label>
            <label>Attendibilità<select name="reliability" defaultValue={selected.reliability}><option>Automatica</option><option>Da verificare</option><option>Verificata</option></select></label>
            <button type="submit">Salva classificazione</button>
          </form>
          <div className="demoContextActions">
            <label>Scadenza attività<input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label>
            <button type="button" onClick={planSelectedAsset}>Crea attività nel Planner</button>
            {notice && <p role="status">{notice}</p>}
          </div>
          <div className="demoPipeline"><span>Originale immutabile</span><i>→</i><span>Generazione #{selected.generation}</span><i>→</i><span>Documento normalizzato</span><i>→</i><span>Unità KB</span></div>
        </section>
      </main>
    </div>
  )
}
