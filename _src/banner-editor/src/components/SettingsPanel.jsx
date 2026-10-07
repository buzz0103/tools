import {
  Users, Type, Palette, Maximize2,
  ChevronDown, Plus, Minus,
} from 'lucide-react'
import { useState } from 'react'

/* 아코디언 — 카드 대신 구분선으로 나눔 (wallpaper 컨트롤 패널과 같은 형태) */
function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full h-14 px-6 flex items-center gap-2 text-left text-base leading-6 font-bold text-ink cursor-pointer transition-opacity hover:opacity-70 active:opacity-50"
      >
        <Icon size={20} strokeWidth={1.8} className={`flex-shrink-0 ${open ? 'text-primary' : 'text-ink'}`} />
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={20}
          strokeWidth={1.8}
          className={`flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pt-2 pb-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs leading-4 font-medium text-sub">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-10 h-6 rounded-full cursor-pointer transition-colors duration-150 ${
        checked ? 'bg-primary' : 'bg-holder'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function ColorField({ label, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0 w-10 h-10 p-1 rounded-[5px] border border-edge bg-white">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} 고르기`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-full h-full rounded-[3px] pointer-events-none" style={{ backgroundColor: value }} />
        </div>
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={7}
        />
      </div>
    </Field>
  )
}

// 입력창: 배경 #F5F5F5, 보더 없음, 포커스 시 1px #1775F0
const inputCls =
  'block w-full h-10 px-3 rounded-[5px] border border-transparent bg-fill text-sm text-ink placeholder:text-holder transition-colors focus:outline-none focus:border-primary focus:bg-white disabled:text-muted'

const textareaCls =
  'block w-full min-h-[72px] px-3 py-2.5 rounded-[5px] border border-transparent bg-fill text-sm leading-5 text-ink placeholder:text-holder resize-none transition-colors focus:outline-none focus:border-primary focus:bg-white'

// 선택형 버튼 (텍스트 위치 등)
const choiceCls = (active) => [
  'flex-1 h-10 px-3 rounded-[5px] border text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 active:opacity-50',
  active ? 'bg-primary border-primary text-white' : 'bg-white border-edge text-ink',
].join(' ')

// 강사 수 −/+ 버튼
const stepperCls =
  'w-10 h-10 rounded-[5px] border border-edge bg-white text-ink flex items-center justify-center cursor-pointer transition-opacity hover:opacity-70 active:opacity-50 disabled:bg-off disabled:border-off disabled:text-white disabled:cursor-default disabled:opacity-100'

