/** 新建实体对话框：输入 id → 预览将创建的文件 → 保存 */
import React, { useState } from 'react';
import { ENTITY_FOLLOWUP, ENTITY_ID_RE, ENTITY_KIND_LABEL, buildEntityFiles, type NewEntityKind } from '../newEntity';
import { Modal, inputCls } from './primitives';

export const NewEntityDialog: React.FC<{
  kind: NewEntityKind | null;
  existingPaths: string[];
  onClose: () => void;
  onCreate: (kind: NewEntityKind, id: string) => Promise<void>;
}> = ({ kind, existingPaths, onClose, onCreate }) => {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!kind) return null;
  const trimmed = id.trim();
  const files = ENTITY_ID_RE.test(trimmed) ? buildEntityFiles(kind, trimmed) : [];
  const conflict = files.find((f) => existingPaths.includes(f.path));
  const canCreate = files.length > 0 && !conflict && !busy;

  const submit = async (): Promise<void> => {
    if (!canCreate) return;
    setBusy(true);
    setErr('');
    try {
      await onCreate(kind, trimmed);
      setId('');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`新建${ENTITY_KIND_LABEL[kind]}`}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[10px] font-black text-zinc-400 block mb-1">
            实体 id <span className="text-rose-400">*</span>
            <span className="text-[9px] font-normal text-zinc-600 ml-1">小写蛇形命名，如 ember_lord / 05_deep_mine</span>
          </label>
          <input
            className={`${inputCls} font-mono`}
            value={id}
            autoFocus
            placeholder={kind === 'region' ? '05_deep_mine' : kind === 'hero' ? 'vigil' : 'ember_lord'}
            onChange={(e) => {
              setId(e.target.value);
              setErr('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
        </div>

        {trimmed && !ENTITY_ID_RE.test(trimmed) && <p className="text-[10px] text-red-400">id 需以小写字母开头，仅含小写字母/数字/下划线</p>}
        {conflict && <p className="text-[10px] text-red-400">文件已存在：{conflict.path}</p>}

        {files.length > 0 && !conflict && (
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-2.5">
            <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1.5">将创建 {files.length} 个文件</div>
            {files.map((f) => (
              <div key={f.path} className="text-[10px] font-mono text-cyan-300/80 py-0.5">
                {f.path}
              </div>
            ))}
            {ENTITY_FOLLOWUP[kind] && <div className="text-[9px] text-amber-300/80 mt-1.5 leading-relaxed">ℹ {ENTITY_FOLLOWUP[kind]}</div>}
          </div>
        )}

        {err && <p className="text-[10px] text-red-400">{err}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold rounded-lg cursor-pointer">
            取消
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canCreate}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-lg cursor-pointer"
          >
            {busy ? '创建中…' : '创建并保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
