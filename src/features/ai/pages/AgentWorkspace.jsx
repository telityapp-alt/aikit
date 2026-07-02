import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../lib/ToastContext";
import { getAgentBySlug } from "../agents/registry";
import { aiApi } from "../lib/aiApi";
import ThreadList from "../components/ThreadList";
import ChatMessageList from "../components/ChatMessageList";
import ChatComposer from "../components/ChatComposer";
import RightCanvas from "../components/RightCanvas";

export default function AgentWorkspace({
  agentSlug,
  activeThreadId,
  onOpenThread,
  onBackHome,
}) {
  const agent = useMemo(() => getAgentBySlug(agentSlug), [agentSlug]);
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState([]);
  const [composerValue, setComposerValue] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [ingestingKnowledge, setIngestingKnowledge] = useState(false);
  const [canvasMode, setCanvasMode] = useState("preview");
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    setLoadingThreads(true);
    aiApi
      .listThreads(agent.slug)
      .then((result) => {
        if (cancelled) return;
        const nextThreads = result?.threads || [];
        setThreads(nextThreads);
        if (!activeThreadId && nextThreads[0]?.id) {
          onOpenThread(nextThreads[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingThreads(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agent.slug, activeThreadId, onOpenThread, toast]);

  useEffect(() => {
    let cancelled = false;

    if (!activeThreadId) {
      setMessages([]);
      setArtifacts([]);
      return () => {
        cancelled = true;
      };
    }

    setLoadingConversation(true);
    Promise.all([
      aiApi.getThreadMessages(activeThreadId),
      aiApi.getThreadArtifacts(activeThreadId),
    ])
      .then(([messageResult, artifactResult]) => {
        if (cancelled) return;
        setMessages(
          (messageResult?.messages || []).map((entry) => ({
            id: entry.id,
            role: entry.role,
            text: entry.content,
          })),
        );
        setArtifacts(artifactResult?.artifacts || []);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingConversation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, toast]);

  useEffect(() => {
    let cancelled = false;
    aiApi
      .listKnowledge(agent.slug, activeThreadId)
      .then((result) => {
        if (!cancelled) {
          setKnowledgeDocuments(result?.documents || []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, agent.slug, toast]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;

  async function refreshThreads(nextThreadId = activeThreadId) {
    const result = await aiApi.listThreads(agent.slug);
    const nextThreads = result?.threads || [];
    setThreads(nextThreads);
    if (!nextThreadId && nextThreads[0]?.id) {
      onOpenThread(nextThreads[0].id);
    }
  }

  async function refreshKnowledge(nextThreadId = activeThreadId) {
    const result = await aiApi.listKnowledge(agent.slug, nextThreadId);
    setKnowledgeDocuments(result?.documents || []);
  }

  async function handleCreateThread() {
    try {
      const result = await aiApi.createThread(agent.slug);
      const thread = result?.thread;
      if (!thread?.id) return;
      await refreshThreads(thread.id);
      onOpenThread(thread.id);
      setMessages([]);
      setArtifacts([]);
      setKnowledgeDocuments([]);
      setAttachments([]);
      setComposerValue("");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleAddFiles(files) {
    try {
      const nextAttachments = await Promise.all(
        files.slice(0, 5).map(async (file) => {
          const text = (await file.text()).trim();
          return {
            id: `${file.name}-${file.lastModified}`,
            title: file.name,
            fileName: file.name,
            mimeType: file.type || "text/plain",
            sourceType: "upload",
            text,
          };
        }),
      );

      setAttachments((prev) =>
        [...prev, ...nextAttachments.filter((item) => item.text)].slice(0, 5),
      );
    } catch (error) {
      toast.error(error.message);
    }
  }

  function handleRemoveAttachment(attachmentId) {
    setAttachments((prev) => prev.filter((entry) => entry.id !== attachmentId));
  }

  async function handleRenameThread(thread) {
    const nextTitle = window.prompt("Ganti judul thread", thread.title);
    if (!nextTitle || nextTitle.trim() === thread.title) return;
    try {
      await aiApi.updateThread(thread.id, { title: nextTitle.trim() });
      await refreshThreads(thread.id);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleTogglePin(thread) {
    try {
      await aiApi.updateThread(thread.id, { pinned: !thread.pinned });
      await refreshThreads(thread.id);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleToggleArchive(thread) {
    try {
      await aiApi.updateThread(thread.id, {
        status: thread.status === "archived" ? "active" : "archived",
      });
      await refreshThreads(thread.id);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleIngestKnowledge({ title, text }) {
    setIngestingKnowledge(true);
    try {
      await aiApi.ingestKnowledge({
        agentSlug: agent.slug,
        threadId: activeThreadId,
        title,
        text,
        sourceType: "note",
        origin: "canvas",
      });
      await refreshKnowledge(activeThreadId);
      toast.success("Knowledge tersimpan.");
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    } finally {
      setIngestingKnowledge(false);
    }
  }

  async function handleSend() {
    const message = composerValue.trim();
    if (!message || sending) return;

    const optimisticUser = {
      id: `local-user-${Date.now()}`,
      role: "user",
      text: message,
    };

    setComposerValue("");
    setSending(true);
    const streamAssistantId = `local-ai-${Date.now()}`;
    const pendingAttachments = attachments;
    setAttachments([]);
    setMessages((prev) => [
      ...prev,
      optimisticUser,
      {
        id: streamAssistantId,
        role: "assistant",
        text: "",
      },
    ]);

    try {
      const result = await aiApi.sendMessageStream({
        threadId: activeThreadId,
        agentSlug: agent.slug,
        message,
        attachments: pendingAttachments,
        useKnowledge: agent.slug === "knowledge",
        onEvent: (eventName, payload) => {
          if (eventName === "thread" && payload?.threadId) {
            onOpenThread(payload.threadId);
          }

          if (eventName === "delta") {
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === streamAssistantId
                  ? {
                      ...entry,
                      text: payload?.fullText || payload?.text || "",
                    }
                  : entry,
              ),
            );
          }
        },
      });
      const nextThreadId = result?.threadId || activeThreadId;
      const nextMessages = result?.messages || [];
      const nextArtifacts = result?.artifacts || [];
      setMessages(
        nextMessages.map((entry) => ({
          id: entry.id,
          role: entry.role,
          text: entry.content,
        })),
      );
      setArtifacts(nextArtifacts);
      if (nextThreadId) {
        onOpenThread(nextThreadId);
      }
      await refreshThreads(nextThreadId);
      await refreshKnowledge(nextThreadId);
    } catch (error) {
      setMessages((prev) =>
        prev.filter(
          (entry) =>
            entry.id !== optimisticUser.id && entry.id !== streamAssistantId,
        ),
      );
      setAttachments((prev) => [...pendingAttachments, ...prev].slice(0, 5));
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className={`aiw-shell aiw-shell--canvas-${canvasMode}`}
      style={{ "--agent-accent": agent.accent }}
    >
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        onSelect={onOpenThread}
        onCreate={handleCreateThread}
        agentName={agent.name}
        onRename={handleRenameThread}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        loading={loadingThreads}
      />

      <div className="aiw-main">
        <div className="aiw-topbar">
          <button type="button" className="aiw-home-link" onClick={onBackHome}>
            Kembali ke AI agents
          </button>

          <div className="aiw-topbar-copy">
            <h1 className="aiw-topbar-title">{agent.name}</h1>
            <p className="aiw-topbar-sub">
              {activeThread?.title || "Obrolan baru"}
            </p>
          </div>

          <div className="aiw-topbar-chip">
            {loadingThreads || loadingConversation
              ? "Memuat"
              : activeThread
                ? "Aktif"
                : "Siap"}
          </div>
        </div>

        <div className="aiw-conversation">
          <div className="aiw-message-scroll">
            <ChatMessageList
              messages={messages}
              agent={agent}
              onUseStarter={(starter) => setComposerValue(starter)}
            />
            <div ref={messageEndRef} />
          </div>

          <ChatComposer
            value={composerValue}
            onChange={setComposerValue}
            onSend={handleSend}
            placeholder={agent.placeholder}
            disabled={sending}
            attachments={attachments}
            onAddFiles={handleAddFiles}
            onRemoveAttachment={handleRemoveAttachment}
          />
        </div>
      </div>

      <RightCanvas
        mode={canvasMode}
        onModeChange={setCanvasMode}
        agent={agent}
        thread={activeThread}
        artifacts={artifacts}
        knowledgeDocuments={knowledgeDocuments}
        onIngestKnowledge={handleIngestKnowledge}
        ingestingKnowledge={ingestingKnowledge}
      />
    </section>
  );
}
