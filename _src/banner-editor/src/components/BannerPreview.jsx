import {
  ZoomIn, ZoomOut, Maximize, Upload, X,
  ImagePlus, ChevronLeft, ChevronRight,
  Move, RotateCcw,
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

// 도구줄 버튼 (축소·확대·맞춤)
const zoomBtnCls =
  'h-8 min-w-8 px-2 inline-flex items-center justify-center gap-1 rounded-[5px] text-[13px] font-medium text-ink cursor-pointer transition-opacity hover:opacity-70 active:opacity-50'

/* ─── 공유 레이아웃 계산 ─────────────────────────────────── */

function calcBannerLayout(n, width, height, maxContentW = 1136, photoWidthPct = 100) {
  const contentW   = Math.min(maxContentW, width)
  const contentX   = Math.round((width - contentW) / 2)

  const padH      = Math.round(contentW * 0.042)
  const padV      = Math.round(height   * 0.070)
  const infoH     = Math.round(height   * 0.230)
  const logoBoxSz = Math.round(Math.min(32, Math.max(22, contentW * 0.026)))
  const rightPct  = Math.min(0.70, 0.48 + (n - 1) * 0.025)
  const leftW     = Math.round(contentW * (1 - rightPct))
  const rightW    = contentW - leftW
  const slotW     = rightW / n
  const overlapFactor = n === 1 ? 1.0 : Math.min(1.60, 1.15 + (n - 1) * 0.07)
  const photoW    = Math.round(Math.min(Math.round(height * 0.90), Math.round(slotW * overlapFactor)) * photoWidthPct / 100)
  return { contentW, contentX, padH, padV, infoH, logoBoxSz, leftW, rightW, slotW, photoW }
}

/* ─── BannerPreview ──────────────────────────────────────── */

// exportRef: PNG 저장용 배너 요소 (저장은 App 헤더 버튼에서 처리)
export default function BannerPreview({ settings, onPhotoUpload, onReorder, onUpdateInstructor, exportRef }) {
  const [zoom, setZoom]               = useState(null)
  const [selectedPhoto, setSelected]  = useState(null) // index | null
  const [isDragging, setDragging]     = useState(false)
  const canvasRef  = useRef(null)
  const bannerRef  = useRef(null)

  const {
    title, subtitle, instructors, bgColor, accentColor,
    textColor, infoBgColor, tagline, showTagline, showLogo, logoText,
    textPosition, bannerWidth, bannerHeight, contentMaxW = 1136,
    bannerLayout = 'horizontal', photoWidthPct = 100, photoGap = 0,
  } = settings

  const calcFitZoom = useCallback(() => {
    const el = canvasRef.current
    if (!el) return 0.5
    const pad = 80
    const zw = (el.clientWidth - pad) / bannerWidth
    const zh = (el.clientHeight - pad) / bannerHeight
    return Math.min(zw, zh, 1)
  }, [bannerWidth, bannerHeight])

  useEffect(() => { setZoom(calcFitZoom()) }, [calcFitZoom])

  const ez      = zoom ?? 0.5          // effectiveZoom
  const scaledW = Math.round(bannerWidth  * ez)
  const scaledH = Math.round(bannerHeight * ez)

  const layout  = calcBannerLayout(instructors.length, bannerWidth, bannerHeight, contentMaxW, photoWidthPct)

  /* ── 드래그 핸들러 ── */
  const handlePhotoDragStart = useCallback((e, idx, slotWpx, slotHpx) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setSelected(idx)
    setDragging(true)

    const inst    = instructors[idx]
    const startX  = e.clientX
    const startY  = e.clientY
    const startOX = inst.photoOffsetX ?? 50
    const startOY = inst.photoOffsetY ?? 10

    const onMove = (me) => {
      const dx  = me.clientX - startX
      const dy  = me.clientY - startY
      const newOX = Math.max(0, Math.min(100, startOX - (dx / slotWpx) * 80))
      const newOY = Math.max(0, Math.min(100, startOY - (dy / slotHpx) * 80))
      onUpdateInstructor(idx, 'photoOffsetX', newOX)
      onUpdateInstructor(idx, 'photoOffsetY', newOY)
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [instructors, onUpdateInstructor])

  /* ── 스크롤 줌 핸들러 ── */
  const handlePhotoWheel = useCallback((e, idx) => {
    e.preventDefault()
    const inst = instructors[idx]
    const cur  = inst.photoScale ?? 1
    const next = Math.max(1, Math.min(3, cur + (e.deltaY < 0 ? 0.08 : -0.08)))
    onUpdateInstructor(idx, 'photoScale', parseFloat(next.toFixed(2)))
  }, [instructors, onUpdateInstructor])

  /* ── 포지션 리셋 ── */
  const resetPhoto = useCallback((e, idx) => {
    e.stopPropagation()
    onUpdateInstructor(idx, 'photoOffsetX', 50)
    onUpdateInstructor(idx, 'photoOffsetY', 10)
    onUpdateInstructor(idx, 'photoScale', 1)
  }, [onUpdateInstructor])

  /* ── 스케일 조절 ── */
  const adjustScale = useCallback((e, idx, delta) => {
    e.stopPropagation()
    const inst = instructors[idx]
    const next = Math.max(1, Math.min(3, (inst.photoScale ?? 1) + delta))
    onUpdateInstructor(idx, 'photoScale', parseFloat(next.toFixed(2)))
  }, [instructors, onUpdateInstructor])

  return (
    <main className="flex flex-col gap-2 min-w-0 min-h-0 max-[880px]:min-h-[70vh]">
      {/* 도구줄: 축소 · 배율 · 확대 · 맞춤 (wallpaper zoom-bar와 같은 형태) */}
      <div className="flex-shrink-0 px-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="축소" onClick={() => setZoom((z) => Math.max(0.15, (z ?? ez) - 0.1))}
            className={zoomBtnCls}>
            <ZoomOut size={16} strokeWidth={1.8} />
          </button>
          <span className="min-w-12 text-center text-[13px] font-medium text-ink select-none tabular-nums">
            {Math.round(ez * 100)}%
          </span>
          <button type="button" aria-label="확대" onClick={() => setZoom((z) => Math.min(2, (z ?? ez) + 0.1))}
            className={zoomBtnCls}>
            <ZoomIn size={16} strokeWidth={1.8} />
          </button>
          <span className="w-px h-3.5 mx-1 bg-edge" />
          <button type="button" onClick={() => setZoom(calcFitZoom())} className={zoomBtnCls}>
            <Maximize size={16} strokeWidth={1.8} /> 맞춤
          </button>
        </div>

        {selectedPhoto !== null && (
          <span className="text-xs leading-4 font-medium text-primary flex items-center gap-1">
            <Move size={12} />
            드래그로 이동 · 스크롤로 확대/축소
          </span>
        )}

        <span className="ml-auto text-xs leading-4 text-sub tabular-nums">
          {bannerWidth} × {bannerHeight}
        </span>
      </div>

      {/* 내보내기 전용 — 화면 밖, 실제 크기, transform 없음 */}
      <div style={{ position: 'fixed', left: '-99999px', top: '-99999px', pointerEvents: 'none', zIndex: -1 }}>
        <div ref={exportRef} style={{ width: bannerWidth, height: bannerHeight }}>
          <Banner
            title={title} subtitle={subtitle} instructors={instructors}
            bgColor={bgColor} accentColor={accentColor} textColor={textColor}
            infoBgColor={infoBgColor} tagline={tagline} showTagline={showTagline}
            showLogo={showLogo} logoText={logoText} textPosition={textPosition}
            width={bannerWidth} height={bannerHeight} layout={layout}
            contentMaxW={contentMaxW} bannerLayout={bannerLayout}
            photoWidthPct={photoWidthPct} photoGap={photoGap}
          />
        </div>
      </div>

      {/* 캔버스 + 오버레이 */}
      <div
        ref={canvasRef}
        className="flex-1 min-h-0 overflow-auto flex items-center justify-center"
        onClick={() => setSelected(null)}
      >
        <div
          style={{
            width: scaledW, height: scaledH,
            position: 'relative', flexShrink: 0, margin: 40,
            boxShadow: '0 0 0 1px #EFEFEF, 0 2px 12px rgba(0,0,0,0.08)',
            borderRadius: Math.max(2, 5 * ez),
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 배너 렌더러 */}
          <div
            ref={bannerRef}
            style={{
              width: bannerWidth, height: bannerHeight,
              transform: `scale(${ez})`, transformOrigin: 'top left',
              position: 'absolute', top: 0, left: 0,
            }}>
            <Banner
              title={title} subtitle={subtitle} instructors={instructors}
              bgColor={bgColor} accentColor={accentColor} textColor={textColor}
              infoBgColor={infoBgColor} tagline={tagline} showTagline={showTagline}
              showLogo={showLogo} logoText={logoText} textPosition={textPosition}
              width={bannerWidth} height={bannerHeight} layout={layout}
              contentMaxW={contentMaxW} bannerLayout={bannerLayout}
              photoWidthPct={photoWidthPct} photoGap={photoGap}
            />
          </div>

          {/* ── 사진 조작 오버레이 ── */}
          {bannerLayout === 'vertical' ? (() => {
            const photoSecTop   = Math.round(bannerHeight * 0.5) - 30
            const photoSecH     = bannerHeight - photoSecTop
            const cw            = Math.min(contentMaxW, bannerWidth)
            const cardPhotoSecH = photoSecH
            const cardSlotW     = instructors.length === 1 ? Math.min(cw / instructors.length, cardPhotoSecH) : cw / instructors.length
            const cardPhotoW    = Math.round(cardSlotW * photoWidthPct / 100)
            const cardStep      = cardSlotW + photoGap
            const cardGroupSpan = (instructors.length - 1) * cardStep + cardPhotoW
            const cardGroupLeft = Math.round((bannerWidth - cardGroupSpan) / 2)
            const nameBarH      = Math.round(photoSecH * 0.28)

            return instructors.map((inst, i) => {
              const slotLeftPx   = (cardGroupLeft + i * cardStep) * ez
              const slotTopPx    = photoSecTop * ez
              const slotWidthPx  = cardPhotoW * ez
              const slotHeightPx = (photoSecH - nameBarH) * ez
              const isSelected   = selectedPhoto === i
              const scale        = inst.photoScale ?? 1

              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: slotLeftPx, top: slotTopPx,
                  width: slotWidthPx, height: slotHeightPx,
                  cursor: isDragging && isSelected ? 'grabbing' : inst.photo ? 'grab' : 'default',
                  zIndex: isSelected ? 20 : 10,
                }}
                  onMouseDown={inst.photo ? (e) => handlePhotoDragStart(e, i, slotWidthPx, slotHeightPx) : undefined}
                  onWheel={inst.photo ? (e) => handlePhotoWheel(e, i) : undefined}
                  onClick={(e) => { e.stopPropagation(); setSelected(i === selectedPhoto ? null : i) }}
                >
                  {isSelected && <div style={{ position: 'absolute', inset: 0, border: '2px solid #1775F0', pointerEvents: 'none', zIndex: 1 }} />}
                  {!isSelected && inst.photo && <HoverHint />}
                  {isSelected && inst.photo && <PhotoControls scale={scale} bottom={8} onMinus={(e) => adjustScale(e, i, -0.1)} onPlus={(e) => adjustScale(e, i, 0.1)} onReset={(e) => resetPhoto(e, i)} />}
                </div>
              )
            })
          })() : instructors.map((inst, i) => {
            const webGroupOffsetX = instructors.length === 1 ? Math.round((layout.rightW - layout.photoW) / 2) : 0
            const slotLeftPx   = (layout.contentX + layout.leftW + webGroupOffsetX + i * (layout.slotW + photoGap)) * ez
            const slotTopPx    = 100 * ez
            const slotWidthPx  = layout.photoW * ez
            const slotHeightPx = scaledH - slotTopPx
            const infoHpx      = layout.infoH * ez
            const isSelected   = selectedPhoto === i
            const scale        = inst.photoScale ?? 1

            return (
              <div key={i} style={{
                position: 'absolute',
                left: slotLeftPx, top: slotTopPx,
                width: slotWidthPx, height: slotHeightPx,
                cursor: isDragging && isSelected ? 'grabbing' : inst.photo ? 'grab' : 'default',
                zIndex: isSelected ? 20 : 10,
              }}
                onMouseDown={inst.photo ? (e) => handlePhotoDragStart(e, i, slotWidthPx, slotHeightPx) : undefined}
                onWheel={inst.photo ? (e) => handlePhotoWheel(e, i) : undefined}
                onClick={(e) => { e.stopPropagation(); setSelected(i === selectedPhoto ? null : i) }}
              >
                {isSelected && <div style={{ position: 'absolute', inset: 0, border: '2px solid #1775F0', pointerEvents: 'none', zIndex: 1 }} />}
                {!isSelected && inst.photo && <HoverHint />}
                {isSelected && inst.photo && <PhotoControls scale={scale} bottom={infoHpx + 8} onMinus={(e) => adjustScale(e, i, -0.1)} onPlus={(e) => adjustScale(e, i, 0.1)} onReset={(e) => resetPhoto(e, i)} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* 강사 사진 드롭존 패널 */}
      <InstructorPhotoPanel
        instructors={instructors}
        selectedIndex={selectedPhoto}
        onSelect={setSelected}
        onPhotoUpload={onPhotoUpload}
        onReorder={onReorder}
      />
    </main>
  )
}

/* ─── 강사 사진 패널 ─────────────────────────────────────── */

function InstructorPhotoPanel({ instructors, selectedIndex, onSelect, onPhotoUpload, onReorder }) {
  const handleMove = (fromIndex, dir) => {
    const toIndex = fromIndex + dir
    if (toIndex < 0 || toIndex >= instructors.length) return
    onReorder(fromIndex, toIndex)
    onSelect(toIndex)
  }

  return (
    <section className="flex-shrink-0 rounded-xl bg-white">
      <div className="px-6 pt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="m-0 text-xs leading-4 font-semibold text-sub">강사 사진</h2>
        <span className="text-xs leading-[18px] text-muted">
          슬롯을 누른 뒤 배너에서 드래그·스크롤로 사진을 조정해요
        </span>
      </div>
      <div className="flex gap-2 px-4 pb-4 pt-2 overflow-x-auto">
        {instructors.map((inst, i) => (
          <InstructorDropZone
            key={i} index={i} total={instructors.length}
            instructor={inst}
            isSelected={selectedIndex === i}
            onSelect={() => onSelect(i === selectedIndex ? null : i)}
            onMoveForward={() => handleMove(i, -1)}
            onMoveBackward={() => handleMove(i, 1)}
            onPhotoUpload={onPhotoUpload}
          />
        ))}
      </div>
    </section>
  )
}

/* ─── 개별 강사 드롭존 ───────────────────────────────────── */

function InstructorDropZone({ index, total, instructor, isSelected, onSelect, onMoveForward, onMoveBackward, onPhotoUpload }) {
  const onDrop = useCallback((accepted) => {
    if (!accepted[0]) return
    onPhotoUpload(index, URL.createObjectURL(accepted[0]))
  }, [index, onPhotoUpload])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, multiple: false,
  })

  const removePhoto = (e) => { e.stopPropagation(); onPhotoUpload(index, null) }
  const stopAndCall = (e, fn) => { e.stopPropagation(); fn() }

  const isFirst = index === 0
  const isLast  = index === total - 1

  return (
    <div
      className={['flex flex-col items-center gap-2 flex-shrink-0 rounded-[7px] p-2 cursor-pointer transition-colors',
        isSelected ? 'bg-tint' : 'hover:bg-fill',
      ].join(' ')}
      onClick={onSelect}
    >
      {/* 드롭존 */}
      <div
        {...getRootProps()}
        onClick={(e) => e.stopPropagation()}
        className={['relative w-24 h-24 rounded-[5px] cursor-pointer transition-colors overflow-hidden group',
          isDragReject    ? 'border-2 border-danger bg-white'
          : isDragActive  ? 'border-2 border-primary bg-tint'
          : isSelected    ? 'border-2 border-primary bg-white'
          : instructor.photo ? 'border border-edge'
          : 'border border-dashed border-edge bg-white text-sub hover:border-primary hover:text-primary',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        {instructor.photo ? (
          <>
            <img src={instructor.photo} alt={instructor.name}
              className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 flex items-center justify-center">
              <Upload size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            </div>
            <button type="button" onClick={removePhoto} aria-label={`${instructor.name} 사진 삭제`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-danger flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 z-10 cursor-pointer">
              <X size={12} className="text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1 px-2">
            {isDragActive ? (
              <>
                <Upload size={20} strokeWidth={1.8} className="text-primary" />
                <p className="text-xs leading-4 font-medium text-primary text-center">여기에 놓기</p>
              </>
            ) : (
              <>
                <ImagePlus size={20} strokeWidth={1.8} />
                <p className="text-xs leading-4 font-medium text-center">사진 추가</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 이름 / 역할 */}
      <div className="text-center w-24 px-1">
        <p className="text-xs leading-4 font-bold text-ink truncate">{instructor.name}</p>
        <p className="text-[11px] leading-4 text-muted truncate">{instructor.role}</p>
      </div>

      {/* 이동 버튼 */}
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {[
          { label: '앞', icon: <ChevronLeft size={12} />, disabled: isFirst, onClick: onMoveForward, isLeft: true },
          { label: '뒤', icon: <ChevronRight size={12} />, disabled: isLast,  onClick: onMoveBackward, isLeft: false },
        ].map(({ label, icon, disabled, onClick, isLeft }) => (
          <button
            key={label}
            type="button"
            aria-label={`${instructor.name} ${label}으로 이동`}
            onClick={(e) => stopAndCall(e, onClick)}
            disabled={disabled}
            className="h-7 px-2 flex items-center gap-0.5 rounded-[5px] border border-edge bg-white text-[11px] font-medium text-ink cursor-pointer transition-opacity hover:opacity-70 active:opacity-50 disabled:bg-off disabled:border-off disabled:text-white disabled:cursor-default disabled:opacity-100"
          >
            {isLeft ? icon : null}{label}{isLeft ? null : icon}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── 공용 오버레이 헬퍼 ─────────────────────────────────── */

function HoverHint() {
  return (
    <div className="absolute inset-0 flex items-start justify-center opacity-0 hover:opacity-100 transition-opacity duration-150 pt-2 pointer-events-none">
      <div style={{ background: 'rgba(15,15,25,0.70)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Move size={9} /> 클릭하여 조정
      </div>
    </div>
  )
}

function PhotoControls({ scale, bottom, onMinus, onPlus, onReset }) {
  return (
    <div style={{
      position: 'absolute', bottom, left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(15,15,25,0.85)', backdropFilter: 'blur(6px)',
      borderRadius: 24, padding: '5px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      fontSize: 11, color: '#fff', fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap',
    }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button onClick={onMinus} disabled={scale <= 1} style={{ background: 'none', border: 'none', color: scale <= 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: scale <= 1 ? 'default' : 'pointer', lineHeight: 1, padding: '0 2px', fontSize: 14, fontWeight: 300 }}>−</button>
      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 11 }}>{Math.round(scale * 100)}%</span>
      <button onClick={onPlus} disabled={scale >= 3} style={{ background: 'none', border: 'none', color: scale >= 3 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: scale >= 3 ? 'default' : 'pointer', lineHeight: 1, padding: '0 2px', fontSize: 14, fontWeight: 300 }}>+</button>
      <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.25)', margin: '0 2px' }} />
      <button onClick={onReset} title="원래대로" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
        <RotateCcw size={10} />
      </button>
    </div>
  )
}

/* ─── 배너 렌더러 ────────────────────────────────────────── */

function Banner({
  title, subtitle, instructors, bgColor, accentColor, textColor, infoBgColor,
  tagline, showTagline, showLogo, logoText, textPosition, width, height, layout,
  bannerLayout, contentMaxW, photoWidthPct, photoGap = 0,
}) {
  if (bannerLayout === 'vertical') {
    return (
      <CardBannerContent
        title={title} subtitle={subtitle} instructors={instructors}
        bgColor={bgColor} accentColor={accentColor} textColor={textColor}
        infoBgColor={infoBgColor}
        tagline={tagline} showTagline={showTagline}
        showLogo={showLogo} logoText={logoText}
        width={width} height={height} contentMaxW={contentMaxW}
        photoWidthPct={photoWidthPct} photoGap={photoGap}
      />
    )
  }
  const n = instructors.length
  const { contentW, contentX, padH, padV, infoH, logoBoxSz, leftW, rightW, slotW, photoW } = layout

  const rgb        = hexToRgb(accentColor)
  const accentFade = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)` : 'rgba(99,102,241,0.13)'
  const resolvedBar = infoBgColor || accentColor
  const barRgb     = hexToRgb(resolvedBar)
  const barSolid   = barRgb ? `rgba(${barRgb.r},${barRgb.g},${barRgb.b},0.7)` : resolvedBar
  const barFade    = barRgb ? `rgba(${barRgb.r},${barRgb.g},${barRgb.b},0)` : 'transparent'

  const titleSz    = Math.round(Math.min(80, Math.max(32, leftW * 0.13)))
  const subtitleSz = Math.round(Math.min(22, Math.max(11, leftW * 0.040)))
  const logoFontSz = Math.round(Math.min(18, Math.max(12, contentW * 0.016)))

  const photoGroupOffsetX = n === 1 ? Math.round((rightW - photoW) / 2) : 0

  // 정보 바: 사진 그룹 기준, 좌우 80px 확장
  const step           = slotW + photoGap
  const photoGroupLeft = contentX + leftW + photoGroupOffsetX
  const infoBarPad     = 80
  const infoBarLeft    = Math.max(0, photoGroupLeft - infoBarPad)
  const infoBarW       = (n - 1) * step + photoW + infoBarPad + (photoGroupLeft - infoBarLeft) + infoBarPad

  const infoSlotW   = photoW   // 각 슬롯 = 사진 너비 (중간 슬롯은 step만큼 차지)
  const infoLg      = Math.round(Math.min(20, Math.max(10, photoW * 0.115)))
  const infoSm      = Math.round(Math.min(14, Math.max( 8, photoW * 0.082)))

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: bgColor, fontFamily: "'Paperozi','Pretendard','Noto Sans KR',system-ui,sans-serif", boxSizing: 'border-box' }}>

      {/* 강사 사진 */}
      {instructors.map((inst, i) => {
        const zIndex   = n + 2 - i
        const iconSz   = Math.round(photoW * 0.22)
        const offsetX  = inst.photoOffsetX ?? 50
        const offsetY  = inst.photoOffsetY ?? 10
        const scale    = inst.photoScale   ?? 1

        return (
          <div key={i} style={{ position: 'absolute', left: contentX + leftW + photoGroupOffsetX + i * (slotW + photoGap), top: 80, width: photoW, height: height - 80, zIndex, overflow: 'hidden' }}>
            {inst.photo ? (
              <div
                style={{
                  width: '100%', height: '100%',
                  backgroundImage: `url(${inst.photo})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `${offsetX}% ${offsetY}%`,
                  backgroundRepeat: 'no-repeat',
                  transform: `scale(${scale})`,
                  transformOrigin: `${offsetX}% ${offsetY}%`,
                  pointerEvents: 'none',
                  willChange: 'transform',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(170deg,${accentFade},rgba(0,0,0,0.04))`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: iconSz*1.8, height: iconSz*1.8, borderRadius: '50%', backgroundColor: accentColor, opacity: 0.22, position: 'absolute' }} />
                <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
                <p style={{ fontSize: Math.round(photoW * 0.07), color: textColor, opacity: 0.3, fontWeight: 600, marginTop: iconSz }}>+ 사진 추가</p>
              </div>
            )}
          </div>
        )
      })}

      {/* 좌측 텍스트 */}
      <div style={{ position: 'absolute', left: contentX + padH, top: padV, width: leftW - padH*2, bottom: infoH + padV, zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        {showLogo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: logoBoxSz, height: logoBoxSz, borderRadius: Math.round(logoBoxSz*0.25), backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(logoBoxSz*0.46), color: '#fff' }}>
              {logoText.charAt(0)}
            </div>
            <span style={{ fontWeight: 700, fontSize: logoFontSz, letterSpacing: '0.06em', color: textColor, opacity: 0.92 }}>{logoText}</span>
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: textPosition === 'top' ? 'flex-start' : 'flex-end', paddingTop: textPosition === 'top' ? Math.round(height*0.045) : 0, paddingBottom: textPosition === 'top' ? 0 : Math.round(height*0.025) }}>
          {/* <div style={{ width: Math.round(contentW*0.034), height: 4, borderRadius: 2, backgroundColor: accentColor, marginBottom: 10, flexShrink: 0 }} /> */}
          <h2 style={{ margin: 0, fontSize: titleSz, fontWeight: 800, lineHeight: 1.14, color: textColor, letterSpacing: '-0.02em', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', flexShrink: 0 }}>{title}</h2>
          {subtitle && <p style={{ margin: 0, marginTop: Math.round(titleSz*0.2), fontSize: subtitleSz, color: textColor, opacity: 0.62, lineHeight: 1.5, wordBreak: 'keep-all', whiteSpace: 'pre-wrap', flexShrink: 0 }}>{subtitle}</p>}
          {showTagline && <p style={{ margin: 0, marginTop: Math.round(titleSz*0.2), fontSize: Math.round(Math.min(22, Math.max(11, contentW*0.012))), fontWeight: 600, color: textColor, opacity: 0.85, letterSpacing: '0.02em', whiteSpace: 'nowrap', flexShrink: 0 }}>{tagline}</p>}
        </div>
      </div>

      {/* 정보 바 — 사진 그룹 좌우 80px 확장 */}
      <div style={{
        position: 'absolute', bottom: 0,
        left: infoBarLeft, width: infoBarW,
        height: infoH, zIndex: n+10,
        background: `linear-gradient(to right, ${barFade} 0%, ${barSolid} 10%, ${barSolid} 90%, ${barFade} 100%)`,
        backdropFilter: 'blur(0.5px)',
        display: 'flex', alignItems: 'stretch',
        paddingLeft: photoGroupLeft - infoBarLeft,
        boxSizing: 'border-box',
      }}>
        {instructors.map((inst, i) => {
          const slotWidth = i < n - 1 ? step : photoW
          return (
            <div key={i} style={{ width: slotWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${Math.max(4, Math.round(photoW*0.05))}px`, borderLeft: i > 0 ? '0px solid rgba(255,255,255,0.15)' : 'none', position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: infoLg, color: '#fff', lineHeight: 1.25, wordBreak: 'keep-all', overflow: 'hidden', maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{inst.brand || logoText}</p>
              <p style={{ margin: 0, marginTop: Math.round(infoH*0.07), fontSize: infoSm, color: 'rgba(255,255,255,0.72)', lineHeight: 1.2, overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{inst.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── 카드 배너 (수직 레이아웃) ─────────────────────────── */

function CardBannerContent({
  title, subtitle, instructors, bgColor, accentColor, textColor, infoBgColor,
  tagline, showTagline, showLogo, logoText, width, height, contentMaxW,
  photoWidthPct = 100, photoGap = 0,
}) {
  const n           = instructors.length
  const contentW    = Math.min(contentMaxW, width)
  const contentX    = Math.round((width - contentW) / 2)
  const padH        = Math.round(contentW * 0.06)
  const padV        = Math.round(height * 0.06)
  const photoSecTop = Math.round(height * 0.50) - 30
  const photoSecH   = height - photoSecTop
  const slotW       = n === 1 ? Math.min(contentW / n, Math.round(photoSecH * 1.6)) : contentW / n
  const photoW      = Math.round(slotW * photoWidthPct / 100)
  const step        = slotW + photoGap
  const groupSpan   = (n - 1) * step + photoW
  const groupLeft   = Math.round((width - groupSpan) / 2)
  const nameBarH    = Math.round(photoSecH * 0.28)

  const rgb         = hexToRgb(accentColor)
  const accentFade  = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)` : 'rgba(99,102,241,0.13)'
  const resolvedBar = infoBgColor || accentColor
  const barRgb      = hexToRgb(resolvedBar)
  const barSolid    = barRgb ? `rgba(${barRgb.r},${barRgb.g},${barRgb.b},0.7)` : resolvedBar
  const barFade     = barRgb ? `rgba(${barRgb.r},${barRgb.g},${barRgb.b},0)` : 'transparent'

  const logoBoxSz  = Math.round(Math.min(28, Math.max(16, contentW * 0.036)))
  const logoFontSz = Math.round(Math.min(14, Math.max(10, contentW * 0.018)))
  const titleSz    = Math.round(Math.min(80, Math.max(20, contentW * 0.090)))
  const subtitleSz = Math.round(Math.min(28, Math.max(12, contentW * 0.036)))
  const nameLg     = Math.round(Math.min(18, Math.max(10, slotW * 0.100)))
  const nameSm     = Math.round(Math.min(13, Math.max( 8, slotW * 0.072)))

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: bgColor, fontFamily: "'Paperozi','Pretendard','Noto Sans KR',system-ui,sans-serif", boxSizing: 'border-box' }}>
      {/* 배경 데코 */}
      {/* <div style={{ position: 'absolute', right: -width*0.06, top: -height*0.30, width: height*1.1, height: height*1.1, borderRadius: '50%', background: accentFade, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -width*0.06, bottom: -height*0.30, width: height*0.8, height: height*0.8, borderRadius: '50%', background: accentFade, pointerEvents: 'none' }} /> */}

      {/* 강사 사진 — 슬롯 전체 채움 */}
      {instructors.map((inst, i) => {
        const zIndex  = n + 2 - i
        const offsetX = inst.photoOffsetX ?? 50
        const offsetY = inst.photoOffsetY ?? 10
        const scale   = inst.photoScale   ?? 1
        const iconSz  = Math.round(slotW * 0.18)
        return (
          <div key={i} style={{ position: 'absolute', left: groupLeft + i * step, top: photoSecTop, width: photoW, height: photoSecH, overflow: 'hidden', zIndex }}>
            {inst.photo ? (
              <div
                style={{ width: '100%', height: '100%', backgroundImage: `url(${inst.photo})`, backgroundSize: 'cover', backgroundPosition: `${offsetX}% ${offsetY}%`, backgroundRepeat: 'no-repeat', transform: `scale(${scale})`, transformOrigin: `${offsetX}% ${offsetY}%`, pointerEvents: 'none', willChange: 'transform' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(170deg,${accentFade},rgba(0,0,0,0.04))`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: iconSz*1.8, height: iconSz*1.8, borderRadius: '50%', backgroundColor: accentColor, opacity: 0.22, position: 'absolute' }} />
                <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
                <p style={{ fontSize: Math.round(slotW * 0.06), color: textColor, opacity: 0.3, fontWeight: 600, marginTop: iconSz * 0.5 }}>+ 사진 추가</p>
              </div>
            )}
          </div>
        )
      })}

      {/* 로고 */}
      {showLogo && (
        <div style={{ position: 'absolute', left: contentX + padH, top: padV, display: 'flex', alignItems: 'center', gap: 6, zIndex: n + 6 }}>
          <div style={{ width: logoBoxSz, height: logoBoxSz, borderRadius: Math.round(logoBoxSz*0.25), backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(logoBoxSz*0.46), color: '#fff' }}>
            {logoText.charAt(0)}
          </div>
          <span style={{ fontWeight: 700, fontSize: logoFontSz, letterSpacing: '0.06em', color: textColor, opacity: 0.92 }}>{logoText}</span>
        </div>
      )}

      {/* 제목 / 부제목 / 태그라인 — 상단 80px, 가로 정중앙 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 60, zIndex: n + 5, textAlign: 'center', padding: `0 ${padH}px` }}>
        <h2 style={{ margin: 0, fontSize: titleSz, fontWeight: 800, lineHeight: 1.14, color: textColor, letterSpacing: '-0.02em', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, marginTop: Math.round(titleSz * 0.18), fontSize: subtitleSz, color: textColor, opacity: 0.62, lineHeight: 1.5, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>{subtitle}</p>}
        {showTagline && <p style={{ margin: 0, marginTop: Math.round(titleSz * 0.18), fontSize: Math.round(Math.min(14, Math.max(9, contentW*0.014))), fontWeight: 600, color: textColor, opacity: 0.85, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{tagline}</p>}
      </div>

      {/* 이름 바 — 하단 그라데이션 + 강사 이름/역할 */}
      {(() => {
        const namePad     = 60
        const nameBarLeft = Math.max(0, groupLeft - namePad)
        const nameBarW    = groupSpan + namePad + (groupLeft - nameBarLeft) + namePad
        return (
      <div style={{
        position: 'absolute', bottom: 0,
        left: nameBarLeft, width: nameBarW, height: nameBarH,
        zIndex: n + 10,
        background: `linear-gradient(to right, ${barFade} 0%, ${barSolid} 10%, ${barSolid} 90%, ${barFade} 100%)`,
        backdropFilter: 'blur(0.5px)',
        display: 'flex', alignItems: 'stretch',
        paddingLeft: groupLeft - nameBarLeft, boxSizing: 'border-box',
      }}>
        {instructors.map((inst, i) => (
          <div key={i} style={{ width: i < n - 1 ? step : photoW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${Math.max(4, Math.round(photoW * 0.05))}px`, borderLeft: i > 0 ? '0px solid rgba(255,255,255,0.15)' : 'none', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: nameLg, color: '#fff', lineHeight: 1.25, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>{inst.brand || logoText}</p>
            <p style={{ margin: 0, marginTop: Math.round(nameBarH * 0.07), fontSize: nameSm, color: 'rgba(255,255,255,0.72)', lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>{inst.name}</p>
          </div>
        ))}
      </div>
        )
      })()}
    </div>
  )
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null
}
