/**
 * 配置内容编辑器（dev-only）：npm run dev 后访问 /#editor 打开。
 * - 全量加载 src/data 原始 JSON（不经过 loader，坏文件不阻塞其余编辑）；
 * - schema 表单 + 引用目录下拉 + 图标选择器 + 实时校验（含跨文件交叉检查）；
 * - 保存经开发服务器中间件回写源文件；生产构建整分支被剔除。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCatalogs } from './catalogs';
import { DATA_PATHS, LUCIDE_KEYS, loadAllDocs, SPRITE_PATHS } from './dataAccess';
import { serializeDoc } from './serialize';
import { resolveSheet } from './sheetRegistry';
import { crossChecks, validateDoc, type ValidateEnv } from './validate';
import type { NewAction } from './sideTree';
import type { Issue, JsonValue } from './types';
import { deepClone } from './editUtils';
import { ENTITY_FOLLOWUP, buildEntityFiles, type NewEntityKind } from './newEntity';
import { CatalogProvider } from './ui/catalogContext';
import { Sidebar } from './ui/Sidebar';
import { SheetEditor } from './ui/SheetEditor';
import { NewEntityDialog } from './ui/NewEntityDialog';
import { Badge, Btn } from './ui/primitives';

const SAVE_ENDPOINT = '/__content_editor/save';

const basename = (p: string): string => p.split('/').pop() ?? p;

const actionToKind = (a: NewAction): NewEntityKind => a.replace(/^new/, '').toLowerCase() as NewEntityKind;

export const ContentEditorApp: React.FC = () => {
  const [docs, setDocs] = useState<Record<string, JsonValue> | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const [extraPaths, setExtraPaths] = useState<string[]>([]);
  const [newAction, setNewAction] = useState<NewAction | null>(null);
  const pristine = useRef<Record<string, JsonValue> | null>(null);

  // 运行期新建的文件不在静态 glob 清单里，动态并入
  const allPaths = useMemo(() => [...DATA_PATHS, ...extraPaths].sort(), [extraPaths]);

  // 初始加载
  useEffect(() => {
    void loadAllDocs().then(({ docs: loaded, errors }) => {
      setDocs(loaded);
      setLoadErrors(errors);
      pristine.current = deepClone(loaded);
    });
  }, []);

  const catalogs = useMemo(() => buildCatalogs(docs ?? {}), [docs]);
  const env: ValidateEnv = useMemo(
    () => ({ catalogs, sprites: new Set(SPRITE_PATHS), lucideKeys: new Set(LUCIDE_KEYS) }),
    [catalogs]
  );

  // 全量实时校验
  const issues: Issue[] = useMemo(() => {
    if (!docs) return [];
    const out: Issue[] = [];
    for (const [p, doc] of Object.entries(docs)) {
      out.push(...validateDoc(p, doc, resolveSheet(p).def, env));
    }
    out.push(...crossChecks(docs));
    return out;
  }, [docs, env]);

  const issuesByPath = useMemo(() => {
    const m = new Map<string, { err: number; warn: number }>();
    for (const x of issues) {
      const e = m.get(x.path) ?? { err: 0, warn: 0 };
      if (x.level === 'error') e.err += 1;
      else e.warn += 1;
      m.set(x.path, e);
    }
    return m;
  }, [issues]);

  const flash = useCallback((msg: string, tone: 'ok' | 'err') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const updateDoc = useCallback((path: string, next: JsonValue) => {
    setDocs((prev) => (prev ? { ...prev, [path]: next } : prev));
    setDirty((prev) => new Set(prev).add(path));
  }, []);

  const revertFile = useCallback(
    (path: string) => {
      if (!pristine.current || !docs) return;
      updateDoc(path, deepClone(pristine.current[path]));
      flash(`已还原 ${basename(path)}`, 'ok');
    },
    [docs, updateDoc, flash]
  );

  const contentOf = useCallback(
    (path: string): string | null => {
      if (!docs || !(path in docs)) return null;
      return serializeDoc(docs[path], resolveSheet(path).def.mode);
    },
    [docs]
  );

  const saveContent = useCallback(async (path: string, content: string): Promise<void> => {
    const res = await fetch(SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  }, []);

  const saveFile = useCallback(
    async (path: string): Promise<boolean> => {
      const content = contentOf(path);
      if (content === null) return false;
      try {
        await saveContent(path, content);
        setDirty((prev) => {
          const n = new Set(prev);
          n.delete(path);
          return n;
        });
        return true;
      } catch (e) {
        flash(`保存失败：${e instanceof Error ? e.message : String(e)}`, 'err');
        return false;
      }
    },
    [contentOf, saveContent, flash]
  );

  /** 新建实体：模板文件逐个保存并并入工作区 */
  const createEntity = useCallback(
    async (kind: NewEntityKind, id: string): Promise<void> => {
      const files = buildEntityFiles(kind, id);
      for (const f of files) {
        await saveContent(f.path, serializeDoc(f.doc, resolveSheet(f.path).def.mode));
        setDocs((prev) => (prev ? { ...prev, [f.path]: f.doc } : prev));
        if (pristine.current) pristine.current[f.path] = deepClone(f.doc);
      }
      setExtraPaths((prev) => [...new Set([...prev, ...files.map((f) => f.path)])]);
      setSelected(files[0].path);
      const followup = ENTITY_FOLLOWUP[kind];
      flash(`已创建 ${files.length} 个文件（${id}）${followup ? ' · ' + followup : ''}`, 'ok');
    },
    [saveContent, flash]
  );

  const copyFile = useCallback(
    async (path: string) => {
      const c = contentOf(path);
      if (c === null) return;
      try {
        await navigator.clipboard.writeText(c);
        flash('已复制规范化 JSON 到剪贴板', 'ok');
      } catch {
        flash('剪贴板不可用（需 https/localhost 权限）', 'err');
      }
    },
    [contentOf, flash]
  );

  const downloadFile = useCallback(
    (path: string) => {
      const c = contentOf(path);
      if (c === null) return;
      const blob = new Blob([c], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = basename(path);
      a.click();
      URL.revokeObjectURL(url);
    },
    [contentOf]
  );

  // Ctrl/Cmd+S 保存当前文件
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (selected) void saveFile(selected).then((ok) => ok && flash(`已保存 ${basename(selected)}`, 'ok'));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, saveFile, flash]);

  // 有未保存更改时拦截关闭
  useEffect(() => {
    const h = (e: BeforeUnloadEvent): void => {
      if (dirty.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty.size]);

  const openIssuesFor = (x: Issue): void => {
    setSelected(x.path);
    const m = /\[(\d+)\]/.exec(x.loc);
    setFocusRow(m ? Number(m[1]) : null);
  };

  if (!docs) {
    return (
      <div className="h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">
        <span className="text-xs text-purple-400 font-black animate-pulse">正在装载避难所配置数据库…</span>
      </div>
    );
  }

  const totalErr = issues.filter((x) => x.level === 'error').length;
  const totalWarn = issues.length - totalErr;
  const resolvedSel = selected ? resolveSheet(selected) : null;
  const selCounts = selected ? issuesByPath.get(selected) : undefined;

  return (
    <CatalogProvider value={{ catalogs }}>
      <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100" style={{ minWidth: 1080 }}>
        {/* 顶栏 */}
        <header className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <span className="text-sm font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">AetherGarden</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">配置工作台 · dev only</span>
          <Badge tone={dirty.size > 0 ? 'dirty' : 'ok'}>{allPaths.length} 文件</Badge>
          <button onClick={() => setIssuesOpen((x) => !x)} className="flex items-center gap-1.5 cursor-pointer">
            <Badge tone="error">{totalErr} 错误</Badge>
            <Badge tone="warn">{totalWarn} 警告</Badge>
          </button>
          {dirty.size > 0 && (
            <Btn
              tone="primary"
              onClick={() => {
                void (async () => {
                  let ok = 0;
                  for (const p of dirty) if (await saveFile(p)) ok += 1;
                  flash(`已保存 ${ok}/${dirty.size} 个文件`, ok === dirty.size ? 'ok' : 'err');
                })();
              }}
            >
              保存全部 ({dirty.size})
            </Btn>
          )}
          <span className="flex-1" />
          <a href={location.pathname} onClick={(e) => { e.preventDefault(); location.hash = ''; location.reload(); }} className="text-[10px] text-zinc-500 hover:text-purple-300 cursor-pointer">
            ← 返回游戏
          </a>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* 侧栏 */}
          <aside className="w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-900/30">
            <Sidebar
              paths={allPaths}
              docs={docs}
              dirty={dirty}
              issues={issues}
              selected={selected}
              onSelect={(p) => {
                setSelected(p);
                setFocusRow(null);
              }}
              onNewEntity={(a) => setNewAction(a)}
            />
          </aside>

          {/* 主区 */}
          <main className="flex-1 min-w-0 flex flex-col">
            {selected && resolvedSel ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/20 shrink-0 flex-wrap">
                  <span className="text-xs font-black text-zinc-200">{resolvedSel.title}</span>
                  <span className="text-[10px] font-mono text-zinc-600">{selected}</span>
                  <Badge tone="ok">{resolvedSel.def.mode.form}</Badge>
                  {selCounts?.err ? <Badge tone="error">{selCounts.err} 错误</Badge> : null}
                  {selCounts?.warn ? <Badge tone="warn">{selCounts.warn} 警告</Badge> : null}
                  {!selCounts && <Badge tone="ok">✓ 通过</Badge>}
                  <span className="flex-1" />
                  <Btn onClick={() => copyFile(selected)}>复制</Btn>
                  <Btn onClick={() => downloadFile(selected)}>下载</Btn>
                  <Btn onClick={() => revertFile(selected)} disabled={!dirty.has(selected)}>还原</Btn>
                  <Btn tone="primary" onClick={() => void saveFile(selected).then((ok) => ok && flash(`已保存 ${basename(selected)}`, 'ok'))}>
                    保存 (Ctrl+S)
                  </Btn>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <SheetEditor path={selected} doc={docs[selected]} onChangeDoc={(next) => updateDoc(selected, next)} focusRow={focusRow} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <h1 className="text-lg font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">配置内容工作台</h1>
                <p className="text-[11px] text-zinc-400 leading-relaxed max-w-md">
                  左侧选择要编辑的数据文件。表单字段自带说明与引用目录下拉（物品/敌人/事件等直接搜索选择），图标支持切图网格可视化挑选；
                  实时校验必填、类型、引用存在性、id 唯一与跨文件交叉约束；保存直接写回 src/data 源文件。
                </p>
                <p className="text-[10px] text-zinc-600">
                  字段口径与 docs/config-guide.md 对齐 · 生产构建不含本页面
                </p>
                {Object.keys(loadErrors).length > 0 && (
                  <div className="mt-3 max-w-lg w-full">
                    <div className="text-[10px] text-red-400 font-bold mb-1">以下文件解析失败（以 null 占位，可修复后保存）：</div>
                    {Object.entries(loadErrors).map(([p, msg]) => (
                      <button key={p} onClick={() => setSelected(p)} className="block w-full text-left text-[10px] font-mono text-red-300 hover:text-red-200 cursor-pointer truncate">
                        {p} — {msg}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 问题面板 */}
            {issuesOpen && (
              <footer className="h-56 shrink-0 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col">
                <div className="px-4 py-1.5 border-b border-zinc-800/60 flex items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">校验问题</span>
                  <span className="text-[10px] text-zinc-600">点击定位到对应文件/行</span>
                  <span className="flex-1" />
                  <Btn tone="ghost" onClick={() => setIssuesOpen(false)}>收起 ▾</Btn>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
                  {issues.length === 0 && <div className="text-[11px] text-emerald-500 py-2">✓ 全部数据通过校验</div>}
                  {issues.map((x, i) => (
                    <button
                      key={`${x.path}-${x.loc}-${i}`}
                      onClick={() => openIssuesFor(x)}
                      className="flex items-start gap-2 text-left cursor-pointer hover:bg-zinc-900 rounded-lg px-2 py-1"
                    >
                      <Badge tone={x.level === 'error' ? 'error' : 'warn'}>{x.level === 'error' ? '错误' : '提醒'}</Badge>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-72 truncate">{x.path.replace('src/data/', '')}</span>
                      <span className="text-[10px] font-mono text-purple-300/80 shrink-0 w-56 truncate">{x.loc}</span>
                      <span className="text-[11px] text-zinc-300">{x.message}</span>
                    </button>
                  ))}
                </div>
              </footer>
            )}
            {!issuesOpen && (
              <button onClick={() => setIssuesOpen(true)} className="absolute bottom-3 right-6 z-40">
                <Badge tone={totalErr > 0 ? 'error' : 'ok'}>问题面板 ▴</Badge>
              </button>
            )}
          </main>
        </div>

        {toast && (
          <div className={`fixed top-12 right-6 z-[120] px-3 py-2 rounded-xl border text-[11px] font-bold shadow-2xl ${toast.tone === 'ok' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-red-950/90 border-red-500/40 text-red-300'}`}>
            {toast.msg}
          </div>
        )}

        <NewEntityDialog kind={newAction ? actionToKind(newAction) : null} existingPaths={allPaths} onClose={() => setNewAction(null)} onCreate={createEntity} />
      </div>
    </CatalogProvider>
  );
};
