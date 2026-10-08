import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCloud, type CloudWod } from '../cloud';
import { loadPhoto, renderStory, type Story, type StoryPerson } from '../story';
import { storyLines } from '../wodText';
import { pillStyle, useStore } from '../store';
import { Icon } from './Icon';

type Props = { onClose: () => void } & (
  | { kind: 'wod'; wod: CloudWod; people: StoryPerson[]; moods: string[] }
  | { kind: 'record'; what: string; value: string; unit: string; label: string; line: string }
);

/** Full-screen preview of an Instagram story: optional photo behind, for a WOD a funny name from the AI, then the
 *  phone's share sheet (Instagram → Historia). Nothing is uploaded: the photo and the image stay on the phone. */
export function StoryComposer(props: Props) {
  const cloud = useCloud();
  const { flash } = useStore();
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const nick = props.kind === 'wod' ? props.wod.nickname : '';
  const [names, setNames] = useState<string[]>([]);
  // The group's nickname from the board leads; without one, the real name until the AI's arrive.
  const [name, setName] = useState(props.kind === 'wod' ? nick || props.wod.title : '');
  const [naming, setNaming] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const askNames = async () => {
    if (props.kind !== 'wod') return;
    setNaming(true); setNameError(null);
    const out = await cloud.nameWod(props.wod, props.moods, [...names, ...(nick ? [nick] : [])]);
    setNaming(false);
    if (typeof out === 'string') { setNameError(out); return; }
    setNames(out); setName(out[0]); setWriting(false);
  };
  // A WOD story opens with names already on the way (the joke is the point), unless the board already has its nickname.
  useEffect(() => { if (!nick) askNames(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const story: Story = props.kind === 'wod'
    ? { kind: 'wod', name: name.trim() || props.wod.title, realName: props.wod.title, lines: storyLines(props.wod.description, props.wod.title), people: props.people }
    : { kind: 'record', what: props.what, value: props.value, unit: props.unit, label: props.label, line: props.line };
  const storyKey = JSON.stringify(story);

  // Redraw on every change; the newest drawing wins.
  useEffect(() => {
    let live = true;
    renderStory(story, photo).then(blob => {
      if (!live) return;
      setImage(old => { if (old) URL.revokeObjectURL(old.url); return { blob, url: URL.createObjectURL(blob) }; });
    }).catch(() => { /* keep the last preview */ });
    return () => { live = false; };
  }, [storyKey, photo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { setImage(old => { if (old) URL.revokeObjectURL(old.url); return null; }); }, []);

  // Modal: focus the title, Escape closes, focus goes back to the button that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    titleRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.({ preventScroll: true }); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try { setPhoto(await loadPhoto(file)); } catch { flash('No se abrió la foto', 'Prueba con otra.'); }
  };

  const share = async () => {
    if (!image) return;
    const file = new File([image.blob], 'myrm-historia.jpg', { type: 'image/jpeg' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    // No share sheet (a computer): save the image instead.
    const a = document.createElement('a');
    a.href = image.url; a.download = 'myrm-historia.jpg'; a.click();
    flash('Imagen guardada', 'Súbela como historia desde Instagram.');
  };

  const phone = document.querySelector('.phone');
  if (!phone) return null;
  return createPortal(
    <div className="story" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <div className="story-head">
        <h2 id="story-title" ref={titleRef} tabIndex={-1} className="section-title" style={{ outline: 'none' }}>Historia para Instagram</h2>
        <button className="round-btn" onClick={props.onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
      </div>

      <div className="story-preview">
        {image ? <img src={image.url} alt="Vista previa de la historia" /> : <span className="muted-sm">Armando la historia…</span>}
      </div>

      {props.kind === 'wod' && (
        <div className="stack-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="field-label">Nombre del WOD</span>
            <button className="link-btn" onClick={askNames} disabled={naming}>{naming ? 'Inventando…' : names.length ? 'Otros 3' : 'Inventar nombres'}</button>
          </div>
          {nameError && <p className="note" role="status">{nameError}</p>}
          <div className="story-names" role="radiogroup" aria-label="Nombre del WOD" aria-busy={naming}>
            {[...new Set([...(nick ? [nick] : []), ...names, props.wod.title])].map(n => (
              <button key={n} type="button" role="radio" aria-checked={name === n && !writing} className="pill" style={pillStyle(name === n && !writing)}
                onClick={() => { setName(n); setWriting(false); }}>{n}</button>
            ))}
            <button type="button" className="new-mov hit" aria-expanded={writing} onClick={() => { setWriting(true); setName(''); }}>Escribir uno</button>
          </div>
          {writing && <input className="input" style={{ height: 48 }} autoFocus maxLength={34} value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre para este WOD" aria-label="Tu nombre para este WOD" />}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="btn btn-secondary" style={{ flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', cursor: 'pointer' }}>
          <Icon name="camera" size={20} />{photo ? 'Cambiar foto' : 'Poner una foto'}
          <input type="file" accept="image/*" onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
        </label>
        {photo && <button className="link-btn" onClick={() => setPhoto(null)}>Quitar</button>}
      </div>

      <div className="story-share">
      <button className="btn btn-primary btn-block" style={{ height: 56, fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={!image} onClick={share}>
        <Icon name="share" size={20} />Compartir
      </button>
      <p className="note" style={{ textAlign: 'center' }}>Elige Instagram y después Historia. La foto no se sube a MyRm.</p>
      </div>
    </div>,
    phone
  );
}
