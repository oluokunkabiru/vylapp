import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { Avatar, PrimaryButton } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

function groupStories(stories, currentUserId) {
  const groups = new Map();
  for (const story of stories) {
    const group = groups.get(story.author.id) || { author: story.author, stories: [] };
    group.stories.push(story);
    groups.set(story.author.id, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.author.id === currentUserId) return -1;
    if (b.author.id === currentUserId) return 1;
    return new Date(b.stories.at(-1)?.createdAt || 0) - new Date(a.stories.at(-1)?.createdAt || 0);
  });
}

export function StoriesBar({ onOpenStory }) {
  const { user } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [sharing, setSharing] = useState(false);

  const load = useCallback(() => {
    api.get("/stories")
      .then(({ stories }) => setGroups(groupStories(stories || [], user?.id)))
      .catch(() => setGroups([]));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const chooseFile = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCaption("");
  };

  const closeComposer = () => {
    if (sharing) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const shareStory = async () => {
    if (!selectedFile || sharing) return;
    setSharing(true);
    let uploaded = null;
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      ({ media: uploaded } = await api.upload("/media/upload", form));
      await api.post("/stories", { mediaId: uploaded.id, caption: caption.trim() || undefined });
      toast("Story shared for 24 hours ✓");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      load();
    } catch (error) {
      if (uploaded) await api.delete(`/media/${uploaded.id}`).catch(() => {});
      toast(`Couldn't share story: ${error.message}`, "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <div style={{ display:"flex", gap:16, padding:"14px 16px", overflowX:"auto", borderBottom:"1px solid var(--border2)" }}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" hidden onChange={chooseFile} />
        <button onClick={() => inputRef.current?.click()} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, width:62, background:"none", color:"var(--text2)" }}>
          <div style={{ position:"relative" }}>
            <Avatar user={user} size={58} />
            <span style={{ position:"absolute", bottom:-2, right:-2, width:20, height:20, borderRadius:"50%", background:"var(--violet)", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid var(--bg)", fontSize:16, color:"#fff", fontWeight:700 }}>+</span>
          </div>
          <span style={{ fontSize:12, fontWeight:600 }}>Your story</span>
        </button>

        {groups.map(group => {
          const unread = group.stories.some(story => !story.viewed);
          return (
            <button key={group.author.id} onClick={() => {
              setGroups(current => current.map(item => item.author.id === group.author.id ? { ...item, stories: item.stories.map(story => ({ ...story, viewed:true })) } : item));
              onOpenStory(group);
            }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, width:62, background:"none", color:"var(--text)" }}>
              <span style={{ borderRadius:"50%", padding:2, border:`2px solid ${unread ? "var(--violet-lt)" : "var(--border)"}`, display:"inline-flex" }}><Avatar user={group.author} size={52} /></span>
              <span style={{ fontSize:12, fontWeight:600, maxWidth:62, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{group.author.id === user?.id ? "You" : group.author.displayName?.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {selectedFile && previewUrl && (
        <div onClick={closeComposer} style={{ position:"fixed", inset:0, zIndex:430, background:"rgba(8,7,15,.9)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={event => event.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:20, overflow:"hidden" }}>
            <div style={{ position:"relative", aspectRatio:"9/14", maxHeight:"65vh", background:"#000" }}>
              {selectedFile.type.startsWith("video/")
                ? <video src={previewUrl} controls playsInline style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                : <img src={previewUrl} alt="Story preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} />}
              <button disabled={sharing} onClick={closeComposer} aria-label="Close story composer" style={{ position:"absolute", top:10, right:10, width:34, height:34, borderRadius:"50%", background:"rgba(0,0,0,.65)", color:"#fff", fontSize:20 }}>×</button>
            </div>
            <div style={{ padding:14 }}>
              <input dir="auto" value={caption} onChange={event => setCaption(event.target.value.slice(0,500))} placeholder="Add a caption…" style={{ width:"100%", padding:"11px 12px", borderRadius:12, border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", marginBottom:12 }} />
              <PrimaryButton full onClick={shareStory} disabled={sharing}>{sharing ? "Processing and sharing…" : "Share story"}</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StoryViewer({ group, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const story = group?.stories?.[index];

  const next = useCallback(() => {
    if (!group) return;
    if (index >= group.stories.length - 1) onClose();
    else { setIndex(value => value + 1); setProgress(0); }
  }, [group, index, onClose]);

  useEffect(() => {
    if (!story) return;
    if (story.author.id !== user?.id) api.post(`/stories/${story.id}/view`).catch(() => {});
    if (story.media.mediaType === "video") return;
    const timer = setInterval(() => setProgress(value => {
      if (value >= 100) { clearInterval(timer); setTimeout(next, 0); return 100; }
      return value + 2;
    }), 100);
    return () => clearInterval(timer);
  }, [story, user?.id, next]);

  if (!story) return null;

  const removeStory = async () => {
    if (!window.confirm("Delete this story?")) return;
    try {
      await api.delete(`/stories/${story.id}`);
      await api.delete(`/media/${story.media.id}`).catch(() => {});
      toast("Story deleted");
      onChanged?.();
      onClose();
    } catch (error) { toast(error.message, "error"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:440, display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:440, display:"flex", flexDirection:"column", position:"relative", background:"#000" }}>
        <div style={{ padding:"10px 10px 0", display:"flex", gap:4, zIndex:2 }}>
          {group.stories.map((item, itemIndex) => <div key={item.id} style={{ flex:1, height:3, borderRadius:2, background:"rgba(255,255,255,.25)", overflow:"hidden" }}><div style={{ height:"100%", background:"#fff", width:itemIndex < index ? "100%" : itemIndex > index ? "0%" : `${progress}%`, transition:"width .1s linear" }} /></div>)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", zIndex:2 }}>
          <Avatar user={story.author} size={34} />
          <div style={{ flex:1 }}><div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{story.author.displayName}</div><div style={{ color:"rgba(255,255,255,.65)", fontSize:12 }}>@{story.author.handle}</div></div>
          {story.author.id === user?.id && <button onClick={removeStory} style={{ background:"none", color:"#ff8a8a", fontSize:13, fontWeight:700 }}>Delete</button>}
          <button onClick={onClose} style={{ background:"none", color:"#fff", fontSize:22, padding:8 }}>×</button>
        </div>
        <div style={{ flex:1, minHeight:0, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {story.media.mediaType === "video"
            ? <video key={story.id} src={story.media.url} poster={story.media.thumbnailUrl || undefined} autoPlay playsInline controls onTimeUpdate={event => setProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration * 100 : 0)} onEnded={next} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
            : <img src={story.media.url} alt={story.caption || "Story"} style={{ width:"100%", height:"100%", objectFit:"contain" }} />}
          <button aria-label="Previous story" onClick={() => { if (index > 0) { setIndex(value => value - 1); setProgress(0); } }} style={{ position:"absolute", inset:"0 75% 48px 0", background:"transparent" }} />
          <button aria-label="Next story" onClick={next} style={{ position:"absolute", inset:"0 0 48px 75%", background:"transparent" }} />
        </div>
        {story.caption && <div dir="auto" style={{ position:"absolute", left:20, right:20, bottom:story.media.mediaType === "video" ? 70 : 34, padding:"10px 14px", borderRadius:12, background:"rgba(0,0,0,.6)", color:"#fff", textAlign:"center", fontSize:15 }}>{story.caption}</div>}
      </div>
    </div>
  );
}
