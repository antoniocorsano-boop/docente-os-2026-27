"use client"

import { useState } from "react"

export default function Eco02P1DemoPage() {
  const [minutes, setMinutes] = useState(60)
  return (
    <main>
      <h1>ECO-02/P1 — Dimostrazione pubblica</h1>
      <p>Tecnologia · classe 2C · Agricoltura come sistema tecnologico</p>
      <p>Durata scelta: {minutes} minuti</p>
      <button type="button" onClick={() => setMinutes(60)}>60 minuti</button>
      <button type="button" onClick={() => setMinutes(90)}>90 minuti</button>
      <button type="button" onClick={() => setMinutes(120)}>120 minuti</button>
      <p>Dimostrazione statica e non operativa. DOS-A1 resta RUNTIME_DEFERRED.</p>
    </main>
  )
}
