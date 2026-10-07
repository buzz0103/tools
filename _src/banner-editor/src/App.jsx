import { useState, useRef, useCallback } from 'react'
import { Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import SettingsPanel from './components/SettingsPanel'
import BannerPreview from './components/BannerPreview'
import './index.css'

const defaultSettings = {
  title: '강의 제목을 입력하세요',
  subtitle: '부제목 또는 설명을 입력하세요',
  instructorCount: 1,
  instructors: [{ name: '강사 이름', role: '강사', brand: '', photo: null, photoOffsetX: 50, photoOffsetY: 10, photoScale: 1 }],
  bgColor: '#f2f6f8',
  accentColor: '#6366f1',
  textColor: '#6366f1',
  infoBgColor: '',
  tagline: '지금 바로 시작하세요',
  showTagline: false,
  showLogo: false,
  logoText: 'ACADEMY',
  textPosition: 'top',
  bannerWidth: 2560,
  bannerHeight: 380,
  contentMaxW: 1136,
  bannerLayout: 'horizontal',
  photoWidthPct: 100,
  photoGap: 0,
}

export default function App() {
  const [settings, setSettings] = useState(defaultSettings)
  const [isExporting, setExporting] = useState(false)
  // 내보내기용 배너(화면 밖, 실제 크기) — BannerPreview 안에서 연결
  const exportRef = useRef(null)

  /* ── PNG 저장 (헤더 버튼) ── */
  const handleExport = useCallback(async () => {
    if (!exportRef.current || isExporting) return
    setExporting(true)
    try {
      const canvas = await html2canvas(exportRef.current, {
        width: settings.bannerWidth,
        height: settings.bannerHeight,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = 'banner.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }, [settings.bannerWidth, settings.bannerHeight, isExporting])

  const update = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const updateInstructor = (index, field, value) => {
    setSettings((prev) => ({
      ...prev,
      instructors: prev.instructors.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      ),
    }))
  }

  const changeInstructorCount = (count) => {
    const clamped = Math.max(1, Math.min(8, count))
    const current = settings.instructors
    const updated =
      clamped > current.length
        ? [
            ...current,
            ...Array.from({ length: clamped - current.length }, (_, i) => ({
              name: `강사 ${current.length + i + 1}`,
              role: '강사',
              brand: '',
              photo: null,
              photoOffsetX: 50, photoOffsetY: 10, photoScale: 1,
            })),
          ]
        : current.slice(0, clamped)
    setSettings((prev) => ({ ...prev, instructorCount: clamped, instructors: updated }))
  }

  const updateInstructorPhoto = (index, photoUrl) => {
    setSettings((prev) => ({
      ...prev,
      instructors: prev.instructors.map((inst, i) =>
        i === index ? { ...inst, photo: photoUrl } : inst
      ),
    }))
  }

  const reorderInstructors = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= settings.instructors.length) return
    setSettings((prev) => {
      const arr = [...prev.instructors]
      const [item] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, item)
      return { ...prev, instructors: arr }
    })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-fill text-ink max-[880px]:h-auto max-[880px]:min-h-screen max-[880px]:overflow-visible">
      <header className="flex-shrink-0 min-h-14 pl-6 pr-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-white border-b border-line max-[880px]:sticky max-[880px]:top-0 max-[880px]:z-20 max-[880px]:px-4 max-[880px]:py-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* tools 사이트의 도구 모음으로 돌아가기 */}
          <a
            href="../"
            className="flex-shrink-0 pr-3 border-r border-edge text-sm font-medium text-sub no-underline transition-opacity hover:opacity-70 active:opacity-50"
          >
            ‹ 도구 모음
          </a>
          <h1 className="m-0 text-lg leading-6 font-bold tracking-[-0.01em] whitespace-nowrap">배너 에디터</h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="h-9 px-4 inline-flex items-center gap-1.5 rounded-[5px] bg-primary text-white text-sm font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70 active:opacity-50 disabled:bg-off disabled:cursor-default disabled:opacity-100"
        >
          {isExporting
            ? <><Loader2 size={16} className="animate-spin" /> 저장 중…</>
            : <><Download size={16} /> PNG로 저장</>}
        </button>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[360px_minmax(0,1fr)] gap-4 p-4 max-[880px]:grid-cols-1">
        <SettingsPanel
          settings={settings}
          onUpdate={update}
          onUpdateInstructor={updateInstructor}
          onChangeInstructorCount={changeInstructorCount}
        />
        <BannerPreview
          settings={settings}
          onPhotoUpload={updateInstructorPhoto}
          onReorder={reorderInstructors}
          onUpdateInstructor={updateInstructor}
          exportRef={exportRef}
        />
      </div>
    </div>
  )
}
