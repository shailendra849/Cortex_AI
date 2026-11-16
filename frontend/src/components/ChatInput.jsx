import { useState } from 'react';
import {
  Send,
  Paperclip,
  Square,
  Zap,
  MessageSquare,
  Code2,
  Presentation,
  Image as ImageIcon,
  Globe,
  FileText,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addMessage,
  patchLastUserAttachments,
  setArtifacts,
  setIsLoading,
} from '../redux/message.slice';
import { sendPrompt } from '../features/agent.api';
import { Mic, MicOff } from 'lucide-react';
import { useEffect } from 'react';
import { createConversation, updateConversations } from '../features/conversation.api';
import {
  addConversation,
  setConvTitle,
  setSelectedConversation,
} from '../redux/conversation.slice';
import { useRef } from 'react';
import { saveSelectedConversationId } from '../utils/conversationPersist';

export default function ChatInput({ setBanner }) {
  const [selectedAgent, setSelectedAgent] = useState('auto');
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector((state) => state.conversation);
  const { isLoading } = useSelector((state) => state.message);
  const fileRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const placeholders = {
    auto: 'Ask CortexAI...',
    chat: 'Chat with CortexAI...',
    coding: 'Describe the software you want...',
    pdf: 'Generate a PDF about...',
    ppt: 'Create a presentation about...',
    image: 'Describe the image...',
    search: 'Search the web...',
  };

  const inputPlaceholder =
    selectedFile?.type === 'application/pdf'
      ? 'Ask anything about this PDF (or just send it for a summary)...'
      : selectedFile?.type?.startsWith('image/')
        ? 'Ask a question about this image...'
        : placeholders[selectedAgent];

  const agents = [
    {
      id: 'auto',
      icon: Zap,
      label: 'Auto',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
    },
    {
      id: 'coding',
      icon: Code2,
      label: 'Coding',
    },
    {
      id: 'pdf',
      icon: FileText,
      label: 'PDF',
    },
    {
      id: 'ppt',
      icon: Presentation,
      label: 'PPT',
    },
    {
      id: 'image',
      icon: ImageIcon,
      label: 'Image',
    },
    {
      id: 'search',
      icon: Globe,
      label: 'Search',
    },
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setValue(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    const prompt = value.trim();
    if (!prompt && !selectedFile) return;

    const outgoingPrompt =
      prompt ||
      (selectedFile?.type === 'application/pdf'
        ? 'Please review this PDF.'
        : selectedFile?.type?.startsWith('image/')
          ? 'Please review this image.'
          : 'Please review this file.');

    dispatch(setIsLoading(true));

    try {
      let conversation = selectedConversation;

      if (!conversation) {
        const newConversation = await createConversation();
        dispatch(addConversation(newConversation));
        dispatch(setSelectedConversation(newConversation));
        saveSelectedConversationId(newConversation._id);
        conversation = newConversation;
      } else {
        saveSelectedConversationId(conversation._id);
      }

      if (conversation.title === 'New Chat') {
        const titleSeed = prompt || selectedFile?.name || 'New Chat';
        await updateConversations(conversation._id, titleSeed.slice(0, 40));
        dispatch(setConvTitle({ conversationId: conversation._id, title: titleSeed.slice(0, 40) }));
      }

      const previewUrl =
        selectedFile?.type === 'application/pdf' ? URL.createObjectURL(selectedFile) : null;

      const attachments = selectedFile
        ? [
            {
              name: selectedFile.name,
              mimeType: selectedFile.type,
              size: selectedFile.size,
              previewUrl,
            },
          ]
        : [];

      dispatch(addMessage({ role: 'user', content: outgoingPrompt, attachments }));

      setValue('');

      const formData = new FormData();

      formData.append('conversationId', conversation._id);
      formData.append('prompt', outgoingPrompt);
      formData.append('agent', selectedAgent);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      setSelectedFile(null);

      const data = await sendPrompt(formData);
      console.log(data);

      if (data.attachments?.length) {
        dispatch(patchLastUserAttachments(data.attachments));
      }

      dispatch(
        addMessage({
          role: 'assistant',
          content: data.answer,
          images: data.images,
        })
      );

      // Only open side panel for real code/PPT artifacts — PDF opens on click.
      if (data.artifacts?.length) {
        dispatch(setArtifacts(data.artifacts));
      }
    } catch (error) {
      setBanner({
        open: true,
        title: error.response?.data?.title || 'Something went wrong',
        message: error.response?.data?.message || 'Please try again.',
      });
    } finally {
      dispatch(setIsLoading(false));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (value.trim() || selectedFile)) {
        handleSend();
      }
    }
  };

  return (
    <div className="w-full overflow-hidden px-3 md:px-5 py-4 border-t border-zinc-800 bg-zinc-950">
      <div className="flex flex-col gap-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 pt-3.5 pb-3">
        <div className="flex w-[80%] gap-2 pr-2 flex-wrap">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isActive = selectedAgent === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`
                  flex-shrink-0
                  cursor-pointer
                  inline-flex
                  items-center
                  gap-1.5
                  px-3
                  py-2
                  rounded-full
                  text-xs
                  font-medium
                  border
                  transition-colors
                  ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                  }
                `}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-zinc-500'} />
                {agent.label}
              </button>
            );
          })}
        </div>

        {selectedFile && (
          <div className="my-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              {selectedFile.type === 'application/pdf' ? (
                <FileText size={16} className="text-red-400" />
              ) : (
                selectedFile?.type.startsWith('image/') && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    className="h-10 w-10 rounded-xl object-cover mt-3"
                    alt="preview"
                  />
                )
              )}

              <div>
                <p className="text-xs text-white">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500">
                  {Math.ceil(selectedFile.size / 1024)} KB
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedFile(null);
                  fileRef.current.value = '';
                }}
                className="ml-2"
              >
                <X size={14} className="text-slate-500 hover:text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          rows={3}
          disabled={isLoading}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-zinc-200 placeholder:text-zinc-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          {/* Left — attach + mic */}
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setSelectedFile(file);
                }
              }}
            />
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all duration-150 bg-transparent cursor-pointer"
              onClick={() => fileRef.current.click()}
            >
              <Paperclip size={14} />
            </button>
            <button
              onClick={toggleMic}
              className={`
                flex
                items-center
                justify-center
                w-8
                h-8
                rounded-lg
                transition-all
                cursor-pointer
                ${isListening ? 'bg-red-500 text-white' : 'text-zinc-600 hover:bg-zinc-800'}
              `}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          {/* Right — send / stop */}
          <button
            onClick={handleSend}
            disabled={!isLoading && !value.trim() && !selectedFile}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-colors duration-150
              ${
                isLoading
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                  : value.trim() || selectedFile
                    ? 'bg-teal-600 hover:bg-teal-500 text-white'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
          >
            {isLoading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}
          </button>
        </div>
      </div>

      <p className="text-center text-[10.5px] text-zinc-600 mt-2.5">
        CortexAI can make mistakes. Verify important info.
      </p>
    </div>
  );
}