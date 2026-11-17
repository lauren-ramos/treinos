import type { ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from './ui'

function Row({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    <button className="drag-handle btn btn-icon !min-h-9 !w-9 shrink-0" aria-label="Arrastar para reordenar" {...attributes} {...listeners}>
      <Icon n="drag" size={18} />
    </button>
  )
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.85 : 1 }}>
      {children(handle)}
    </div>
  )
}

/** Lista reordenável por arrastar e soltar (mouse, toque e teclado). */
export function SortableList<T extends { id: string }>({ items, onReorder, children, className = 'space-y-2' }: { items: T[]; onReorder: (ids: string[]) => void; children: (item: T, handle: ReactNode, index: number) => ReactNode; className?: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function end(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = items.map((i) => i.id)
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((it, i) => <Row key={it.id} id={it.id}>{(h) => children(it, h, i)}</Row>)}
        </div>
      </SortableContext>
    </DndContext>
  )
}
