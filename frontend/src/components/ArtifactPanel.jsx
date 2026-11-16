import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Editor from '@monaco-editor/react';
import { FiCode } from 'react-icons/fi';
import { detectLanguage } from '../utils/detectLanguage';
import {
  Code2,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  X,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ArtifactPanel() {
  const [tab, setTab] = useState('code');
  const [activeFile, setActiveFile] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { artifacts } = useSelector((state) => state.message);
  const artifact = artifacts?.[0];
  const isPdf = artifact?.type === 'pdf';

  useEffect(() => {
    if (artifact) {
      setCollapsed(false);
      setTab(isPdf ? 'preview' : 'code');
      setActiveFile(0);
    }
  }, [artifact?.title, artifact?.type, artifact?.url, artifact?.id]);

  if (!artifact) return null;

  const file = artifact?.files?.[activeFile];
  const htmlFile = artifact?.files?.find((f) => f.name === 'index.html');
  const cssFile = artifact?.files?.find((f) => f.name === 'style.css');
  const jsFile = artifact?.files?.find((f) => f.name === 'script.js');
  const canPreview = isPdf || Boolean(htmlFile);

  const previewDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>${cssFile?.content || ''}</style>
</head>
<body>
${htmlFile?.content || ''}
<script>${jsFile?.content || ''}<\/script>
</body>
</html>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(file?.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const PanelContent = ({ onClose }) => (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="h-14 px-4 border-b border-zinc-800 flex items-center gap-3 shrink-0">
        <button
          onClick={onClose ?? (() => setCollapsed(true))}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer shrink-0"
        >
          {onClose ? <X size={15} /> : <PanelRightClose size={15} />}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 shrink-0">
            {isPdf ? (
              <FileText className="text-teal-400" size={12} />
            ) : (
              <FiCode className="text-teal-400" size={12} />
            )}
          </div>
          <h2 className="text-[13px] font-medium text-zinc-200 truncate">{artifact.title}</h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPdf && tab === 'code' && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors duration-150 bg-transparent border-none cursor-pointer"
            >
              {copied ? <Check size={12} className="text-teal-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}

          {!isPdf && canPreview && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setTab('code')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors duration-150
                  ${tab === 'code' ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                <Code2 size={11} /> Code
              </button>
              <button
                onClick={() => setTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors duration-150
                  ${tab === 'preview' ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                <Eye size={11} /> Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {!isPdf && (
        <AnimatePresence>
          {tab === 'code' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex border-b border-zinc-800 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
            >
              {artifact.files?.map((f, index) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFile(index)}
                  className={`px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-150 border-r border-zinc-800 relative cursor-pointer bg-transparent
                  ${activeFile === index ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {f.name}
                  {activeFile === index && (
                    <motion.div
                      layoutId="filetab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-500 rounded-t-full"
                    />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isPdf ? (
            <motion.div
              key="pdf-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full bg-zinc-900"
            >
              {artifact.url ? (
                <iframe
                  title={artifact.title || 'PDF preview'}
                  src={artifact.url}
                  className="w-full h-full border-0 bg-zinc-900"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500 px-6 text-center">
                  PDF preview is unavailable for this message. Re-upload the file to open it.
                </div>
              )}
            </motion.div>
          ) : tab === 'preview' && canPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              <iframe
                title="preview"
                sandbox="allow-scripts"
                srcDoc={previewDoc}
                className="w-full h-full bg-white"
              />
            </motion.div>
          ) : (
            <motion.div
              key={`code-${activeFile}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              <Editor
                theme="vs-dark"
                language={detectLanguage(file?.name || '')}
                value={file?.content || ''}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'none',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-24 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[12px] font-medium border-none cursor-pointer transition-colors duration-150"
      >
        {isPdf ? <FileText size={13} /> : <FiCode size={13} />}
        {isPdf ? 'View PDF' : 'View Code'}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="mob-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="mob-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[420px] border-l border-white/[0.06] overflow-hidden"
            >
              <PanelContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="open"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'clamp(340px, 38%, 680px)', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="hidden lg:flex h-full border-l border-zinc-800 flex-col overflow-hidden shrink-0"
          >
            <PanelContent />
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 48, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="hidden lg:flex h-full border-l border-zinc-800 bg-zinc-950 flex-col items-center py-4 gap-3 shrink-0"
          >
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer"
            >
              <PanelRightOpen size={15} />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <p
                className="text-[10px] font-medium text-zinc-600 tracking-widest uppercase whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {artifact.title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