export default function SettingsPanel({
  settings, onUpdate, onUpdateInstructor, onChangeInstructorCount,
}) {
  return (
    <aside className="min-h-0 overflow-y-auto pb-4 rounded-xl bg-white">
      <p className="px-6 pt-6 pb-2 text-xs leading-4 font-semibold text-sub">컨트롤 패널</p>

      {/* 텍스트 */}
      <Section icon={Type} title="텍스트">
        <Field label="제목">
          <textarea rows={2} className={textareaCls} value={settings.title}
            onChange={(e) => onUpdate('title', e.target.value)} placeholder="강의 제목" />
        </Field>
        <Field label="부제목">
          <textarea rows={2} className={textareaCls} value={settings.subtitle}
            onChange={(e) => onUpdate('subtitle', e.target.value)} placeholder="부제목 또는 설명" />
        </Field>
        <Field label="태그라인">
          <div className="flex items-center gap-2">
            <input className={inputCls} value={settings.tagline}
              onChange={(e) => onUpdate('tagline', e.target.value)}
              disabled={!settings.showTagline} placeholder="태그라인" />
            <Toggle checked={settings.showTagline} onChange={(v) => onUpdate('showTagline', v)} label="태그라인 표시" />
          </div>
        </Field>
        <Field label="텍스트 위치">
          <div className="flex gap-2">
            {[
              { value: 'left', label: '좌측 하단' },
              { value: 'top',  label: '좌측 상단' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={settings.textPosition === value}
                onClick={() => onUpdate('textPosition', value)}
                className={choiceCls(settings.textPosition === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* 로고 */}
      {/* <Section icon={LayoutTemplate} title="로고 / 브랜드">
        <Field label="브랜드명">
          <div className="flex items-center gap-2">
            <input className={inputCls} value={settings.logoText}
              onChange={(e) => onUpdate('logoText', e.target.value)}
              disabled={!settings.showLogo} placeholder="ACADEMY" />
            <Toggle checked={settings.showLogo} onChange={(v) => onUpdate('showLogo', v)} label="로고 표시" />
          </div>
        </Field>
      </Section> */}

      {/* 강사 */}
      <Section icon={Users} title="강사 정보">
        <Field label={`사진 가로 너비 — ${settings.photoWidthPct}%`}>
          <input
            type="range" min={40} max={200} step={5}
            value={settings.photoWidthPct}
            onChange={(e) => onUpdate('photoWidthPct', Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>
        {settings.instructorCount > 1 && (
          <Field label={`사진 간격 — ${settings.photoGap > 0 ? '+' : ''}${settings.photoGap}px`}>
            <input
              type="range" min={-120} max={120} step={4}
              value={settings.photoGap}
              onChange={(e) => onUpdate('photoGap', Number(e.target.value))}
              className="w-full accent-primary"
            />
          </Field>
        )}
        <Field label="강사 수 (최대 8명)">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="강사 한 명 줄이기"
              onClick={() => onChangeInstructorCount(settings.instructorCount - 1)}
              disabled={settings.instructorCount <= 1}
              className={stepperCls}
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center text-sm font-bold text-ink tabular-nums">
              {settings.instructorCount}
            </span>
            <button
              type="button"
              aria-label="강사 한 명 늘리기"
              onClick={() => onChangeInstructorCount(settings.instructorCount + 1)}
              disabled={settings.instructorCount >= 8}
              className={stepperCls}
            >
              <Plus size={16} />
            </button>
          </div>
        </Field>

        {/* 강사별 입력 — 구분선으로 나눈 목록 */}
        <div className="border-t border-line">
          {settings.instructors.map((inst, i) => (
            <div key={i} className="py-4 space-y-3 border-b border-line last:border-b-0 last:pb-0">
              <p className="text-sm leading-5 font-bold text-ink">강사 {i + 1}</p>
              {/* <Field label="역할">
                <input className={inputCls} value={inst.role}
                  onChange={(e) => onUpdateInstructor(i, 'role', e.target.value)} />
              </Field> */}
              <Field label="브랜드명">
                <input className={inputCls} value={inst.brand}
                  onChange={(e) => onUpdateInstructor(i, 'brand', e.target.value)}
                  // placeholder={settings.logoText}
                  />
              </Field>
              <Field label="이름">
                <input className={inputCls} value={inst.name}
                  onChange={(e) => onUpdateInstructor(i, 'name', e.target.value)} />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* 색상 */}
      <Section icon={Palette} title="색상">
        <ColorField label="배경색" value={settings.bgColor}
          onChange={(v) => onUpdate('bgColor', v)} placeholder="#f2f26f8" />
        <ColorField label="강조색" value={settings.accentColor}
          onChange={(v) => onUpdate('accentColor', v)} placeholder="#6366f1" />
        <ColorField label="텍스트색" value={settings.textColor}
          onChange={(v) => onUpdate('textColor', v)} placeholder="#6366f1" />
        <div>
          <ColorField
            label="정보 바 색상 (비우면 강조색 사용)"
            value={settings.infoBgColor || settings.accentColor}
            onChange={(v) => onUpdate('infoBgColor', v)}
            placeholder={settings.accentColor}
          />
          {settings.infoBgColor && (
            <button
              type="button"
              onClick={() => onUpdate('infoBgColor', '')}
              className="mt-2 text-xs leading-[18px] text-muted cursor-pointer transition-opacity hover:opacity-70 active:opacity-50"
            >
              ↩ 강조색으로 초기화
            </button>
          )}
        </div>
      </Section>

      {/* 배너 크기 */}
      <Section icon={Maximize2} title="배너 크기" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="너비 (px)">
            <input type="number" className={inputCls} value={settings.bannerWidth}
              onChange={(e) => onUpdate('bannerWidth', Number(e.target.value))}
              min={400} max={3840} step={10} />
          </Field>
          <Field label="높이 (px)">
            <input type="number" className={inputCls} value={settings.bannerHeight}
              onChange={(e) => onUpdate('bannerHeight', Number(e.target.value))}
              min={200} max={1600} step={10} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Web Banner',  sub: '2560 × 380', w: 2560, h: 380, contentMaxW: 1136, textPosition: 'top', bannerLayout: 'horizontal' },
            { label: 'Card Banner', sub: '1536 × 480', w: 1536, h: 480, contentMaxW: 760,  textPosition: 'top', bannerLayout: 'vertical'   },
          ].map((p) => {
            const active = settings.bannerWidth === p.w && settings.bannerHeight === p.h
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onUpdate('bannerWidth',   p.w)
                  onUpdate('bannerHeight',  p.h)
                  onUpdate('contentMaxW',   p.contentMaxW)
                  onUpdate('textPosition',  p.textPosition)
                  onUpdate('bannerLayout',  p.bannerLayout)
                }}
                className={`h-10 flex items-center justify-between rounded-[5px] bg-white text-sm text-ink cursor-pointer transition-opacity hover:opacity-70 active:opacity-50 ${
                  active ? 'px-[11px] border-2 border-primary font-bold' : 'px-3 border border-edge font-medium'
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-xs font-medium tabular-nums ${active ? 'text-primary' : 'text-sub'}`}>{p.sub}</span>
              </button>
            )
          })}
        </div>
      </Section>
    </aside>
  )
}
