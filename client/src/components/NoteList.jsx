import { Plus, Trash2 } from 'lucide-react'

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60_000) return '방금 전'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}일 전`

  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function NoteList({
  notes, notebooks,
  selectedNote, setSelectedNote,
  createNote, deleteNote,
  view, selectedNotebookId
}) {
  const getHeaderTitle = () => {
    if (view === 'notebook' && selectedNotebookId) {
      return notebooks.find(n => n.id === selectedNotebookId)?.name || '노트북'
    }
    if (view === 'search') return '검색 결과'
    return '모든 노트'
  }

  const getNotebookName = (notebookId) =>
    notebooks.find(n => n.id === notebookId)?.name || ''

  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-[#F7F6F3] h-screen">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 text-sm truncate">{getHeaderTitle()}</h2>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{notes.length}개</span>
        </div>
        <button
          onClick={createNote}
          className="w-full flex items-center justify-center gap-2 bg-[#14AA37] hover:bg-[#119830] active:bg-[#0e8029] text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus size={15} />
          새 노트
        </button>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">노트가 없습니다</p>
            <p className="text-xs mt-1">새 노트를 만들어보세요</p>
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`relative px-4 py-3.5 cursor-pointer border-b border-gray-100 transition-colors group ${
                selectedNote?.id === note.id
                  ? 'bg-[#E8F5E9] border-l-2 border-l-[#14AA37]'
                  : 'hover:bg-gray-100 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-medium text-sm leading-snug flex-1 min-w-0 ${
                  selectedNote?.id === note.id ? 'text-gray-900' : 'text-gray-800'
                }`}>
                  <span className="block truncate">
                    {note.title || '제목 없는 노트'}
                  </span>
                </h3>
                <button
                  onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                  title="노트 삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-0.5">{formatDate(note.updatedAt)}</p>

              {note.contentText && (
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed overflow-hidden"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                  {note.contentText}
                </p>
              )}

              {view === 'all' && (
                <span className="inline-block mt-1.5 text-xs text-[#6B9A7A] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                  {getNotebookName(note.notebookId)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
