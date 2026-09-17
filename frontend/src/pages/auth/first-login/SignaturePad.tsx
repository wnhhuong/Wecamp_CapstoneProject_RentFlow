import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export function SignaturePad({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const point = (event: React.PointerEvent) => { const c = ref.current!; const r = c.getBoundingClientRect(); return [(event.clientX-r.left)*c.width/r.width, (event.clientY-r.top)*c.height/r.height] as const }
  const start = (event: React.PointerEvent) => { const c=ref.current!; const ctx=c.getContext('2d')!; const [x,y]=point(event); ctx.beginPath(); ctx.moveTo(x,y); setDrawing(true) }
  const move = (event: React.PointerEvent) => { if (!drawing) return; const c=ref.current!; const ctx=c.getContext('2d')!; const [x,y]=point(event); ctx.lineTo(x,y); ctx.strokeStyle='#1B2632'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.stroke(); onChange(null) }
  const end = () => { if (!drawing) return; setDrawing(false); ref.current?.toBlob((blob) => onChange(blob), 'image/png') }
  const clear = () => { const c=ref.current!; c.getContext('2d')!.clearRect(0,0,c.width,c.height); onChange(null) }
  return <div className="space-y-2"><canvas ref={ref} width={520} height={250} className="h-36 w-full touch-none rounded-lg border border-dashed border-hairline bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} /><Button type="button" variant="link" size="sm" onClick={clear} className="px-0 text-clay">Clear signature</Button></div>
}
