import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { BookOpen, Clock } from 'lucide-react'
import Toolbar from './Toolbar'

const AUTOSAVE_DELAY = 800

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function NoteEditor({ note, notebooks, updateNote }) {
  const [title, setTitle] = useState(note.title)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef(null)

  const doSave = useCallback(async (updates) => {
    setSaving(true)
    try {
      await updateNote(note.id, updates)
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
    pendingSaveRef.current = null
  }, [note.id, updateNote])

  const debouncedSave = useCallback((updates) => {
    pendingSaveRef.current = { ...(pendingSaveRef.current || {}), ...updates }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(pendingSaveRef.current), AUTOSAVE_DELAY)
  }, [doSave])

  // Save pending changes immediately on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (pendingSaveRef.current) {
        updateNote(note.id, pendingSaveRef.current)
      }
    }
  }, [note.id, updateNote])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '노트를 작성하세요...' }),
      Underline,
      Highlight,
    ],
    content: note.content,
    onUpdate: ({ editor }) => {
      debouncedSave({
        content: editor.getHTML(),
        contentText: editor.getText()
      })
    }
  })

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    debouncedSave({ title: e.target.value })
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      editor?.commands.focus()
    }
  }

  const notebook = notebooks.find(nb => nb.id === note.notebookId)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
      {/* Toolbar */}
      <Toolbar editor={editor} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-12 py-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="제목 없는 노트"
            className="w-full text-[2rem] font-bold text-gray-900 border-none outline-none bg-transparent placeholder-gray-300 leading-tight mb-3"
          />

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <BookOpen size={12} />
              {notebook?.name || '노트북'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              수정: {formatDateTime(note.updatedAt)}
            </span>
            {saving && (
              <span className="text-[#14AA37] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-[#14AA37] rounded-full animate-pulse" />
                저장 중...
              </span>
            )}
            {!saving && savedAt && (
              <span className="text-gray-300">저장됨</span>
            )}
          </div>

          {/* TipTap editor */}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
